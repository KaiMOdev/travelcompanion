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

  sock.off("translated-audio");
  sock.off("translated-text");
  sock.off("input-text");
  sock.off("translation-ready");
  sock.off("translation-error");

  sock.on("translated-audio", (data: { audio: string }) => {
    callbacks.onTranslatedAudio(data.audio);
  });

  sock.on("translated-text", (data: { text: string }) => {
    callbacks.onTranslatedText(data.text);
  });

  sock.on("input-text", (data: { text: string }) => {
    callbacks.onInputText(data.text);
  });

  sock.on("translation-ready", () => {
    callbacks.onReady();
  });

  sock.on("translation-error", (data: { message: string }) => {
    callbacks.onError(new Error(data.message));
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
      // Delay removing listeners so the final translation response can arrive
      setTimeout(() => {
        sock.off("translated-audio");
        sock.off("translated-text");
        sock.off("input-text");
        sock.off("translation-ready");
        sock.off("translation-error");
      }, 5000);
    },
  };
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
