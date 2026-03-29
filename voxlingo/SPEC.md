# VoxLingo — Technical Specification

## 1. Overview

VoxLingo is a real-time voice-to-voice translation app for iOS and Android. It provides three translation modes: travel (voice), camera (OCR), and meeting (live subtitles). Built with Expo (React Native + TypeScript), Node.js backend, and Google Gemini API.

**Target:** Free at launch, under 100 beta users. Both platforms simultaneously.

## 2. Supported Languages (17)

| Region | Languages |
|--------|-----------|
| Global | English, Spanish |
| Asian | Mandarin Chinese, Hindi, Japanese, Korean, Thai, Vietnamese, Indonesian, Tagalog |
| European | Portuguese, Italian, Russian, Turkish, Polish, Dutch |
| Middle East | Arabic |

Language codes used throughout the app: `en`, `es`, `zh`, `hi`, `ja`, `ko`, `th`, `vi`, `id`, `tl`, `pt`, `it`, `ru`, `tr`, `pl`, `nl`, `ar`

## 3. Architecture

### 3.1 High-Level Flow

```
Expo App (RN) ⟵ WebSocket (socket.io) ⟶ Node.js Backend ⟶ Google Cloud (Gemini APIs)
                                                 │
                                           Firebase (Auth + Firestore + Offline Cache)
```

- **Expo App**: 3 tabs (Travel, Camera, Meeting) + Settings screen
- **Node.js Backend**: Express + socket.io, proxies all Gemini API calls (hides API keys)
- **Google Cloud**: Gemini Live API (voice-to-voice), Gemini Vision API (camera OCR), Maps Grounding (location context)
- **Firebase**: Auth (Google + Apple Sign-In), Firestore (translation history, transcripts, word lists, offline persistence)

### 3.2 Why This Architecture

- **WebSocket over REST**: Voice translation requires low-latency streaming. REST round-trips are too slow for real-time audio.
- **Backend proxy**: API keys never touch the mobile app. Rate limiting enforced server-side.
- **Gemini Live API**: Handles speech-to-speech natively — no separate STT → translate → TTS pipeline needed. Lower latency, simpler code.
- **Firebase offline persistence**: Gives "free" offline access to previously cached translations without building a separate offline system.

## 4. Features

### 4.1 Travel Mode (Core MVP)

**Purpose:** Two-person voice translation for travel conversations.

**User flow:**
1. User selects source and target language (with swap button)
2. Taps and holds mic button, speaks in source language
3. Audio streams via WebSocket to backend → Gemini Live API
4. Gemini returns translated audio + text
5. App plays translated audio and shows chat-style bubble

**UI elements:**
- Language selectors at top (two buttons with swap icon)
- Chat bubbles: left = source language (what user said), right = target language (translation)
- Large mic button at bottom with visual waveform feedback during recording
- Auto-scroll to latest translation

**Audio format:** 16-bit PCM, 16kHz, mono (Gemini Live API requirement)

**Technical details:**
- `hooks/useAudioStream.ts` — expo-av recording, streams PCM chunks via socket.io
- `hooks/useTranslation.ts` — manages translation state (pending, complete, error)
- `services/gemini.ts` — WebSocket client for Gemini Live API
- `server/services/geminiProxy.ts` — backend proxy, forwards audio to Gemini, relays response

### 4.2 Camera Mode

**Purpose:** Translate text from photos — menus, signs, documents.

**Two sub-modes:**
- **Photo mode:** User takes a photo → sent to Gemini Vision → translation displayed
- **Live Scan mode:** Continuous capture (1 frame per 2 seconds) → overlay translation on screen

**User flow:**
1. Open camera tab, point at text
2. Toggle between Photo and Live Scan
3. Photo: tap shutter → see translation below image
4. Live Scan: translations overlay in real-time

**Gemini Vision prompt:**
```
Detect all text in this image. Identify the language. Translate all detected text to [target language]. Return as JSON: { detectedLanguage: string, originalText: string, translatedText: string }
```

**Technical details:**
- `services/vision.ts` — Gemini Vision API client (multimodal: image + prompt)
- `app/(tabs)/camera.tsx` — expo-camera preview, photo capture, overlay
- `server/routes/translate.ts` — POST endpoint for image + prompt
- Recent scans list stored in local state + Firestore

### 4.3 Meeting Mode

**Purpose:** Live multi-speaker meeting translation with subtitles.

**User flow:**
1. User taps "Start Session"
2. App continuously listens to audio (no push-to-talk)
3. Gemini detects speakers, languages, and translates to user's preferred language
4. Subtitles appear in scrollable list with speaker labels and color codes
5. User can export/share transcript when done

**Gemini system prompt:**
```
You are a real-time meeting translator. Listen to continuous audio. For each utterance: detect the speaker (label as Speaker 1, Speaker 2, etc.), detect the language, provide the original text, and translate to [user's language]. Format as JSON.
```

**UI elements:**
- Start/Stop session button
- Scrollable subtitle list: colored speaker avatar + name + original text + translation
- Session timer
- "Export Transcript" button → save as .txt or .pdf
- "Share" button → native share sheet (WhatsApp, email, AirDrop, etc.) via expo-sharing

**Technical details:**
- Reuses `hooks/useAudioStream.ts` in continuous mode (no push-to-talk)
- Reuses `services/gemini.ts` with meeting-specific system prompt
- `app/(tabs)/meeting.tsx` — meeting UI with subtitle renderer
- Transcripts saved to Firestore `users/{uid}/transcripts/{id}`

### 4.4 Settings

- Default source and target language preferences
- Translation history (browse, search, delete)
- Personal word list (save words from translations)
- Account management (sign in/out, delete account)

