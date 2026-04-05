---
name: voxlingo-expert
description: Unified expert for the VoxLingo project — covers Google APIs (Gemini Live/Vision, Firebase, Maps), React Native + Expo mobile development (iOS/Android/Web), and Node.js backend. Use this skill for ANY work on this project including API integration, mobile UI, platform-specific bugs, audio/camera/translation features, Firebase operations, server-side code, debugging crashes, or performance optimization. Trigger whenever the user mentions translation, recording, Gemini, Firebase, Expo, Android, iOS, mobile, socket, streaming, or any VoxLingo feature. This is your go-to skill for this codebase.
---

# VoxLingo Expert

You are an expert in every aspect of the VoxLingo project — a real-time voice translation app built with React Native (Expo), Node.js, and Google APIs. This skill covers three domains:

1. **Google APIs** — Gemini (Live + Vision + REST), Firebase (Auth + Firestore), Maps
2. **React Native + Expo** — iOS, Android, Web platform differences, Expo Go limitations
3. **Node.js Backend** — Express, Socket.io, session management, rate limiting

Read only the reference files relevant to your current task — don't load everything at once.

## Reference Files

### Google APIs
- `references/gemini.md` — Gemini Live API (WebSocket streaming), Vision API, model names, audio format, session config
- `references/firebase.md` — Auth flows, Firestore schema, queries, offline persistence, security rules
- `references/maps.md` — Location services, reverse geocoding, Maps Grounding

### React Native + Expo
- `references/platform-patterns.md` — iOS/Android/Web patterns: audio config, keyboard, permissions, shadows, back button, haptics
- `references/web-audio.md` — Web Audio API PCM capture, PCM-to-WAV playback, downsampling

---

## Project Architecture

```
Mobile App (Expo/RN)  ←→  Socket.io/REST  ←→  Node.js Backend  ←→  Google APIs
     ↓                                              ↓
  Firebase Auth                              Gemini Live + REST
  Firestore                                  Vision API
  expo-location                              firebase-admin
```

**Key rules:**
- Gemini API keys stay on the backend — NEVER in frontend code
- Firebase client config uses `EXPO_PUBLIC_*` env vars (safe to expose)
- Socket.io for real-time streaming, REST for request/response
- Backend proxy all Gemini API calls

## Hybrid Translation Architecture

Travel mode combines two Gemini APIs because the Live API's native-audio model transcribes but doesn't reliably follow translation instructions:

1. **Gemini Live** (`gemini-2.5-flash-native-audio-preview-12-2025`) → real-time speech-to-text
2. **Gemini REST** (`gemini-2.5-flash`) → translate accumulated text when recording stops
3. **Browser TTS** (`SpeechSynthesis`) → speak translation aloud on web

### Required Live API Config
```typescript
config: {
  responseModalities: [Modality.AUDIO],
  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
  systemInstruction: { parts: [{ text: "The user is speaking English." }] },
  inputAudioTranscription: {},
}
```

### Audio Format
- Input: 16-bit PCM, 16kHz, mono, little-endian (`audio/pcm;rate=16000`)
- Output: 24kHz PCM from Gemini
- Chunk size: 32ms (512 samples) — Gemini recommends 20-40ms
- Web: use Web Audio API (expo-av records webm/opus on web, not PCM)

## Expo Go Limitations (CRITICAL)

Expo Go cannot load custom native modules. These CRASH the entire app:
- `react-native-reanimated` → use standard `Animated` API
- `react-native-svg` on Android → can cause `String cannot be cast to Boolean`
- Custom native modules → use Expo SDK equivalents

If any of these are imported anywhere in the dependency chain, the app won't load.

## Platform-Specific Quick Reference

| Issue | iOS | Android | Web |
|-------|-----|---------|-----|
| Audio recording | `Audio.IOSOutputFormat.LINEARPCM` (NOT string) | `Audio.AndroidOutputFormat.DEFAULT` | Web Audio API for PCM |
| Shadows | `shadow*` props work | `elevation` ONLY | `boxShadow` CSS |
| SVG icons | Work | May crash in Expo Go | Work |
| Permissions denied | Standard | Must detect `canAskAgain` + `Linking.openSettings()` | Browser prompt |
| TTS | `expo-speech` | `expo-speech` | `window.speechSynthesis` |
| Back button | N/A | `BackHandler` | Browser back |
| Safe area | `useSafeAreaInsets()` | `useSafeAreaInsets()` | Not needed |
| Socket URL | `localhost` works in simulator | Must use LAN IP on physical device | `localhost` works |

## State Management Patterns

- **Multiple related state values** → `useReducer` over multiple `useState`
- **UPSERT pattern** → update by ID if exists, append if new (for live transcription)
- **Stale closure in intervals** → use `useRef` guards, not state
- **Session ID guards** → prevent stale socket callbacks from firing on new sessions

## Memory Leak Prevention

- Clear intervals in both cleanup AND error catch blocks
- Set `onaudioprocess = null` before disconnecting ScriptProcessorNode
- Close `AudioContext` on stop
- Cancel `SpeechSynthesis` before starting new speech
- Remove socket listeners with `sock.off()` after delayed cleanup

## Error Handling

- **ErrorBoundary** wraps root layout — prevents white-screen crashes
- **Gemini quota** → detect 429/RESOURCE_EXHAUSTED, show user-friendly message
- **Session close** → auto-reconnect with retry limit (max 3) and exponential backoff
- **Translation failure** → don't clear accumulated text on error (allows retry)
- **Connection timeout** → 15s Promise.race on Live API connect

## Master Debugging Checklist

### Google API Issues
1. API key set in `.env`?
2. Correct model name? (`gemini-2.5-flash-native-audio-preview-12-2025` for Live, `gemini-2.5-flash` for REST)
3. Billing enabled on Google Cloud project?
4. Audio format correct? (16-bit PCM, 16kHz, mono)
5. `speechConfig` set with voice name?
6. `inputAudioTranscription: {}` in config?
7. Rate limit hit? (429 / RESOURCE_EXHAUSTED)
8. Live session closes immediately? → model retired, check `ai.models.list()`

### Mobile/Platform Issues
9. Red screen on Android? → SVG crash, reanimated, or shadow styles
10. Crash on iOS? → Audio config enum, permission handling
11. Blank screen? → ErrorBoundary, missing default export, import crash
12. Works on web not native? → Web API usage (window, navigator, AudioContext)
13. Works on native not web? → expo-av web limitations, native module imports
14. Socket won't connect on phone? → `localhost` doesn't work — use LAN IP

### Server Issues
15. Port in use? → Kill with `npx kill-port 3001` or PowerShell
16. Nodemon not picking up changes? → Kill port, then `rs` or restart
17. Session zombie? → Check TTL cleanup, graceful shutdown handlers
18. Translation not reaching client? → Check socket listener timing (5s delay on cleanup)
