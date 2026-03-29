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
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRouter);
app.use("/api/translate", translateRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const activeSessions = new Map<string, GeminiLiveSession>();

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on(
    "start-translation",
    async (data: { sourceLang: string; targetLang: string }) => {
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
          }
        );

        await session.connect();
        activeSessions.set(socket.id, session);
        socket.emit("translation-ready");
      } catch (error: any) {
        socket.emit("translation-error", {
          message: error.message || "Failed to start translation session",
        });
      }
    }
  );

  socket.on("audio-stream", (data: { audio: string }) => {
    const session = activeSessions.get(socket.id);
    if (session) {
      const buffer = Buffer.from(data.audio, "base64");
      session.sendAudio(buffer);
    }
  });

  socket.on("stop-translation", () => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.disconnect();
      activeSessions.delete(socket.id);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    const session = activeSessions.get(socket.id);
    if (session) {
      session.disconnect();
      activeSessions.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`VoxLingo server running on port ${PORT}`);
});

export { app, io };