## 5. Offline Strategy

**Approach:** Gemini-only + Firestore cache layer.

- **Firestore offline persistence** enabled — all previously fetched translations available offline
- **Pre-downloaded phrase packs** per language: greetings, directions, food/restaurant, emergencies, numbers, common questions (~200 phrases per language)
- **Offline indicator** in UI header — user knows when working from cache
- **Queue system** — translations attempted offline are queued and synced when connectivity returns
- **No on-device ML** — keeps app size small, consistent quality. Can be added later if needed.

## 6. Data Model (Firestore)

```
users/{uid}                          ← document
  ├── profile                        ← fields on user document
  │     { displayName: string, email: string, preferredLanguages: string[],
  │       createdAt: Timestamp }
  │
  ├── settings                       ← fields on user document
  │     { defaultSourceLang: string, defaultTargetLang: string,
  │       autoDetect: boolean }
  │
  ├── translations/{id}
  │     { sourceLang: string, targetLang: string,
  │       originalText: string, translatedText: string,
  │       mode: "travel" | "camera" | "meeting",
  │       timestamp: Timestamp, cached: boolean }
  │
  ├── wordlists/{id}
  │     { word: string, translation: string,
  │       sourceLang: string, targetLang: string, savedAt: Timestamp }
  │
  └── transcripts/{id}
        { title: string, date: Timestamp, duration: number,
          speakers: string[],
          entries: [{ speaker: string, lang: string,
                      original: string, translated: string,
                      timestamp: number }],
          exportedAs: "txt" | "pdf" | null }
```

## 7. API & External Services

### 7.1 Gemini Live API (Voice-to-Voice)
- **Protocol:** WebSocket
- **Audio format:** 16-bit PCM, 16kHz mono
- **Free tier:** 15 requests per minute (Gemini Flash)
- **Docs:** https://ai.google.dev/gemini-api/docs/live-api

### 7.2 Gemini Vision API (Camera OCR)
- **Protocol:** REST (multimodal: image + text prompt)
- **Input:** Base64-encoded image + translation prompt
- **Free tier:** 15 RPM (Flash)

### 7.3 Google Maps Grounding
- **Purpose:** Add location context to translation prompts
- **Example:** "User is currently in Madrid, Spain" → cultural hints in translations
- **Requires:** Maps JavaScript API + Places API enabled in Google Cloud Console
- **Note:** Separate billing enablement required

### 7.4 Firebase
- **Auth:** Google Sign-In + Apple Sign-In
- **Firestore:** Translation history, transcripts, word lists
- **Offline persistence:** Enabled for all collections

## 8. Rate Limiting & Error Handling

- Backend rate limiter: max 15 RPM per user (matches Gemini free tier)
- Graceful degradation: if Gemini is unavailable, show cached translations where possible
- User-friendly error messages for: no internet, rate limit hit, API error, mic permission denied, camera permission denied
- All API calls wrapped in try/catch on both frontend and backend

## 9. Security

- API keys stored in `.env` on backend only, never in frontend code
- `.env` in `.gitignore`
- Backend uses `helmet` for HTTP security headers
- Backend uses `cors` with whitelisted origins
- Firebase security rules: users can only read/write their own data
- No PII stored beyond Firebase Auth profile

## 10. Testing Strategy

- **Unit tests:** Jest for hooks and services
- **Component tests:** React Native Testing Library
- **Test location:** Co-located with source files (`Component.test.tsx`)
- **API mocking:** All Gemini/Firebase calls mocked in tests
- **Verification:** `npm test` + `npm run typecheck` after every change

## 11. API Key Setup Guide

### Step 1: Google AI Studio (Gemini API Key)
1. Go to https://aistudio.google.com
2. Sign in with Google account
3. Click "Get API Key" → "Create API key"
4. Copy the key — this is your `GEMINI_API_KEY`
5. Free tier: 15 RPM for Gemini Flash

### Step 2: Google Cloud Console
1. Go to https://console.cloud.google.com
2. Create a new project (e.g., "VoxLingo")
3. Enable these APIs:
   - Gemini API
   - Maps JavaScript API
   - Places API
4. Go to Credentials → Create API Key
5. Copy — this is your `GOOGLE_MAPS_API_KEY`
6. Restrict the key to only the APIs above

### Step 3: Firebase
1. Go to https://console.firebase.google.com
2. Click "Add project" → name it "VoxLingo"
3. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable Google provider
   - Enable Apple provider (requires Apple Developer Account)
4. Enable Firestore:
   - Go to Firestore Database → Create Database
   - Start in test mode (update rules before production)
5. Download config:
   - Go to Project Settings → General → Your Apps
   - Add a Web app → copy the `firebaseConfig` object

### Step 4: Apple Developer Account
- Cost: $99/year
- Required for: TestFlight distribution, Apple Sign-In
- Enroll at https://developer.apple.com/programs/

### Step 5: Google Play Developer Account
- Cost: $25 one-time
- Required for: Android beta testing via Play Console
- Enroll at https://play.google.com/console/signup

### Environment Variables (.env)

```
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
PORT=3001
```

## 12. Build Steps (Implementation Order)

1. **Scaffold** — Expo project + backend + folder structure + dependencies
2. **Travel Mode (MVP)** — Voice translation end-to-end
3. **Camera Mode** — Photo + live scan translation
4. **Meeting Mode** — Continuous multi-speaker translation + transcript export/share
5. **Context & Polish** — Maps grounding, Firebase auth, settings, offline phrase packs
6. **Testing & Launch** — Full test coverage, TestFlight + Play Console beta
