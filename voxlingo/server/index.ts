import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./routes/auth";
import { translateRouter } from "./routes/translate";
import { GeminiLiveSession } from "./services/geminiProxy";

const app = express();
const httpServer = createServer(app);

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:8081", "http://localhost:19006"];

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  },
});

app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRouter);
app.use("/api/translate", translateRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const activeSessions = new Map<string, GeminiLiveSession>();
const sessionTimestamps = new Map<string, number>();
const socketEventCounts = new Map<string, { count: number; resetAt: number }>();

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes max session
const SOCKET_RATE_LIMIT = 60; // max audio-stream events per second

// Clean up zombie sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [socketId, timestamp] of sessionTimestamps) {
    if (now - timestamp > SESSION_TTL_MS) {
      const session = activeSessions.get(socketId);
      if (session) {
        session.disconnect();
        activeSessions.delete(socketId);
      }
      sessionTimestamps.delete(socketId);
      console.log(`Cleaned up zombie session: ${socketId}`);
    }
  }
}, 5 * 60 * 1000);

function checkSocketRateLimit(socketId: string): boolean {
  const now = Date.now();
  const entry = socketEventCounts.get(socketId);
  if (!entry || now > entry.resetAt) {
    socketEventCounts.set(socketId, { count: 1, resetAt: now + 1000 });
    return true;
  }
  if (entry.count >= SOCKET_RATE_LIMIT) {
    return false;
  }
  entry.count++;
  return true;
}

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on(
    "start-translation",
    async (data: { sourceLang: string; targetLang: string; locationHints?: string }) => {
      console.log(`[DEBUG] start-translation: ${data.sourceLang} → ${data.targetLang}, location: ${!!data.locationHints}`);
      try {
        const existing = activeSessions.get(socket.id);
        if (existing) {
          existing.disconnect();
          activeSessions.delete(socket.id);
        }

        const session = new GeminiLiveSession(
          data.sourceLang,
          data.targetLang,
          {
            onTranslatedAudio: (audioBase64: string) => {
              socket.emit("translated-audio", { audio: audioBase64 });
            },
            onTranslatedText: (text: string) => {
              socket.emit("translated-text", { text });
            },
            onInputText: (text: string) => {
              socket.emit("input-text", { text });
            },
            onError: (error: Error) => {
              socket.emit("translation-error", { message: error.message });
            },
          },
          data.locationHints
        );

        await session.connect();
        console.log(`[DEBUG] Gemini session connected for ${socket.id}`);
        activeSessions.set(socket.id, session);
        sessionTimestamps.set(socket.id, Date.now());
        socket.emit("translation-ready");
      } catch (error: any) {
        console.error(`[DEBUG] start-translation FAILED:`, error.message);
        socket.emit("translation-error", {
          message: error.message || "Failed to start translation session",
        });
      }
    }
  );

  socket.on("audio-stream", (data: { audio: string }) => {
    console.log(`[DEBUG] audio-stream: ${data.audio?.length || 0} chars from ${socket.id}`);
    if (!checkSocketRateLimit(socket.id)) {
      socket.emit("translation-error", { message: "Audio stream rate limit exceeded" });
      return;
    }
    const session = activeSessions.get(socket.id);
    if (session) {
      const buffer = Buffer.from(data.audio, "base64");
      session.sendAudio(buffer);
    }
  });

  socket.on(
    "start-meeting",
    async (data: { userLang: string }) => {
      try {
        const existing = activeSessions.get(socket.id);
        if (existing) {
          existing.disconnect();
          activeSessions.delete(socket.id);
        }

        const session = new GeminiLiveSession(
          "auto",
          data.userLang,
          {
            onTranslatedAudio: (audioBase64: string) => {
              socket.emit("translated-audio", { audio: audioBase64 });
            },
            onTranslatedText: (text: string) => {
              socket.emit("meeting-utterance", { text });
            },
            onInputText: (text: string) => {
              socket.emit("meeting-input", { text });
            },
            onError: (error: Error) => {
              socket.emit("translation-error", { message: error.message });
            },
          }
        );

        await session.connect();
        activeSessions.set(socket.id, session);
        sessionTimestamps.set(socket.id, Date.now());
        socket.emit("translation-ready");
      } catch (error: any) {
        socket.emit("translation-error", {
          message: error.message || "Failed to start meeting session",
        });
      }
    }
  );

  socket.on("stop-translation", () => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.disconnect();
      activeSessions.delete(socket.id);
      sessionTimestamps.delete(socket.id);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    const session = activeSessions.get(socket.id);
    if (session) {
      session.disconnect();
      activeSessions.delete(socket.id);
    }
    sessionTimestamps.delete(socket.id);
    socketEventCounts.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`VoxLingo server running on port ${PORT}`);
});

// Graceful shutdown — clean up all active Gemini sessions
function gracefulShutdown(signal: string) {
  console.log(`${signal} received. Shutting down gracefully...`);
  for (const [socketId, session] of activeSessions) {
    session.disconnect();
    activeSessions.delete(socketId);
  }
  sessionTimestamps.clear();
  socketEventCounts.clear();
  io.close(() => {
    httpServer.close(() => {
      console.log("Server shut down cleanly.");
      process.exit(0);
    });
  });
  // Force exit after 10 seconds if cleanup hangs
  setTimeout(() => process.exit(1), 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { app, io };
