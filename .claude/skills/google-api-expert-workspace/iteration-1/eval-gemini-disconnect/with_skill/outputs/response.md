# Fixing Gemini Live Session Disconnects After 30 Seconds of Silence

## Analysis

Looking at `geminiProxy.ts`, the `GeminiLiveSession` class has no keep-alive mechanism. The Gemini Live API (`gemini-2.0-flash-live-001`) uses a WebSocket connection that times out after periods of inactivity. When no audio is being sent, the server closes the connection.

The skill's debugging checklist confirms: "The WebSocket can drop silently. Implement reconnection logic." And the audio format must be `audio/pcm;rate=16000` (16-bit PCM, 16kHz mono).

## Solution

Add a keep-alive heartbeat that sends silent audio frames at regular intervals, plus auto-reconnect logic.

### 1. Add keep-alive to `GeminiLiveSession` (`voxlingo/server/services/geminiProxy.ts`)

```typescript
export class GeminiLiveSession {
  private session: any = null;
  private sourceLang: string;
  private targetLang: string;
  private callbacks: GeminiSessionCallbacks;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  // 16-bit PCM silence: 16000 samples/sec * 2 bytes * 0.5 sec = 16000 bytes
  private static readonly SILENT_FRAME = Buffer.alloc(16000);
  private static readonly KEEPALIVE_MS = 15_000; // every 15 seconds

  constructor(sourceLang: string, targetLang: string, callbacks: GeminiSessionCallbacks) {
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
    // ... existing system prompt setup ...

    this.session = await ai.live.connect({
      model: "gemini-2.0-flash-live-001",
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: { parts: [{ text: systemPrompt }] },
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini Live session opened");
          this.startKeepAlive();
        },
        onmessage: (message: any) => this.handleMessage(message),
        onerror: (e: any) => {
          this.callbacks.onError(new Error(e.message || "Gemini Live error"));
        },
        onclose: () => {
          console.log("Gemini Live session closed");
          this.stopKeepAlive();
        },
      },
    });
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      this.sendAudio(GeminiLiveSession.SILENT_FRAME);
    }, GeminiLiveSession.KEEPALIVE_MS);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
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
    this.stopKeepAlive();
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}
```

### 2. Add auto-reconnect in `index.ts` (Socket.io handler)

```typescript
socket.on("start-translation", async (data) => {
  // ... existing setup ...

  const session = new GeminiLiveSession(data.sourceLang, data.targetLang, {
    onTranslatedAudio: (audioBase64) => socket.emit("translated-audio", { audio: audioBase64 }),
    onTranslatedText: (text) => socket.emit("translated-text", { text }),
    onInputText: (text) => socket.emit("input-text", { text }),
    onError: async (error) => {
      console.error("Gemini session error:", error.message);
      // Auto-reconnect on unexpected disconnect
      if (activeSessions.has(socket.id)) {
        try {
          await session.connect();
          socket.emit("translation-ready");
        } catch (reconnectError: any) {
          socket.emit("translation-error", { message: reconnectError.message });
        }
      }
    },
  });

  await session.connect();
  activeSessions.set(socket.id, session);
  socket.emit("translation-ready");
});
```

### Why This Works

- **Silent frames** keep the WebSocket alive without triggering translation responses (Gemini ignores silence)
- **15-second interval** is well under the 30-second timeout with margin for network jitter
- **Auto-reconnect** handles cases where the connection drops despite keep-alive (network issues)
- The silent buffer is exactly 0.5 seconds of 16-bit PCM at 16kHz — small enough to not waste bandwidth
