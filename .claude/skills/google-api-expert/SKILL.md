---
name: google-api-expert
description: Expert guidance for Google APIs used in this project — Gemini (Live streaming + Vision), Firebase (Auth + Firestore), and Google Maps/Location. Use this skill whenever working with Gemini API calls, Firebase authentication or database operations, Google Maps integration, or debugging Google API errors. Also trigger when the user mentions API keys, rate limits, quota issues, streaming audio, vision/OCR, real-time translation, or any @google/genai or firebase SDK usage. Even if the user just says "fix the API" or "it's not connecting," check this skill — it likely applies.
---

# Google API Expert

You are an expert in the Google APIs used by this project. This skill gives you deep knowledge of how each API works, common pitfalls, and best practices — so you can guide integration, debug issues, and suggest improvements across any language or SDK.

## APIs Covered

This project uses three Google API families:

| API | SDK | Use Case |
|-----|-----|----------|
| **Gemini Live** | `@google/genai` | Real-time voice-to-voice translation via WebSocket |
| **Gemini Vision** | `@google/genai` | Image OCR and translation via REST |
| **Firebase Auth** | `firebase` | Google Sign-In, user management |
| **Firestore** | `firebase` | User data, translation history, word lists, settings |
| **Google Maps/Location** | `expo-location` | Geolocation context for culturally-aware translations |

For detailed API-specific patterns, error codes, and configuration guidance, read the appropriate reference file:

- `references/gemini.md` — Gemini Live API streaming, Vision API, model selection, audio format requirements
- `references/firebase.md` — Firebase Auth flows, Firestore schema, queries, offline persistence, security rules
- `references/maps.md` — Location services, reverse geocoding, Maps Grounding roadmap

Read only the reference file relevant to the current task — don't load all three unless the task spans multiple APIs.

## Architecture Principles

The project follows a **backend-proxy pattern** for Gemini APIs:

```
Mobile App (Expo) ←→ Socket.io/REST ←→ Node.js Backend ←→ Google APIs
```

This matters because:
- **Gemini API keys stay on the backend only** — never expose them client-side
- **Firebase config uses `EXPO_PUBLIC_*` env vars** — these are safe to include in mobile builds since Firebase Auth and Firestore have their own security rules
- **Rate limiting is enforced server-side** (15 RPM per client IP) to stay within Gemini free tier limits
- **Socket.io** handles real-time audio streaming between frontend and backend; the backend maintains a `GeminiLiveSession` per connected client

When adding new Google API integrations, follow this same pattern: proxy through the backend, keep secrets server-side, and use Socket.io for streaming or REST for request/response.

## Cross-Cutting Concerns

### API Key Management
- Backend keys: stored in `voxlingo/server/.env` (`GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`)
- Frontend keys: stored in `voxlingo/.env` with `EXPO_PUBLIC_` prefix (Firebase only)
- Always validate that API keys exist before making calls — throw early with a clear error message
- Never log API keys, even partially

### Error Handling Philosophy
- **Backend**: Catch errors at the route/socket handler level, emit structured error events to the client
- **Frontend**: Display user-friendly messages, log technical details to console
- **Gemini responses**: Always handle non-JSON responses gracefully (the Vision API sometimes returns plain text instead of JSON)
- **Firebase**: Handle offline scenarios — Firestore has IndexedDB persistence enabled

### Rate Limiting & Quotas
- Gemini free tier: 15 RPM, 1M TPM, 1500 RPD
- Implement exponential backoff for 429 responses
- The backend already has IP-based rate limiting at 15 RPM — respect this when adding new endpoints
- Firebase Auth: 100 sign-ins/IP/hour (Google default)
- Firestore: 1 write/doc/second for sustained writes

### Multi-Language SDK Guidance
When the user works in a language other than TypeScript/Node.js:

- **Python**: Use `google-genai` package (same API surface as `@google/genai`). Firebase Admin SDK (`firebase-admin`) for server-side, `firebase` for client-side.
- **Go**: Use `cloud.google.com/go/vertexai/genai` or REST endpoints directly. Firebase Admin SDK available via `firebase.google.com/go/v4`.
- **REST**: All Gemini APIs accessible via `https://generativelanguage.googleapis.com/v1beta/`. Firebase REST API available but SDKs preferred.

Adapt code examples to the user's language while preserving the same patterns (error handling, key management, streaming approach).

## Hybrid Translation Architecture

The travel mode uses a **hybrid approach** combining two Gemini APIs:

1. **Gemini Live API** (`gemini-2.5-flash-native-audio-latest`) — real-time speech-to-text via WebSocket
   - Receives PCM audio chunks, returns `inputTranscription` fragments
   - Does NOT reliably follow system instructions for translation
   - Used purely for live transcription display

2. **Gemini REST API** (`gemini-2.5-flash`) — text translation when recording stops
   - Receives accumulated transcription text, returns translation
   - Follows instructions reliably
   - Called via `translateAccumulated()` in `GeminiLiveSession`

The Live API `native-audio` models are conversational — they transcribe input but don't translate on command. The REST API handles the actual translation step.

### Required Live API Config
```typescript
config: {
  responseModalities: [Modality.AUDIO],
  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
  inputAudioTranscription: {},   // Required for transcription
}
```

### Web Audio Capture
On web, `expo-av` records webm/opus (not PCM). The project uses `webAudioCapture.ts` with the Web Audio API to capture real 16-bit PCM at 16kHz mono — the format Gemini expects.

## Debugging Checklist

When a Google API integration isn't working, walk through this systematically:

1. **Is the API key set?** Check the relevant `.env` file
2. **Is the correct model specified?** Live uses `gemini-2.5-flash-native-audio-latest`, Vision/Translation uses `gemini-2.5-flash`
3. **Is the request format correct?** Audio must be 16-bit PCM at 16kHz mono; images must be base64 without data URI prefix
4. **Is the backend running?** Check `http://localhost:3001/health`
5. **Are you hitting rate limits?** Look for 429 status codes or `RESOURCE_EXHAUSTED` errors
6. **Is Firebase initialized?** `initializeFirebase()` must be called before any Firebase operation
7. **Is the Firestore query correct?** Check collection paths — this project uses subcollections under `users/{uid}/`
8. **Network issues?** Check CORS config on backend, verify Socket.io transport is WebSocket not polling
9. **Live session closes immediately?** Check model name is valid (list with `ai.models.list()`), check `speechConfig` is set, check billing is enabled
10. **Transcription works but no translation?** This is expected — use the hybrid approach (Live for STT, REST for translation)
