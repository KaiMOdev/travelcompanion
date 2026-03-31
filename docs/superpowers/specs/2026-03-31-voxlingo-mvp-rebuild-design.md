# VoxLingo MVP Rebuild — Design Spec

## 1. Overview

Clean rebuild of VoxLingo as a minimal voice translation app. Travel mode only — tap-to-start/stop recording, send audio to Gemini REST via a thin backend proxy, display translated text in chat bubbles.

**What's in MVP:** Voice translation (one mode), language selection, chat-style results display, backend API proxy.

**What's NOT in MVP:** Camera mode, Meeting mode, Firebase auth, TTS playback, offline phrase packs, Maps grounding, translation history persistence, word lists.

## 2. Architecture

```
Expo App (React Native, SDK 54)
    │
    ├── Record audio (expo-av on native / Web Audio API on web)
    │
    ├── POST base64 audio + { sourceLang, targetLang }
    │         │
    │         ▼
    │   Node.js Express server (port 3001)
    │         │
    │         ▼
    │   Gemini REST API (gemini-2.5-flash, generateContent)
    │   "Transcribe this audio and translate from X to Y"
    │         │
    │         ▼
    │   { originalText, translatedText }
    │
    └── Display in chat-style bubbles
```

Two processes: Expo dev server + Express backend. No WebSockets, no streaming, no Firebase. One HTTP round-trip per translation.

### Why this architecture

- **REST over WebSocket:** The old codebase used Gemini Live API via WebSocket for streaming audio. That API doesn't follow translation instructions reliably. Gemini REST with audio input is simpler and actually works for translation.
- **Backend proxy:** Keeps the Gemini API key server-side. Barely more work than direct calls, avoids painful retrofit later.
- **No Firebase for MVP:** Auth and persistence add complexity without affecting the core translate flow. Easy to layer in post-MVP.

## 3. Project Structure

```
voxlingo/
├── app/
│   ├── _layout.tsx          # Root layout (single screen, no tabs)
│   └── index.tsx            # Travel screen (the only screen)
├── components/
│   ├── LanguagePicker.tsx   # Dropdown to select a language
│   ├── TranslationBubble.tsx # Chat bubble (source left, translation right)
│   └── RecordButton.tsx     # Tap-to-start/stop mic button with pulse animation
├── services/
│   ├── audio.ts             # Record audio, return base64 PCM (platform-split)
│   └── translate.ts         # POST to backend, return translation
├── hooks/
│   └── useTranslation.ts    # Manages recording state + translation list
├── constants/
│   └── languages.ts         # 17 supported languages with codes/labels
├── types/
│   └── index.ts             # Shared TypeScript types
├── server/
│   ├── index.ts             # Express server, single POST /translate endpoint
│   └── .env                 # GEMINI_API_KEY, PORT=3001
├── assets/                  # App icon, splash
├── app.json
├── package.json
├── tsconfig.json
└── firestore.rules          # Kept for post-MVP
```

## 4. Data Flow

1. User selects source + target language (top of screen)
2. Taps record button — expo-av starts recording (PCM 16kHz mono on native, Web Audio API on web)
3. Taps again to stop — audio converted to base64
4. `services/translate.ts` sends `POST /translate` with `{ audio, sourceLang, targetLang }`
5. Backend decodes audio, sends to Gemini REST with prompt, returns result
6. New bubble pair appended to the translation list on screen

## 5. Types

```typescript
type Translation = {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
};

type TranslateRequest = {
  audio: string;       // base64-encoded PCM
  sourceLang: string;  // e.g. "en"
  targetLang: string;  // e.g. "es"
};

type TranslateResponse = {
  originalText: string;
  translatedText: string;
};
```

**State:** `Translation[]` array in `useTranslation` hook. No persistence — resets on app restart.

## 6. Backend

### Endpoint: `POST /translate`

- Receives `{ audio, sourceLang, targetLang }`
- Decodes base64 audio
- Calls Gemini REST (`gemini-2.5-flash` / `generateContent`) with inline audio part + text prompt
- Returns `{ originalText, translatedText }`
- On error, returns `{ error: "..." }` with appropriate status code

### Gemini call shape

