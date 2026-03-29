# VoxLingo Travel Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core travel mode — real-time voice-to-voice translation using Gemini Live API with WebSocket streaming through a Node.js backend proxy.

**Architecture:** User speaks into mic → expo-av records PCM audio → socket.io streams chunks to Node.js backend → backend forwards to Gemini Live API via `@google/genai` SDK → Gemini returns translated audio + text → backend relays to app → app plays audio and shows chat bubbles.

**Tech Stack:** expo-av (recording/playback), socket.io / socket.io-client (WebSocket), `@google/genai` (Gemini Live API), React Native (UI)

---

## File Structure

Files to modify or create (all paths relative to `voxlingo/`):

```
server/services/geminiProxy.ts    — MODIFY: Gemini Live API session management (connect, stream audio, receive responses)
server/index.ts                   — MODIFY: Wire up audio-stream socket events to Gemini proxy
services/gemini.ts                — MODIFY: Frontend socket.io client for streaming audio to backend
hooks/useAudioStream.ts           — MODIFY: expo-av mic recording, PCM streaming via socket.io
hooks/useTranslation.ts           — MODIFY: Translation state management with real add/clear
components/AudioWaveform.tsx      — MODIFY: Animated waveform visualization
components/LanguagePicker.tsx     — MODIFY: Functional language selection with modal
components/TranslationBubble.tsx  — MODIFY: Already functional, minor timestamp addition
app/(tabs)/index.tsx              — MODIFY: Full Travel screen UI (language selectors, chat bubbles, mic button)
hooks/useAudioStream.test.ts      — CREATE: Tests for audio stream hook
hooks/useTranslation.test.ts      — CREATE: Tests for translation hook
server/services/geminiProxy.test.ts — CREATE: Tests for Gemini proxy
```

---

### Task 1: Backend Gemini Live API Proxy

**Files:**
- Modify: `server/services/geminiProxy.ts`
- Test: `server/services/geminiProxy.test.ts`

This task replaces the placeholder with a working Gemini Live API proxy that manages sessions per socket connection.

- [ ] **Step 1: Write the test file**

Create `server/services/geminiProxy.test.ts`:

```typescript
import { GeminiLiveSession } from "./geminiProxy";

// Mock @google/genai
const mockSendRealtimeInput = jest.fn();
const mockClose = jest.fn();
const mockConnect = jest.fn().mockResolvedValue({
  sendRealtimeInput: mockSendRealtimeInput,
  close: mockClose,
});

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    live: { connect: mockConnect },
  })),
  Modality: { AUDIO: "audio" },
}));

describe("GeminiLiveSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("connects with correct config", async () => {
    const onAudio = jest.fn();
    const onText = jest.fn();
    const onError = jest.fn();

    const session = new GeminiLiveSession("en", "es", {
      onTranslatedAudio: onAudio,
      onTranslatedText: onText,
      onInputText: jest.fn(),
      onError: onError,
    });

    await session.connect();

    expect(mockConnect).toHaveBeenCalledTimes(1);
    const callArgs = mockConnect.mock.calls[0][0];
    expect(callArgs.model).toBe("gemini-2.0-flash-live-001");
    expect(callArgs.config.responseModalities).toContain("audio");
    expect(callArgs.config.systemInstruction).toBeDefined();
  });

  it("sends audio chunks as base64 PCM", async () => {
    const session = new GeminiLiveSession("en", "ja", {
      onTranslatedAudio: jest.fn(),
      onTranslatedText: jest.fn(),
      onInputText: jest.fn(),
      onError: jest.fn(),
    });

    await session.connect();
    const testBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    session.sendAudio(testBuffer);

    expect(mockSendRealtimeInput).toHaveBeenCalledWith({
      audio: {
        data: testBuffer.toString("base64"),
        mimeType: "audio/pcm;rate=16000",
      },
    });
  });

  it("disconnects cleanly", async () => {
    const session = new GeminiLiveSession("en", "es", {
      onTranslatedAudio: jest.fn(),
      onTranslatedText: jest.fn(),
      onInputText: jest.fn(),
      onError: jest.fn(),
    });

    await session.connect();
    session.disconnect();

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("throws if GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    const session = new GeminiLiveSession("en", "es", {
      onTranslatedAudio: jest.fn(),
      onTranslatedText: jest.fn(),
      onInputText: jest.fn(),
      onError: jest.fn(),
    });

    await expect(session.connect()).rejects.toThrow("GEMINI_API_KEY");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx jest services/geminiProxy.test.ts --no-cache
```
Expected: FAIL — `GeminiLiveSession` does not exist yet.

