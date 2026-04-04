# Fixing Gemini Live Session Disconnects After 30 Seconds of Silence

## Analysis

Looking at the code in `voxlingo/server/services/geminiProxy.ts`, the `GeminiLiveSession` class connects to the Gemini Live API via WebSocket but doesn't send anything during periods of silence. WebSocket APIs commonly time out idle connections.

## Solution

Send periodic keep-alive pings to prevent the timeout.

### Add keep-alive to `geminiProxy.ts`

```typescript
export class GeminiLiveSession {
  private session: any = null;
  private sourceLang: string;
  private targetLang: string;
  private callbacks: GeminiSessionCallbacks;
  private keepAliveTimer: any = null;

  async connect(): Promise<void> {
    // ... existing connect code ...

    this.session = await ai.live.connect({
      // ... existing config ...
      callbacks: {
        onopen: () => {
          console.log("Gemini Live session opened");
          this.startKeepAlive();
        },
        // ... rest of callbacks ...
        onclose: () => {
          console.log("Gemini Live session closed");
          if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
        },
      },
    });
  }

  private startKeepAlive(): void {
    this.keepAliveTimer = setInterval(() => {
      if (this.session) {
        // Send empty/silent audio to keep connection alive
        const silence = Buffer.alloc(1600); // small silent buffer
        this.sendAudio(silence);
      }
    }, 20000); // every 20 seconds
  }

  disconnect(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}
```

This should keep the WebSocket connection open by periodically sending silent audio data.
