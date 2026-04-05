# Camera Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add photo-based camera translation mode with bottom tab navigation.

**Architecture:** Install expo-camera, move Travel screen into `(tabs)/` directory, add Camera tab with viewfinder → capture → translate flow. New `/vision` backend endpoint sends images to Gemini for OCR + translation.

**Tech Stack:** expo-camera, Expo Router Tabs, Gemini REST (multimodal), Express

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `voxlingo/types/index.ts` | Modify | Add VisionRequest, VisionResponse types |
| `voxlingo/services/api.ts` | Create | Shared `getApiUrl()` extracted from translate.ts |
| `voxlingo/services/translate.ts` | Modify | Import getApiUrl from api.ts |
| `voxlingo/services/vision.ts` | Create | POST image to /vision endpoint |
| `voxlingo/services/vision.test.ts` | Create | Tests for vision service |
| `voxlingo/server/index.ts` | Modify | Add POST /vision endpoint, raise body limit |
| `voxlingo/server/index.test.ts` | Modify | Add /vision tests |
| `voxlingo/app/(tabs)/_layout.tsx` | Create | Tab navigator with Travel + Camera |
| `voxlingo/app/(tabs)/index.tsx` | Create | Travel screen (moved from app/index.tsx) |
| `voxlingo/app/(tabs)/camera.tsx` | Create | Camera screen |
| `voxlingo/app/index.tsx` | Delete | Replaced by (tabs)/index.tsx |
| `voxlingo/app.json` | Modify | Add CAMERA permission, iOS plist |

---

### Task 1: Add types and install expo-camera

**Files:**
- Modify: `voxlingo/types/index.ts`
- Modify: `voxlingo/app.json`

- [ ] **Step 1: Install expo-camera**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx expo install expo-camera
```

- [ ] **Step 2: Add vision types**

Add to the end of `voxlingo/types/index.ts`:

```typescript
export type VisionRequest = {
  image: string;
  targetLang: string;
};