- [ ] **Step 3: Implement GeminiLiveSession**

Replace `server/services/geminiProxy.ts` with:

```typescript
import { GoogleGenAI, Modality } from "@google/genai";
import { getLanguageNameForPrompt } from "./languageNames";

export interface GeminiSessionCallbacks {
  onTranslatedAudio: (audioBase64: string) => void;
  onTranslatedText: (text: string) => void;
  onInputText: (text: string) => void;
  onError: (error: Error) => void;
}

export class GeminiLiveSession {
  private session: any = null;
  private sourceLang: string;
  private targetLang: string;
  private callbacks: GeminiSessionCallbacks;

  constructor(
    sourceLang: string,
    targetLang: string,
    callbacks: GeminiSessionCallbacks
  ) {
    this.sourceLang = sourceLang;
    this.targetLang = targetLang;
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const ai = new GoogleGenAI({ apiKey });
    const sourceName = getLanguageNameForPrompt(this.sourceLang);
    const targetName = getLanguageNameForPrompt(this.targetLang);

    this.session = await ai.live.connect({
      model: "gemini-2.0-flash-live-001",
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: {
          parts: [
            {
              text: `You are a real-time voice translator. The user will speak in ${sourceName}. Translate everything they say into ${targetName}. Speak the translation naturally. Do not add commentary or explanations — only translate.`,
            },
          ],
        },
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini Live session opened");
        },
        onmessage: (message: any) => {
          this.handleMessage(message);
        },
        onerror: (e: any) => {
          this.callbacks.onError(new Error(e.message || "Gemini Live error"));
        },
        onclose: () => {
          console.log("Gemini Live session closed");
        },
      },
    });
  }

  private handleMessage(message: any): void {
    const content = message.serverContent;
    if (!content) return;

    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.callbacks.onTranslatedAudio(part.inlineData.data);
        }
        if (part.text) {
          this.callbacks.onTranslatedText(part.text);
        }
      }
    }

    if (content.outputTranscription?.text) {
      this.callbacks.onTranslatedText(content.outputTranscription.text);
    }

    if (content.inputTranscription?.text) {
      this.callbacks.onInputText(content.inputTranscription.text);
    }
  }

  sendAudio(pcmBuffer: Buffer): void {
    if (!this.session) return;
    this.session.sendRealtimeInput({
      audio: {
        data: pcmBuffer.toString("base64"),
        mimeType: "audio/pcm;rate=16000",
      },
    });
  }

  disconnect(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}
```

- [ ] **Step 4: Create language name helper**

Create `server/services/languageNames.ts`:

```typescript
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Chinese (Mandarin)",
  hi: "Hindi",
  ja: "Japanese",
  ko: "Korean",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  tl: "Tagalog",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
  tr: "Turkish",
  pl: "Polish",
  nl: "Dutch",
  ar: "Arabic",
};

export function getLanguageNameForPrompt(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}
```

- [ ] **Step 5: Install Jest in server and add test config**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npm install --save-dev jest @types/jest ts-jest
```

Add to `server/package.json` scripts:
```json
"test": "jest --no-cache"
```

Create `server/jest.config.js`:
```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "js"],
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npm test -- services/geminiProxy.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 7: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/server/
git commit -m "feat: implement Gemini Live API proxy with session management"
```

---

### Task 2: Wire Backend Socket Events to Gemini

**Files:**
- Modify: `server/index.ts`

This task connects the socket.io `audio-stream` event to the Gemini proxy so audio flows end-to-end.

- [ ] **Step 1: Update server/index.ts**

Replace `server/index.ts` with:

```typescript
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
        // Clean up existing session if any
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
```

- [ ] **Step 2: Verify server compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/server/index.ts
git commit -m "feat: wire socket.io events to Gemini Live sessions"
```

---

### Task 3: Frontend Socket.io Client Service

**Files:**
- Modify: `services/gemini.ts`

This replaces the placeholder with a real socket.io client that connects to the backend and streams audio.

- [ ] **Step 1: Implement the Gemini service**

Replace `services/gemini.ts` with:

