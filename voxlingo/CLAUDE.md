# VoxLingo — Real-time Voice Translation App (MVP)

## Project overview

VoxLingo is a voice translation app. Tap to record, get the transcription and translation displayed as chat bubbles. Built with Expo (React Native + TypeScript) and powered by Google Gemini REST API via a thin backend proxy.

## Tech stack

- **Frontend**: React Native with Expo SDK 54 (TypeScript)
- **Backend**: Node.js + Express (TypeScript)
- **AI/Translation**: Google Gemini REST API (`gemini-2.5-flash`, `generateContent`)
- **Audio**: expo-av (native), Web Audio API (web)

## Project structure

```
voxlingo/
├── app/
│   ├── _layout.tsx          # Root layout (single screen, no tabs)
│   └── index.tsx            # Travel screen
├── components/
│   ├── LanguagePicker.tsx   # Language dropdown
│   ├── TranslationBubble.tsx # Chat bubble
│   ├── RecordButton.tsx     # Tap-to-start/stop mic
│   └── ErrorBanner.tsx      # Auto-dismiss error
├── services/
│   ├── audio.ts             # Platform-split audio recording
│   └── translate.ts         # POST to backend
├── hooks/
│   └── useTranslation.ts    # Recording state + translation list
├── constants/
│   └── languages.ts         # 17 supported languages
├── types/
│   └── index.ts             # Shared types
├── server/
│   ├── index.ts             # Express server, POST /translate
│   └── .env                 # GEMINI_API_KEY, PORT=3001
├── app.json
├── package.json
└── firestore.rules          # Kept for post-MVP
```

## Commands

- `npx expo start` — Start Expo dev server
- `cd server && npm run dev` — Start backend with nodemon
- `npm test` — Run Jest tests
- `npm run typecheck` — TypeScript type check

## Code style

- TypeScript strict mode, no `any` types
- Functional components with hooks only
- Named exports for components, default exports for screens
- `StyleSheet.create()` for styles — no inline objects
- Emoji for icons (no SVG, no lucide)
- Platform-specific shadows: `elevation` on Android, `shadow*` on iOS

## Constraints

- **SDK 54 only** — SDK 55 removed ExponentAV from Expo Go
- **No react-native-reanimated** — crashes Expo Go
- **No SVG icons in navigation** — crashes on Android
- **expo-av on web** produces webm, not PCM — use Web Audio API
- **API keys** stay in `server/.env`, never in frontend code

## Testing

- Jest for unit tests
- Test files next to source: `*.test.ts` / `*.test.tsx`
- Mock all API calls in tests
