# TTS Playback — Design Spec

## 1. Overview

Add text-to-speech playback to VoxLingo. Translations are spoken aloud automatically when they arrive, and users can tap any translation bubble to replay it. Uses `expo-speech` for cross-platform TTS (iOS, Android, web).

## 2. New File

### `services/speech.ts`

Wraps `expo-speech` with a simple interface:

```typescript
speak(text: string, langCode: string): void
stop(): void
isSpeaking(): Promise<boolean>
```

**Language mapping:** Most VoxLingo language codes map directly to BCP 47 codes used by `expo-speech`. Two exceptions:
- `zh` → `zh-CN`
- `tl` → `fil`

All other codes (`en`, `es`, `hi`, `ja`, `ko`, `th`, `vi`, `id`, `pt`, `it`, `ru`, `tr`, `pl`, `nl`, `ar`) pass through unchanged.

## 3. Modified Files

### `types/index.ts`

No type changes needed. Speaking state is tracked by translation `id` in the hook, not as a field on the `Translation` type.

### `hooks/useTranslation.ts`

- Add `speakingId` state — the `id` of the translation currently being spoken (or `null`)
- After a new translation is added to the list, call `speech.speak(translatedText, targetLang)` and set `speakingId` to the new translation's id
- Add `replay(id: string)` function — stops current speech, finds the translation by id, speaks it, sets `speakingId`
- When speech finishes (via `Speech.speak` `onDone` callback), clear `speakingId` to `null`
- If a new translation arrives while one is speaking, `speech.stop()` first, then speak the new one
- Expose `speakingId` and `replay` in the hook's return value

### `components/TranslationBubble.tsx`

- Accept new props: `isSpeaking: boolean` and `onReplay: () => void`
- Wrap the target bubble in a `TouchableOpacity` that calls `onReplay` on press
- When `isSpeaking` is true, show a 🔊 emoji next to the translated text
- When not speaking, show a 🔈 emoji (subtle hint that it's tappable)

### `app/index.tsx`

- Pass `speakingId` and `replay` from `useTranslation` to each `TranslationBubble`
- Map: `isSpeaking={item.id === speakingId}` and `onReplay={() => replay(item.id)}`

## 4. Behavior

1. User stops recording → translation arrives → auto-speaks in target language
2. Target bubble shows 🔊 while speaking, 🔈 when idle
3. User taps any target bubble → stops current speech → replays that translation
4. New translation arriving interrupts current speech
5. Auto-play is always on (no mute toggle)

## 5. Error Handling

- If `expo-speech` fails (e.g., language not supported on device), silently catch — translation still shows as text. No error banner for TTS failures since the core feature (text translation) still works.

## 6. Dependency

- `expo-speech` — install via `npx expo install expo-speech`
- Compatible with Expo Go on SDK 54
