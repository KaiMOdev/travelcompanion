# VoxLingo — Real-time Voice-to-Voice Translation App

## Project overview

VoxLingo is a mobile app (iOS + Android) that provides real-time voice-to-voice translation, camera-based text translation, and live meeting subtitles. Built with React Native (Expo) and powered by Google's Gemini API.

## Tech stack

- **Frontend**: React Native with Expo (TypeScript)
- **Backend**: Node.js + Express (TypeScript)
- **AI/Translation**: Google Gemini Live API (voice-to-voice), Gemini Vision API (camera OCR)
- **Location**: Google Maps Grounding API (context-aware translations)
- **Auth & DB**: Firebase Auth + Firestore
- **Real-time**: WebSocket (socket.io) between app and backend
- **Audio**: expo-av for recording/playback, WebSocket streaming to Gemini Live API

## Project structure

```
voxlingo/
├── app/                    # React Native (Expo Router)
│   ├── (tabs)/             # Tab-based navigation
│   │   ├── travel.tsx      # Two-person voice translation
│   │   ├── camera.tsx      # Camera text translation
│   │   └── meeting.tsx     # Multi-speaker live subtitles
│   ├── _layout.tsx         # Root layout with tab navigator
│   └── settings.tsx        # Language preferences, history
├── components/             # Shared UI components
│   ├── AudioWaveform.tsx   # Voice visualization
│   ├── LanguagePicker.tsx  # Language selection dropdown
│   ├── TranslationBubble.tsx
│   └── SubtitleOverlay.tsx
├── services/               # API integrations
│   ├── gemini.ts           # Gemini Live API WebSocket client
│   ├── vision.ts           # Gemini Vision API for camera
│   ├── maps.ts             # Google Maps Grounding
│   └── firebase.ts         # Auth + Firestore
├── hooks/                  # Custom React hooks
│   ├── useAudioStream.ts   # Mic recording + streaming
│   ├── useTranslation.ts   # Translation state management
│   └── useLanguageDetect.ts
├── server/                 # Node.js backend
│   ├── index.ts            # Express + WebSocket server
│   ├── routes/
│   │   ├── auth.ts
│   │   └── translate.ts
│   ├── middleware/
│   │   └── rateLimit.ts
│   └── services/
│       └── geminiProxy.ts  # Proxies Gemini API (hides API key)
├── CLAUDE.md
├── package.json
└── tsconfig.json
```

## Commands

- `npx expo start` — Start Expo dev server
- `npx expo start --ios` — Run on iOS simulator
- `npx expo start --android` — Run on Android emulator
- `cd server && npm run dev` — Start backend with nodemon
- `npm test` — Run Jest tests
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript type check

## Code style

- TypeScript strict mode, no `any` types
- Functional components with hooks only (no class components)
- Named exports for components, default exports for screens
- Use `const` over `let`, never `var`
- Error handling: always wrap API calls in try/catch with user-friendly error messages
- Use React Native StyleSheet.create() for styles, not inline objects
- Dutch comments are fine, English variable/function names

## API key management

- NEVER put API keys in frontend code
- All Gemini API calls go through the Node.js backend
- Backend reads keys from environment variables (.env)
- .env is in .gitignore

## Key architectural decisions

- Audio streaming uses WebSocket (not REST) for low latency
- Gemini Live API handles speech-to-speech natively (no separate STT → translate → TTS pipeline)
- Camera translation uses Gemini's multimodal vision (send image, get translation)
- Firebase Firestore for translation history (offline-capable)
- Language detection is automatic via Gemini (no manual switching needed)

## Testing

- Jest for unit tests, React Native Testing Library for component tests
- Test files go next to source files: `Component.test.tsx`
- Run `npm test` before committing
- Mock all API calls in tests (never hit real Gemini API in tests)

## Important gotchas

- Gemini Live API uses WebSocket, not REST — see https://ai.google.dev/gemini-api/docs/live-api
- Audio format for Gemini: 16-bit PCM, 16kHz mono
- expo-av recording config must match Gemini's expected format
- Maps Grounding requires separate billing enablement in Google Cloud Console
- Rate limit Gemini API calls on backend (free tier = 15 RPM for Flash)
