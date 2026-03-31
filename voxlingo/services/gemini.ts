import { io, Socket } from "socket.io-client";
import { LanguageCode } from "../types";

export interface GeminiStreamCallbacks {
  onTranslatedAudio: (audioBase64: string) => void;
  onTranslatedText: (text: string) => void;
  onInputText: (text: string) => void;
  onReady: () => void;
  onError: (error: Error) => void;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL
  || (__DEV__ ? "http://localhost:3001" : "https://your-production-server.com");

let socket: Socket | null = null;
let activeSessionId = 0; // Track active session to prevent stale callbacks

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
}

export function startTranslationSession(
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  callbacks: GeminiStreamCallbacks,
  options?: { locationHints?: string }
): { sendAudio: (base64Audio: string) => void; stop: () => void } {
  const sock = getSocket();
  const sessionId = ++activeSessionId;

  // Remove any existing listeners from previous sessions
  sock.off("translated-audio");
  sock.off("translated-text");
  sock.off("input-text");
  sock.off("translation-ready");
  sock.off("translation-error");

  // Guard callbacks with session ID to prevent stale callbacks
  sock.on("translated-audio", (data: { audio: string }) => {
    if (sessionId === activeSessionId) {
      callbacks.onTranslatedAudio(data.audio);
    }
  });

  sock.on("translated-text", (data: { text: string }) => {
    if (sessionId === activeSessionId) {
      callbacks.onTranslatedText(data.text);
    }
  });

  sock.on("input-text", (data: { text: string }) => {
    if (sessionId === activeSessionId) {
      callbacks.onInputText(data.text);
    }
  });

  sock.on("translation-ready", () => {
    if (sessionId === activeSessionId) {
      callbacks.onReady();
    }
  });

  sock.on("translation-error", (data: { message: string }) => {
    if (sessionId === activeSessionId) {
      callbacks.onError(new Error(data.message));
    }
  });

  const emitStart = () => {
    sock.emit("start-translation", {
      sourceLang,
      targetLang,
      locationHints: options?.locationHints,
    });
  };

  if (sock.connected) {
    emitStart();
  } else {
    sock.once("connect", emitStart);
    sock.connect();
  }

  return {
    sendAudio: (base64Audio: string) => {
      sock.emit("audio-stream", { audio: base64Audio });
    },
    stop: () => {
      sock.emit("stop-translation");
      // Clean up listeners after translation response has time to arrive
      const stoppedSessionId = sessionId;
      setTimeout(() => {
        // Only clean up if no new session started
        if (stoppedSessionId === activeSessionId) {
          sock.off("translated-audio");
          sock.off("translated-text");
          sock.off("input-text");
          sock.off("translation-ready");
          sock.off("translation-error");
        }
      }, 10000);
    },
  };
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