```typescript
generateContent({
  model: "gemini-2.5-flash",
  contents: [{
    parts: [
      { inlineData: { mimeType: "audio/wav", data: base64Audio } },
      { text: prompt }
    ]
  }]
})
```

### Prompt

```
Transcribe the following audio spoken in {sourceLangName}.
Then translate the transcription to {targetLangName}.
Return JSON only: { "originalText": "...", "translatedText": "..." }
```

### Middleware

- `cors()` — allow all origins for dev
- `express.json({ limit: '10mb' })` — audio payloads can be large
- No rate limiting for MVP

### Dependencies

- `express`, `cors`, `dotenv`, `@google/generative-ai`

## 7. UI Layout

Top to bottom on a single screen:

1. **Header** — "VoxLingo" app name
2. **Language bar** — Two `LanguagePicker` components side by side with a swap button (emoji) between them
3. **Translation list** — `FlatList` of `TranslationBubble` pairs. Source text on left (muted), translation on right (accent color). Empty state: prompt text "Tap the mic and start speaking"
4. **Record button** — Large circular button at bottom center. Idle: mic emoji. Recording: red with stop emoji. Subtle pulse animation via standard `Animated` API (no reanimated)
5. **Error banner** — Below header on failure, auto-dismisses after 3 seconds

### Styling constraints

- `StyleSheet.create()` throughout — no inline style objects
- Platform-specific shadows: `elevation` on Android, `shadow*` on iOS
- System fonts only (no custom fonts for MVP)
- Emoji for all icons (no SVG, no lucide): mic 🎙️, swap 🔄, stop ⏹️
- No `react-native-reanimated` — standard `Animated` API only

## 8. Platform-Specific Audio Recording

### Native (iOS/Android) — expo-av

- `Audio.Recording` configured for PCM 16kHz mono (WAV container)
- On stop, read the WAV file via `expo-file-system`, convert to base64

### Web — Web Audio API

- `navigator.mediaDevices.getUserMedia({ audio: true })`
- `AudioContext` + `ScriptProcessorNode` to capture raw PCM at 16kHz
- On stop, wrap PCM samples in a WAV header and encode to base64
- Required because expo-av on web produces webm/opus, not PCM

### Unified interface (`services/audio.ts`)

```typescript
startRecording(): Promise<void>
stopRecording(): Promise<string>  // returns base64 PCM
```

Platform detection via `Platform.OS`. Callers don't need to know which path runs.

## 9. Supported Languages (17)

| Region | Languages |
|--------|-----------|
| Global | English, Spanish |
| Asian | Mandarin Chinese, Hindi, Japanese, Korean, Thai, Vietnamese, Indonesian, Tagalog |
| European | Portuguese, Italian, Russian, Turkish, Polish, Dutch |
| Middle East | Arabic |

Language codes: `en`, `es`, `zh`, `hi`, `ja`, `ko`, `th`, `vi`, `id`, `tl`, `pt`, `it`, `ru`, `tr`, `pl`, `nl`, `ar`

## 10. Error Handling

- Backend: try/catch around Gemini call, return `{ error: string }` with status 500
- Frontend: `translate.ts` catches network/API errors, throws with user-friendly message
- `useTranslation` hook catches errors and sets an error state
- `ErrorBanner` component renders at top of screen, auto-dismisses after 3s
- Specific cases: no mic permission, network failure, Gemini API error

## 11. Constraints & Gotchas

- **SDK 54 only** — SDK 55 removed ExponentAV native module from Expo Go
- **No react-native-reanimated** — crashes Expo Go
- **No lucide-react-native / SVG in navigation** — crashes on Android
- **expo-av on web** produces webm/opus, not PCM — must use Web Audio API
- **Platform shadows** — `elevation` on Android, `shadow*` props on iOS only
- **Session ID guards** on any future socket listeners to prevent stale callbacks (not needed for MVP REST, but keep in mind for post-MVP)

## 12. Post-MVP Roadmap

1. TTS playback (expo-speech on native, SpeechSynthesis on web)
2. Firebase auth (Google + Apple Sign-In)
3. Translation history persistence (Firestore)
4. Camera mode (Gemini Vision)
5. Meeting mode (continuous recording + speaker detection)
6. Maps grounding (location-aware translations)
7. Offline phrase packs
8. Word lists / saved translations
