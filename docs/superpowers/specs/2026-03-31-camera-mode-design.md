# Camera Mode — Design Spec

## 1. Overview

Add a camera translation mode to VoxLingo. User takes a photo of text (menus, signs, documents), the app sends it to Gemini Vision for OCR + translation, and displays the result below the photo. Photo only — no live scan.

## 2. Navigation

Switch from single screen to bottom tab layout:

```
app/
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator (🎙️ Travel, 📷 Camera)
│   ├── index.tsx         # Travel screen (moved from app/index.tsx)
│   └── camera.tsx        # Camera screen (new)
├── _layout.tsx           # Root layout (Stack, unchanged)
```

Tab bar uses emoji icons — no SVG, no lucide. Labels: "Travel" and "Camera".

## 3. New Files

### `app/(tabs)/_layout.tsx`

Tab navigator with two tabs. Emoji icons in tab bar labels. No custom TabBar component — use Expo Router's `Tabs` component.

### `app/(tabs)/camera.tsx`

Camera screen with three UI states:

**Viewfinder state:**
- `expo-camera` preview fills the top area
- Target language picker at the top (source language auto-detected by Gemini)
- Shutter button (📸) at the bottom center

**Translating state:**
- Captured photo displayed (top half)
- Loading spinner / "Translating..." text below

**Result state:**
- Captured photo (top half, scrollable)
- Translation card below: detected language label, original text, translated text
- "New photo" button to reset back to viewfinder

### `services/vision.ts`

HTTP client for the vision endpoint:

```typescript
translateImage(image: string, targetLang: string): Promise<VisionResponse>
```

Posts `{ image, targetLang }` to `POST /vision` on the backend. Same error handling pattern as `services/translate.ts`. Reuses the same `getApiUrl()` function for LAN IP detection.

## 4. Modified Files

### `app/index.tsx` → `app/(tabs)/index.tsx`

File move only — the Travel screen code stays identical.

### `app/_layout.tsx`

Stays as root Stack layout. No changes needed — the `(tabs)` directory becomes a nested layout automatically via Expo Router.

### `server/index.ts`

Add `POST /vision` endpoint:

- Receives `{ image, targetLang }`
- Validates `targetLang` against `LANG_NAMES`
- Sends to Gemini REST (`gemini-2.5-flash`, `generateContent`) as multimodal: inline JPEG image + text prompt
- Prompt: `"Detect all text in this image. Identify the language. Translate all detected text to {targetName}. The translatedText MUST be in {targetName}, not English. Return JSON only: { "detectedLanguage": "...", "originalText": "...", "translatedText": "..." }"`
- Parses JSON from response, validates output fields (detectedLanguage, originalText, translatedText must be non-empty strings)
- Returns validated response
- On error, returns `{ error: string }` with status 500

Also apply these improvements (from GPT-5 review):
- Raise `express.json` limit from `10mb` to `25mb` (images can be large)
- Validate Gemini response fields before returning to client

Gemini call shape:
```typescript
generateContent({
  model: 'gemini-2.5-flash',
  contents: [{
    role: 'user',
    parts: [
      { inlineData: { mimeType: 'image/jpeg', data: image } },
      { text: prompt },
    ],
  }],
})
```

### `types/index.ts`

Add new types:

```typescript
type VisionRequest = {
  image: string;
  targetLang: string;
};

type VisionResponse = {
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
};
```

### `app.json`

Add CAMERA permission for Android and camera usage description for iOS:

```json
"android": {
  "permissions": ["CAMERA", "RECORD_AUDIO"]
},
"ios": {
  "infoPlist": {
    "NSCameraUsageDescription": "Camera access is needed to translate photos of text."
  }
}
```

## 5. Camera Screen State

```typescript
targetLang: string           // default 'en'
photo: string | null         // captured image URI
isTranslating: boolean
result: VisionResponse | null
error: string | null
```

No custom hook — state is simple enough to manage inline with `useState`.

## 6. Camera Screen Flow

1. App requests camera permission on mount (`Camera.requestCameraPermissionsAsync()`)
2. If denied, show permission message with instructions
3. User selects target language from picker
4. User taps shutter → `cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 })`
5. Set `photo` to the URI, set `isTranslating = true`
6. Call `vision.translateImage(base64, targetLang)`
7. On success: set `result`, clear `isTranslating`
8. On error: set `error`, clear `isTranslating`
9. User taps "New photo" → reset `photo`, `result`, `error` to initial state

## 7. UI Layout

**Viewfinder:**
- Camera preview: `flex: 1`
- Target language picker: overlay at top (semi-transparent background)
- Shutter button: bottom center, large circular (same style as RecordButton but with 📸)

**Result:**
- `ScrollView` wrapping everything
- Photo: fixed height (~40% of screen), `resizeMode: 'contain'`
- Translation card below: detected language label, original text (grey), translated text (blue, same style as TranslationBubble)
- "New photo" button at bottom

## 8. Error Handling

- Camera permission denied: show message "Camera access is needed to translate photos" with no shutter button
- Backend/Gemini error: show ErrorBanner (reuse existing component), auto-dismiss, photo stays visible so user can retry
- No text detected: Gemini returns empty originalText — show "No text detected in this image"
- Camera not available on web: show "Camera is not available on web. Use a mobile device."

## 9. Dependencies

- `expo-camera` — install via `npx expo install expo-camera`
- `@react-navigation/bottom-tabs` — already installed (bundled with expo-router)

## 10. Constraints

- Same constraints as rest of app: SDK 54, no reanimated, no SVG icons, emoji only, StyleSheet.create, platform shadows
- `fontWeight` must use named values (`'bold'`, `'600'`) not numeric strings (`'700'`) — numeric strings crash Android
- Camera not available on web in Expo Go — show fallback message
- Image quality 0.7 to keep payload size manageable (base64 JPEG)
