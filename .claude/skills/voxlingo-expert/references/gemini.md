# Gemini API Reference

## Table of Contents
1. [Live API (Streaming Voice)](#live-api)
2. [Vision API (Image OCR)](#vision-api)
3. [Model Selection](#model-selection)
4. [Common Errors](#common-errors)

---

## Live API

The Gemini Live API enables real-time bidirectional audio streaming for voice-to-voice translation.

### SDK Setup
```typescript
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

### Connection Pattern
```typescript
const session = await ai.live.connect({
  model: "gemini-2.5-flash-native-audio-latest",
  config: {
    responseModalities: [Modality.AUDIO],  // or [Modality.TEXT] for text-only
    systemInstruction: {
      parts: [{ text: "Your system prompt here" }],
    },
  },
  callbacks: {
    onopen: () => {},
    onmessage: (message) => {
      // message.data contains modelTurn, outputTranscription, inputTranscription
    },
    onerror: (error) => {},
    onclose: () => {},
  },
});
```

### Audio Format Requirements
- **Input**: 16-bit PCM, 16000 Hz sample rate, mono channel
- **MIME type**: `audio/pcm;rate=16000`
- **Encoding**: Base64 string

```typescript
session.sendRealtimeInput({
  audio: {
    data: pcmBuffer.toString("base64"),
    mimeType: "audio/pcm;rate=16000",
  },
});
```

### Response Message Structure
The `onmessage` callback receives messages with these possible fields:
- `modelTurn.parts[]` — Array of parts, each may contain:
  - `inlineData.data` (base64 audio) + `inlineData.mimeType`
  - `text` (text response)
- `outputTranscription.text` — Transcription of the model's speech
- `inputTranscription.text` — Transcription of the user's speech

### Session Lifecycle
1. Create session with `ai.live.connect()`
2. Send audio chunks via `session.sendRealtimeInput()`
3. Receive responses via `onmessage` callback
4. Close with `session.close()` — always clean up to avoid leaked connections

### Key Pitfalls
- **One session per client**: Don't reuse sessions across users. Each Socket.io connection gets its own `GeminiLiveSession`
- **Disconnect before reconnecting**: If the user switches languages, disconnect the old session before creating a new one
- **Buffer management**: Audio chunks should be sent as they arrive — don't buffer too much or latency increases
- **Connection drops**: The WebSocket can drop silently. Implement reconnection logic on the frontend

---

## Vision API

The Vision API handles image-based OCR and translation using multimodal content generation.

### Request Pattern
```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.0-flash",
  contents: [
    {
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64,  // NO data URI prefix
          },
        },
        {
          text: "Your prompt describing what to do with the image",
        },
      ],
    },
  ],
});
```

### Base64 Image Handling
Always strip the data URI prefix before sending:
```typescript
const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
```

Supported MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`

### Response Parsing
Gemini Vision returns text, not structured data. When requesting JSON:
1. Ask for "ONLY the JSON, no other text" in your prompt
2. Parse with regex fallback: `responseText.match(/\{[\s\S]*\}/)`
3. Always have a graceful fallback for non-JSON responses

```typescript
function parseVisionResponse(text: string): VisionResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* fall through */ }
  return { detectedLanguage: "unknown", originalText: "", translatedText: text };
}
```

### Key Pitfalls
- **Image size**: Large images increase latency and token usage. Consider resizing before sending
- **Data URI prefix**: Must be stripped — `@google/genai` expects raw base64
- **JSON reliability**: Gemini sometimes wraps JSON in markdown code fences or adds commentary. The regex extraction handles this
- **Concurrent requests**: Each image translation is independent — safe to parallelize

---

## Model Selection

| Model | Use Case | Strengths |
|-------|----------|-----------|
| `gemini-2.5-flash-native-audio-latest` | Live streaming | Low latency, real-time audio I/O |
| `gemini-2.5-flash` | Vision, general | Fast, multimodal, cost-effective |
| `gemini-2.0-pro` | Complex reasoning | Higher quality, slower, higher cost |
| `gemini-2.5-flash` | Latest flash | Improved quality over 2.0-flash |
| `gemini-2.5-pro` | Latest pro | Best quality, highest cost |

For this project, stick with `2.0-flash` variants unless the user explicitly needs higher quality output. The flash models offer the best latency/cost balance for real-time translation.

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `PERMISSION_DENIED` | Invalid or missing API key | Check `GEMINI_API_KEY` in `.env` |
| `RESOURCE_EXHAUSTED` | Rate limit or quota exceeded | Implement backoff, check usage dashboard |
| `INVALID_ARGUMENT` | Bad request format (wrong audio format, missing fields) | Verify PCM format, check base64 encoding |
| `MODEL_NOT_FOUND` | Wrong model ID | Use exact model strings from the table above |
| `DEADLINE_EXCEEDED` | Request took too long | Reduce image size, check network |
| WebSocket closes unexpectedly | Server timeout or network issue | Implement reconnection with exponential backoff |
| Non-JSON Vision response | Model didn't follow JSON instruction | Use regex extraction with fallback |

### Gemini API Quotas (Free Tier)
- 15 requests per minute (RPM)
- 1,000,000 tokens per minute (TPM)
- 1,500 requests per day (RPD)

When hitting limits, the API returns HTTP 429 or gRPC `RESOURCE_EXHAUSTED`. Always implement exponential backoff with jitter.