export type VisionResponse = {
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
};
```

- [ ] **Step 3: Update app.json with CAMERA permission and iOS plist**

In `voxlingo/app.json`, update the `android` section to add CAMERA to permissions:

```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#ffffff"
  },
  "permissions": ["CAMERA", "RECORD_AUDIO"]
}
```

Update the `ios` section to add camera usage description:

```json
"ios": {
  "supportsTablet": true,
  "infoPlist": {
    "NSCameraUsageDescription": "Camera access is needed to translate photos of text."
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/types/index.ts voxlingo/app.json voxlingo/package.json voxlingo/package-lock.json
git commit -m "feat: add vision types, install expo-camera, add permissions"
```

---

### Task 2: Extract shared getApiUrl and create vision service

**Files:**
- Create: `voxlingo/services/api.ts`
- Modify: `voxlingo/services/translate.ts`
- Create: `voxlingo/services/vision.ts`
- Create: `voxlingo/services/vision.test.ts`

- [ ] **Step 1: Create shared API URL helper**

Create `voxlingo/services/api.ts`:

```typescript
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getApiUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001';
  }
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3001`;
  }
  return 'http://localhost:3001';
}

export const API_URL = getApiUrl();
```

- [ ] **Step 2: Update translate.ts to use shared API_URL**

Replace the full contents of `voxlingo/services/translate.ts` with:

```typescript
import { TranslateResponse, TranslateErrorResponse } from '../types';
import { API_URL } from './api';

export async function translateAudio(
  audio: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslateResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, sourceLang, targetLang }),
    });
  } catch {
    throw new Error('Could not connect to translation server');
  }

  if (!response.ok) {
    const body: TranslateErrorResponse = await response.json();
    throw new Error(body.error || 'Translation failed');
  }

  return response.json();
}
```

- [ ] **Step 3: Write the vision service test**

Create `voxlingo/services/vision.test.ts`:

```typescript
jest.mock('expo-constants', () => ({
  expoConfig: { hostUri: 'localhost:8081' },
  manifest2: null,
}));

import { translateImage } from './vision';

global.fetch = jest.fn();

describe('translateImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends image to backend and returns vision response', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        detectedLanguage: 'Spanish',
        originalText: 'Hola mundo',
        translatedText: 'Hello world',
      }),
    });

    const result = await translateImage('base64img', 'en');

    expect(result).toEqual({
      detectedLanguage: 'Spanish',
      originalText: 'Hola mundo',
      translatedText: 'Hello world',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/vision'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: 'base64img', targetLang: 'en' }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Vision failed' }),
    });

    await expect(translateImage('base64img', 'en')).rejects.toThrow('Vision failed');
  });

  it('throws on network failure', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network request failed'));

    await expect(translateImage('base64img', 'en')).rejects.toThrow(
      'Could not connect to translation server',
    );
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest services/vision.test.ts --no-cache
```

Expected: FAIL — module not found.

- [ ] **Step 5: Create vision service**

Create `voxlingo/services/vision.ts`:

```typescript
import { VisionResponse, TranslateErrorResponse } from '../types';
import { API_URL } from './api';

export async function translateImage(
  image: string,
  targetLang: string,
): Promise<VisionResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, targetLang }),
    });
  } catch {
    throw new Error('Could not connect to translation server');
  }

  if (!response.ok) {
    const body: TranslateErrorResponse = await response.json();
    throw new Error(body.error || 'Image translation failed');
  }

  return response.json();
}
```

- [ ] **Step 6: Run tests — expected 3 PASS**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest services/vision.test.ts --no-cache
```

- [ ] **Step 7: Run existing translate tests to confirm no regression**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest services/translate.test.ts --no-cache
```

Expected: 3 PASS (translate tests need the expo-constants mock updated — the test already has it).

- [ ] **Step 8: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/services/api.ts voxlingo/services/translate.ts voxlingo/services/vision.ts voxlingo/services/vision.test.ts
git commit -m "feat: extract shared API URL, add vision service"
```

---

### Task 3: Add /vision endpoint to backend

**Files:**
- Modify: `voxlingo/server/index.ts`
- Modify: `voxlingo/server/index.test.ts`

- [ ] **Step 1: Add vision test cases**

Add these tests to the existing `voxlingo/server/index.test.ts`, inside the top-level `describe` block (after the existing `/translate` tests):

```typescript
describe('POST /vision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns vision translation from Gemini', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '{"detectedLanguage": "Spanish", "originalText": "Hola", "translatedText": "Hello"}',
    });

    const app = createApp();
    const res = await request(app)
      .post('/vision')
      .send({
        image: 'base64img',
        targetLang: 'en',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      detectedLanguage: 'Spanish',
      originalText: 'Hola',
      translatedText: 'Hello',
    });
  });

  it('returns 400 when required fields are missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/vision')
      .send({ image: 'base64img' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for invalid language code', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/vision')
      .send({ image: 'base64img', targetLang: 'xx' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid language code');
  });

  it('returns 500 when Gemini call fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'));

    const app = createApp();
    const res = await request(app)
      .post('/vision')
      .send({ image: 'base64img', targetLang: 'en' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
cd c:/Scripts/travelcompanion/voxlingo/server
npx jest --no-cache
```

Expected: 4 new tests FAIL (404), 3 old tests PASS.

- [ ] **Step 3: Add /vision endpoint and raise body limit**

In `voxlingo/server/index.ts`, change the body limit:

```typescript
app.use(express.json({ limit: '25mb' }));
```

Add the `/vision` endpoint after the existing `/translate` endpoint (before `return app;`):

```typescript
  app.post('/vision', async (req: Request, res: Response) => {
    const { image, targetLang } = req.body;

    if (!image || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: image, targetLang' });
      return;
    }

    if (!LANG_NAMES[targetLang]) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const targetName = LANG_NAMES[targetLang];
    const prompt = `Detect all text in this image. Identify the language. Translate all detected text to ${targetName}. The translatedText MUST be in ${targetName}, not English. Return JSON only: { "detectedLanguage": "...", "originalText": "...", "translatedText": "..." }`;

    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: image } },
              { text: prompt },
            ],
          },
        ],
      });

      const text = result.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.status(500).json({ error: 'Failed to parse Gemini response' });
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.detectedLanguage || !parsed.originalText || !parsed.translatedText) {
        res.status(500).json({ error: 'Incomplete response from Gemini' });
        return;
      }

      res.json({
        detectedLanguage: parsed.detectedLanguage,
        originalText: parsed.originalText,
        translatedText: parsed.translatedText,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vision translation failed';
      res.status(500).json({ error: message });
    }
  });
```

- [ ] **Step 4: Run tests — expected 7 PASS**

```bash
cd c:/Scripts/travelcompanion/voxlingo/server
npx jest --no-cache
```

- [ ] **Step 5: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/server/index.ts voxlingo/server/index.test.ts
git commit -m "feat: add POST /vision endpoint for camera translation"
```

---

### Task 4: Switch to tab navigation and move Travel screen

**Files:**
- Create: `voxlingo/app/(tabs)/_layout.tsx`
- Move: `voxlingo/app/index.tsx` → `voxlingo/app/(tabs)/index.tsx`

- [ ] **Step 1: Create tab layout**

Create `voxlingo/app/(tabs)/_layout.tsx`:

```tsx
import React from 'react';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1565c0',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Travel',
          tabBarIcon: () => null,
          tabBarLabel: '🎙️ Travel',
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Camera',
          tabBarIcon: () => null,
          tabBarLabel: '📷 Camera',
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Move Travel screen to tabs directory**

```bash
cd c:/Scripts/travelcompanion/voxlingo
mkdir -p app/\(tabs\)
mv app/index.tsx app/\(tabs\)/index.tsx
```

- [ ] **Step 3: Verify app loads on web**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx expo start --web
```