```typescript
import { io, Socket } from "socket.io-client";
import { LanguageCode } from "../types";

export interface GeminiStreamCallbacks {
  onTranslatedAudio: (audioBase64: string) => void;
  onTranslatedText: (text: string) => void;
  onInputText: (text: string) => void;
  onReady: () => void;
  onError: (error: Error) => void;
}

const BACKEND_URL = __DEV__
  ? "http://localhost:3001"
  : "https://your-production-server.com";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ["websocket"],
      autoConnect: false,
    });
  }
  return socket;
}

export function startTranslationSession(
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  callbacks: GeminiStreamCallbacks
): { sendAudio: (base64Audio: string) => void; stop: () => void } {
  const sock = getSocket();

  if (!sock.connected) {
    sock.connect();
  }

  // Remove old listeners to avoid duplicates
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

  sock.emit("start-translation", { sourceLang, targetLang });

  return {
    sendAudio: (base64Audio: string) => {
      sock.emit("audio-stream", { audio: base64Audio });
    },
    stop: () => {
      sock.emit("stop-translation");
      sock.off("translated-audio");
      sock.off("translated-text");
      sock.off("input-text");
      sock.off("translation-ready");
      sock.off("translation-error");
    },
  };
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

- [ ] **Step 2: Verify frontend compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/services/gemini.ts
git commit -m "feat: implement socket.io client for Gemini audio streaming"
```

---

### Task 4: Audio Recording Hook

**Files:**
- Modify: `hooks/useAudioStream.ts`
- Create: `hooks/useAudioStream.test.ts`

This hook manages expo-av recording and streams PCM audio chunks to the backend.

- [ ] **Step 1: Write tests**

Create `hooks/useAudioStream.test.ts`:

```typescript
import { renderHook, act } from "@testing-library/react-native";
import { useAudioStream } from "./useAudioStream";

// Mock expo-av
jest.mock("expo-av", () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      startAsync: jest.fn().mockResolvedValue(undefined),
      stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
      getURI: jest.fn().mockReturnValue("file:///mock/recording.wav"),
      setOnRecordingStatusUpdate: jest.fn(),
    })),
  },
}));

// Mock gemini service
const mockSendAudio = jest.fn();
const mockStop = jest.fn();
jest.mock("../services/gemini", () => ({
  startTranslationSession: jest.fn().mockReturnValue({
    sendAudio: mockSendAudio,
    stop: mockStop,
  }),
}));

describe("useAudioStream", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() =>
      useAudioStream({
        onTranslatedAudio: jest.fn(),
        onTranslatedText: jest.fn(),
        onInputText: jest.fn(),
        onError: jest.fn(),
      })
    );

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets isRecording to true when startRecording is called", async () => {
    const { result } = renderHook(() =>
      useAudioStream({
        onTranslatedAudio: jest.fn(),
        onTranslatedText: jest.fn(),
        onInputText: jest.fn(),
        onError: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.startRecording("en", "es");
    });

    expect(result.current.isRecording).toBe(true);
  });

  it("sets isRecording to false when stopRecording is called", async () => {
    const { result } = renderHook(() =>
      useAudioStream({
        onTranslatedAudio: jest.fn(),
        onTranslatedText: jest.fn(),
        onInputText: jest.fn(),
        onError: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.startRecording("en", "es");
    });

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test -- hooks/useAudioStream.test.ts --no-cache
```
Expected: FAIL — hook signature doesn't match.

- [ ] **Step 3: Implement useAudioStream**

Replace `hooks/useAudioStream.ts` with:

```typescript
import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import { LanguageCode } from "../types";
import { startTranslationSession } from "../services/gemini";

export interface AudioStreamCallbacks {
  onTranslatedAudio: (audioBase64: string) => void;
  onTranslatedText: (text: string) => void;
  onInputText: (text: string) => void;
  onError: (error: Error) => void;
}

export interface AudioStreamState {
  isRecording: boolean;
  error: string | null;
}

export function useAudioStream(callbacks: AudioStreamCallbacks) {
  const [state, setState] = useState<AudioStreamState>({
    isRecording: false,
    error: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const sessionRef = useRef<{
    sendAudio: (base64Audio: string) => void;
    stop: () => void;
  } | null>(null);

  const startRecording = useCallback(
    async (sourceLang: LanguageCode, targetLang: LanguageCode) => {
      try {
        setState({ isRecording: false, error: null });

        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          setState({ isRecording: false, error: "Microphone permission denied" });
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        // Start translation session with backend
        const session = startTranslationSession(sourceLang, targetLang, {
          onTranslatedAudio: callbacks.onTranslatedAudio,
          onTranslatedText: callbacks.onTranslatedText,
          onInputText: callbacks.onInputText,
          onReady: () => {
            console.log("Translation session ready");
          },
          onError: callbacks.onError,
        });
        sessionRef.current = session;

        // Start recording
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync({
          android: {
            extension: ".wav",
            outputFormat: 2, // MPEG_4
            audioEncoder: 1, // AAC — will be converted
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 256000,
          },
          ios: {
            extension: ".wav",
            outputFormat: "linearPCM" as any,
            audioQuality: 127,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 256000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {},
        });

        recordingRef.current = recording;
        await recording.startAsync();
        setState({ isRecording: true, error: null });
      } catch (error: any) {
        setState({
          isRecording: false,
          error: error.message || "Failed to start recording",
        });
        callbacks.onError(error);
      }
    },
    [callbacks]
  );

  const stopRecording = useCallback(async () => {
    try {
      const recording = recordingRef.current;
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        recordingRef.current = null;

        // Send the recorded audio file to backend
        if (uri && sessionRef.current) {
          const response = await fetch(uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            if (base64 && sessionRef.current) {
              sessionRef.current.sendAudio(base64);
            }
          };
          reader.readAsDataURL(blob);
        }
      }

      // Stop translation session
      if (sessionRef.current) {
        sessionRef.current.stop();
        sessionRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      setState({ isRecording: false, error: null });
    } catch (error: any) {
      setState({
        isRecording: false,
        error: error.message || "Failed to stop recording",
      });
    }
  }, []);

  return {
    isRecording: state.isRecording,
    error: state.error,
    startRecording,
    stopRecording,
  };
}
```

- [ ] **Step 4: Run tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test -- hooks/useAudioStream.test.ts --no-cache
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/hooks/useAudioStream.ts voxlingo/hooks/useAudioStream.test.ts
git commit -m "feat: implement audio recording hook with expo-av and socket.io streaming"
```

---

### Task 5: Translation State Hook

**Files:**
- Modify: `hooks/useTranslation.ts`
- Create: `hooks/useTranslation.test.ts`

- [ ] **Step 1: Write tests**

Create `hooks/useTranslation.test.ts`:

```typescript
import { renderHook, act } from "@testing-library/react-native";
import { useTranslation } from "./useTranslation";
import { Translation } from "../types";