Expected: App loads with bottom tab bar showing "🎙️ Travel" and "📷 Camera" tabs. Travel tab works as before. Camera tab shows blank (not created yet). Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/app/\(tabs\)/_layout.tsx voxlingo/app/\(tabs\)/index.tsx
git rm voxlingo/app/index.tsx 2>/dev/null || true
git commit -m "feat: switch to tab navigation, move Travel to tabs"
```

---

### Task 5: Create Camera screen

**Files:**
- Create: `voxlingo/app/(tabs)/camera.tsx`

- [ ] **Step 1: Create the camera screen**

Create `voxlingo/app/(tabs)/camera.tsx`:

```tsx
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LanguagePicker } from '../../components/LanguagePicker';
import { ErrorBanner } from '../../components/ErrorBanner';
import { translateImage } from '../../services/vision';
import { VisionResponse } from '../../types';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [targetLang, setTargetLang] = useState('en');
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<VisionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Web fallback
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.fallbackText}>
            Camera is not available on web. Use a mobile device.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission loading
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1565c0" />
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.fallbackText}>
            Camera access is needed to translate photos.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      const pic = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });
      if (!pic || !pic.base64) {
        setError('Failed to capture photo');
        return;
      }

      setPhoto({ uri: pic.uri, base64: pic.base64 });
      setResult(null);
      setError(null);
      setIsTranslating(true);

      try {
        const visionResult = await translateImage(pic.base64, targetLang);
        setResult(visionResult);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Translation failed';
        setError(msg);
      } finally {
        setIsTranslating(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to capture photo';
      setError(msg);
    }
  };

  const handleReset = () => {
    setPhoto(null);
    setResult(null);
    setError(null);
  };

  // Result / translating state
  if (photo) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="contain" />

          {isTranslating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1565c0" />
              <Text style={styles.loadingText}>Translating...</Text>
            </View>
          )}

          {error && (
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          )}

          {result && (
            <View style={styles.resultCard}>
              <Text style={styles.detectedLabel}>
                Detected: {result.detectedLanguage}
              </Text>
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Original</Text>
                <Text style={styles.originalText}>{result.originalText}</Text>
              </View>
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Translation</Text>
                <Text style={styles.translatedText}>
                  {result.translatedText || 'No text detected in this image'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.newPhotoButton} onPress={handleReset}>
          <Text style={styles.newPhotoText}>📷 New Photo</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Viewfinder state
  return (
    <SafeAreaView style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.cameraOverlay}>
          <View style={styles.languageOverlay}>
            <LanguagePicker
              selectedCode={targetLang}
              onSelect={setTargetLang}
              label="Translate to"
            />
          </View>
        </View>
      </CameraView>

      <TouchableOpacity style={styles.shutterButton} onPress={handleCapture}>
        <Text style={styles.shutterIcon}>📸</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 16,
    backgroundColor: '#1565c0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  languageOverlay: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    margin: 16,
    padding: 8,
    borderRadius: 12,
  },
  shutterButton: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#111',
  },
  shutterIcon: {
    fontSize: 48,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  photo: {
    width: '100%',
    height: 300,
    backgroundColor: '#eee',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  resultCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  detectedLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  resultSection: {
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  originalText: {
    fontSize: 16,
    color: '#333',
  },
  translatedText: {
    fontSize: 16,
    color: '#1565c0',
    fontWeight: 'bold',
  },
  newPhotoButton: {
    backgroundColor: '#1565c0',
    padding: 16,
    alignItems: 'center',
  },
  newPhotoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/app/\(tabs\)/camera.tsx
git commit -m "feat: add Camera screen with viewfinder, capture, and translation display"
```

---

### Task 6: Run all tests and smoke test

- [ ] **Step 1: Run all frontend tests**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest --no-cache
```

Expected: All tests PASS.

- [ ] **Step 2: Run server tests**

```bash
cd c:/Scripts/travelcompanion/voxlingo/server
npx jest --no-cache
```

Expected: 7 tests PASS.

- [ ] **Step 3: Run typecheck**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Manual smoke test — Travel tab**

1. Start backend: `cd voxlingo/server && npm run dev`
2. Start app: `cd voxlingo && npx expo start`
3. Open on Android (Expo Go) or web
4. Verify Travel tab works — record, translate, TTS, replay
5. Verify tab bar shows "🎙️ Travel" and "📷 Camera"

- [ ] **Step 5: Manual smoke test — Camera tab (Android only)**

1. Tap "📷 Camera" tab
2. Grant camera permission when prompted
3. Select target language
4. Point at text (menu, sign, book)
5. Tap 📸 shutter
6. Wait for translation
7. Verify: photo displayed, detected language shown, original + translated text shown
8. Tap "📷 New Photo" to reset

- [ ] **Step 6: Manual smoke test — Camera tab (web)**

1. Open on web
2. Tap "📷 Camera" tab
3. Verify: shows "Camera is not available on web" fallback message

- [ ] **Step 7: Commit any fixes**

```bash
cd c:/Scripts/travelcompanion
git add -A
git commit -m "fix: smoke test fixes for camera mode"
```