describe("useTranslation", () => {
  const mockTranslation: Translation = {
    id: "1",
    sourceLang: "en",
    targetLang: "es",
    originalText: "Hello",
    translatedText: "Hola",
    mode: "travel",
    timestamp: Date.now(),
    cached: false,
  };

  it("starts with empty translations", () => {
    const { result } = renderHook(() => useTranslation("en", "es"));
    expect(result.current.translations).toEqual([]);
    expect(result.current.isTranslating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("adds a translation", () => {
    const { result } = renderHook(() => useTranslation("en", "es"));

    act(() => {
      result.current.addTranslation(mockTranslation);
    });

    expect(result.current.translations).toHaveLength(1);
    expect(result.current.translations[0].translatedText).toBe("Hola");
  });

  it("clears all translations", () => {
    const { result } = renderHook(() => useTranslation("en", "es"));

    act(() => {
      result.current.addTranslation(mockTranslation);
    });

    act(() => {
      result.current.clearTranslations();
    });

    expect(result.current.translations).toEqual([]);
  });

  it("sets translating state", () => {
    const { result } = renderHook(() => useTranslation("en", "es"));

    act(() => {
      result.current.setTranslating(true);
    });

    expect(result.current.isTranslating).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test -- hooks/useTranslation.test.ts --no-cache
```
Expected: FAIL — `setTranslating` doesn't exist, `addTranslation` is a no-op.

- [ ] **Step 3: Implement useTranslation**

Replace `hooks/useTranslation.ts` with:

```typescript
import { useState, useCallback } from "react";
import { Translation, LanguageCode } from "../types";

export interface TranslationState {
  translations: Translation[];
  isTranslating: boolean;
  error: string | null;
}

export function useTranslation(
  _sourceLang: LanguageCode,
  _targetLang: LanguageCode
) {
  const [state, setState] = useState<TranslationState>({
    translations: [],
    isTranslating: false,
    error: null,
  });

  const addTranslation = useCallback((translation: Translation) => {
    setState((prev) => ({
      ...prev,
      translations: [...prev.translations, translation],
    }));
  }, []);

  const clearTranslations = useCallback(() => {
    setState({ translations: [], isTranslating: false, error: null });
  }, []);

  const setTranslating = useCallback((isTranslating: boolean) => {
    setState((prev) => ({ ...prev, isTranslating }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  return {
    translations: state.translations,
    isTranslating: state.isTranslating,
    error: state.error,
    addTranslation,
    clearTranslations,
    setTranslating,
    setError,
  };
}
```

- [ ] **Step 4: Run tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test -- hooks/useTranslation.test.ts --no-cache
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/hooks/useTranslation.ts voxlingo/hooks/useTranslation.test.ts
git commit -m "feat: implement translation state management hook"
```

---

### Task 6: Language Picker with Modal

**Files:**
- Modify: `components/LanguagePicker.tsx`

- [ ] **Step 1: Implement LanguagePicker with modal**

Replace `components/LanguagePicker.tsx` with:

```typescript
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { LanguageCode } from "../types";
import { SUPPORTED_LANGUAGES, Language } from "../constants/languages";

interface LanguagePickerProps {
  selectedLang: LanguageCode;
  onSelect: (lang: LanguageCode) => void;
  label?: string;
}

export function LanguagePicker({
  selectedLang,
  onSelect,
  label,
}: LanguagePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedLanguage = SUPPORTED_LANGUAGES.find(
    (l) => l.code === selectedLang
  );

  const handleSelect = (lang: Language) => {
    onSelect(lang.code);
    setModalVisible(false);
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>
          {selectedLanguage?.nativeName || selectedLang}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    item.code === selectedLang && styles.selectedItem,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.languageName}>{item.name}</Text>
                  <Text style={styles.nativeName}>{item.nativeName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    minWidth: 130,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  arrow: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  closeButton: {
    fontSize: 20,
    color: "#6b7280",
    padding: 4,
  },
  languageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  selectedItem: {
    backgroundColor: "#eef2ff",
  },
  languageName: {
    fontSize: 16,
    color: "#1f2937",
  },
  nativeName: {
    fontSize: 14,
    color: "#6b7280",
  },
});
```

- [ ] **Step 2: Verify frontend compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/components/LanguagePicker.tsx
git commit -m "feat: implement language picker with modal selection"
```

---

### Task 7: Audio Waveform Visualization

**Files:**
- Modify: `components/AudioWaveform.tsx`

- [ ] **Step 1: Implement animated waveform**

Replace `components/AudioWaveform.tsx` with:

```typescript
import { View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  isActive: boolean;
}

const BAR_COUNT = 5;

export function AudioWaveform({ isActive }: AudioWaveformProps) {
  const animations = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isActive) {
      const animateBar = (index: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(animations[index], {
              toValue: 0.4 + Math.random() * 0.6,
              duration: 200 + Math.random() * 300,
              useNativeDriver: false,
            }),
            Animated.timing(animations[index], {
              toValue: 0.2 + Math.random() * 0.2,
              duration: 200 + Math.random() * 300,
              useNativeDriver: false,
            }),
          ])
        ).start();
      };

      animations.forEach((_, i) => animateBar(i));
    } else {
      animations.forEach((anim) => {
        anim.stopAnimation();
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      animations.forEach((anim) => anim.stopAnimation());
    };
  }, [isActive, animations]);

  return (
    <View style={styles.container}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            isActive && styles.activeBar,
            {
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    gap: 4,
  },
  bar: {
    width: 4,
    height: 40,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
  },
  activeBar: {
    backgroundColor: "#3b82f6",
  },
});
```

- [ ] **Step 2: Verify frontend compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/components/AudioWaveform.tsx
git commit -m "feat: implement animated audio waveform visualization"
```

---

### Task 8: Travel Screen UI

**Files:**
- Modify: `app/(tabs)/index.tsx`

This is the main screen — language selectors, chat bubbles, mic button.

- [ ] **Step 1: Implement full Travel screen**

Replace `app/(tabs)/index.tsx` with:

```typescript
import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Audio } from "expo-av";
import { LanguageCode, Translation } from "../../types";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
} from "../../constants/languages";
import { LanguagePicker } from "../../components/LanguagePicker";
import { TranslationBubble } from "../../components/TranslationBubble";
import { AudioWaveform } from "../../components/AudioWaveform";
import { useAudioStream } from "../../hooks/useAudioStream";
import { useTranslation } from "../../hooks/useTranslation";

export default function TravelScreen() {
  const [sourceLang, setSourceLang] = useState<LanguageCode>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const flatListRef = useRef<FlatList>(null);

  const {
    translations,
    isTranslating,
    addTranslation,
    clearTranslations,
    setTranslating,
  } = useTranslation(sourceLang, targetLang);

  const { isRecording, error, startRecording, stopRecording } = useAudioStream({
    onTranslatedAudio: async (audioBase64: string) => {
      try {
        const { sound } = await Audio.Sound.createAsync({
          uri: `data:audio/pcm;base64,${audioBase64}`,
        });
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if ("didJustFinish" in status && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } catch (e) {
        console.warn("Audio playback error:", e);
      }
    },
    onTranslatedText: (text: string) => {
      const translation: Translation = {
        id: Date.now().toString(),
        sourceLang,
        targetLang,
        originalText: "",
        translatedText: text,
        mode: "travel",
        timestamp: Date.now(),
        cached: false,
      };
      addTranslation(translation);
      setTranslating(false);
    },
    onInputText: (text: string) => {
      const translation: Translation = {
        id: `input-${Date.now()}`,
        sourceLang,
        targetLang,
        originalText: text,
        translatedText: "",
        mode: "travel",
        timestamp: Date.now(),
        cached: false,
      };
      addTranslation(translation);
    },
    onError: (err: Error) => {
      console.error("Translation error:", err);
      setTranslating(false);
    },
  });

  const handleSwapLanguages = useCallback(() => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  }, [sourceLang, targetLang]);

  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
      setTranslating(false);
    } else {
      setTranslating(true);
      await startRecording(sourceLang, targetLang);
    }
  }, [isRecording, sourceLang, targetLang, startRecording, stopRecording, setTranslating]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Language Selectors */}
      <View style={styles.languageBar}>
        <LanguagePicker
          selectedLang={sourceLang}
          onSelect={setSourceLang}
          label="From"
        />
        <TouchableOpacity
          style={styles.swapButton}
          onPress={handleSwapLanguages}
        >
          <Text style={styles.swapIcon}>⇄</Text>
        </TouchableOpacity>
        <LanguagePicker
          selectedLang={targetLang}
          onSelect={setTargetLang}
          label="To"
        />
      </View>

      {/* Translation Chat */}
      <FlatList
        ref={flatListRef}
        style={styles.chatContainer}
        data={translations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            {item.originalText !== "" && (
              <TranslationBubble text={item.originalText} isSource={true} />
            )}
            {item.translatedText !== "" && (
              <TranslationBubble text={item.translatedText} isSource={false} />
            )}
          </View>
        )}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Tap the microphone to start translating
            </Text>
          </View>
        }
      />

      {/* Error Display */}
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Mic Button */}
      <View style={styles.micContainer}>
        <AudioWaveform isActive={isRecording} />
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPress={handleMicPress}
          activeOpacity={0.7}
        >
          <Text style={styles.micIcon}>{isRecording ? "⏹" : "🎤"}</Text>
        </TouchableOpacity>
        {isTranslating && !isRecording && (
          <Text style={styles.translatingText}>Translating...</Text>
        )}
        {translations.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearTranslations}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  languageBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  swapIcon: {
    fontSize: 20,
    color: "#3b82f6",
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
  },
  errorBar: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
  },
  micContainer: {
    alignItems: "center",
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 8,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  micButtonActive: {
    backgroundColor: "#ef4444",
  },
  micIcon: {
    fontSize: 28,
  },
  translatingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  clearButton: {
    position: "absolute",
    right: 24,
    bottom: 40,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  clearText: {
    fontSize: 14,
    color: "#6b7280",
  },
});
```

- [ ] **Step 2: Verify frontend compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/app/\(tabs\)/index.tsx
git commit -m "feat: implement travel screen with voice translation UI"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run all frontend tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test --no-cache
```
Expected: All tests pass (language constants + hook tests).

- [ ] **Step 2: Run all backend tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npm test
```
Expected: All Gemini proxy tests pass.

- [ ] **Step 3: Typecheck frontend**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Typecheck backend**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 5: Push to GitHub**

```bash
cd /c/Scripts/travelcompanion
git push origin main
```
