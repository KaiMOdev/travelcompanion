# VoxLingo MVP Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild VoxLingo from scratch as a single-screen voice translation app using Gemini REST API via a thin backend proxy.

**Architecture:** Expo app (SDK 54) records audio, sends base64 WAV to a Node.js Express backend, which proxies to Gemini REST (`gemini-2.5-flash`) for transcription + translation, and returns JSON. No WebSocket, no Firebase, no streaming.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, expo-av, Web Audio API, Express, `@google/genai`, Jest

---

## File Map

| File | Responsibility |
|------|---------------|
| `voxlingo/types/index.ts` | Shared TypeScript types (Translation, TranslateRequest, TranslateResponse) |
| `voxlingo/constants/languages.ts` | 17 supported languages with codes and display names |
| `voxlingo/server/index.ts` | Express server with single `POST /translate` endpoint |
| `voxlingo/services/audio.ts` | Platform-split audio recording (expo-av native, Web Audio API web) |
| `voxlingo/services/translate.ts` | HTTP client: POST audio to backend, return translation |
| `voxlingo/hooks/useTranslation.ts` | React hook: recording state, translation list, error state |
| `voxlingo/components/LanguagePicker.tsx` | Language dropdown selector |
| `voxlingo/components/TranslationBubble.tsx` | Chat bubble showing source + translated text |
| `voxlingo/components/RecordButton.tsx` | Tap-to-start/stop mic button with pulse animation |
| `voxlingo/components/ErrorBanner.tsx` | Auto-dismissing error message |
| `voxlingo/app/_layout.tsx` | Root layout (single screen, no tabs) |
| `voxlingo/app/index.tsx` | Main travel screen composing all components |

---

### Task 1: Clean up old source files and reset project structure

**Files:**
- Delete: `voxlingo/app/(tabs)/_layout.tsx`, `voxlingo/app/(tabs)/index.tsx`, `voxlingo/app/(tabs)/camera.tsx`, `voxlingo/app/(tabs)/meeting.tsx`, `voxlingo/app/settings.tsx`
- Delete: `voxlingo/components/ErrorBanner.tsx`, `voxlingo/components/TranslationBubble.tsx`, `voxlingo/components/LanguagePicker.tsx`, `voxlingo/components/SubtitleOverlay.tsx`, `voxlingo/components/ErrorBoundary.tsx`, `voxlingo/components/AudioWaveform.tsx`, `voxlingo/components/SkeletonCard.tsx`, `voxlingo/components/TabBar.tsx`
- Delete: `voxlingo/services/transcript.ts`, `voxlingo/services/transcript.test.ts`, `voxlingo/services/firebase.test.ts`, `voxlingo/services/maps.ts`, `voxlingo/services/maps.test.ts`, `voxlingo/services/vision.ts`, `voxlingo/services/gemini.ts`, `voxlingo/services/webAudioCapture.ts`, `voxlingo/services/firebase.ts`
- Delete: `voxlingo/hooks/useAudioStream.ts`, `voxlingo/hooks/useAudioStream.test.ts`, `voxlingo/hooks/useLanguageDetect.ts`, `voxlingo/hooks/useMeetingStream.ts`, `voxlingo/hooks/useMeetingStream.test.ts`, `voxlingo/hooks/useTranslation.ts`, `voxlingo/hooks/useTranslation.test.ts`
- Delete: `voxlingo/server/index.ts`, `voxlingo/server/routes/` (all), `voxlingo/server/services/` (all), `voxlingo/server/middleware/` (all)
- Delete: `voxlingo/theme/` (all)
- Delete: `voxlingo/__mocks__/` (all)
- Keep: `voxlingo/firestore.rules`, `voxlingo/app.json`, `voxlingo/package.json`, `voxlingo/tsconfig.json`, `voxlingo/server/package.json`, `voxlingo/server/tsconfig.json`, `voxlingo/server/.env`, `voxlingo/index.js`

- [ ] **Step 1: Delete old app screens**

```bash
cd c:/Scripts/travelcompanion
rm -rf voxlingo/app/(tabs) voxlingo/app/settings.tsx voxlingo/app/_layout.tsx
```

- [ ] **Step 2: Delete old components**

```bash
rm -f voxlingo/components/ErrorBanner.tsx voxlingo/components/TranslationBubble.tsx voxlingo/components/LanguagePicker.tsx voxlingo/components/SubtitleOverlay.tsx voxlingo/components/ErrorBoundary.tsx voxlingo/components/AudioWaveform.tsx voxlingo/components/SkeletonCard.tsx voxlingo/components/TabBar.tsx
```

- [ ] **Step 3: Delete old services and hooks**

```bash
rm -f voxlingo/services/transcript.ts voxlingo/services/transcript.test.ts voxlingo/services/firebase.test.ts voxlingo/services/maps.ts voxlingo/services/maps.test.ts voxlingo/services/vision.ts voxlingo/services/gemini.ts voxlingo/services/webAudioCapture.ts voxlingo/services/firebase.ts
rm -f voxlingo/hooks/useAudioStream.ts voxlingo/hooks/useAudioStream.test.ts voxlingo/hooks/useLanguageDetect.ts voxlingo/hooks/useMeetingStream.ts voxlingo/hooks/useMeetingStream.test.ts voxlingo/hooks/useTranslation.ts voxlingo/hooks/useTranslation.test.ts
```

- [ ] **Step 4: Delete old server source, theme, and mocks**

```bash
rm -f voxlingo/server/index.ts
rm -rf voxlingo/server/routes voxlingo/server/services voxlingo/server/middleware
rm -rf voxlingo/theme voxlingo/__mocks__
```

- [ ] **Step 5: Delete old types and constants (will be rewritten)**

```bash
rm -f voxlingo/types/index.ts voxlingo/constants/languages.ts
```

- [ ] **Step 6: Clean up package.json — remove unused dependencies**

Remove from `voxlingo/package.json` dependencies: `@expo-google-fonts/space-grotesk`, `@react-navigation/bottom-tabs`, `expo-camera`, `expo-location`, `expo-sharing`, `firebase`, `lucide-react-native`, `react-native-reanimated`, `react-native-svg`, `socket.io-client`.

Remove from devDependencies: `@testing-library/jest-native`, `@testing-library/react-native`, `react-test-renderer`, `@types/react-test-renderer`.

Keep: `expo`, `expo-av`, `expo-constants`, `expo-file-system`, `expo-font`, `expo-linking`, `expo-router`, `expo-status-bar`, `@expo/metro-runtime`, `react`, `react-dom`, `react-native`, `react-native-web`.

Run:
```bash
cd c:/Scripts/travelcompanion/voxlingo
npm uninstall @expo-google-fonts/space-grotesk @react-navigation/bottom-tabs expo-camera expo-location expo-sharing firebase lucide-react-native react-native-reanimated react-native-svg socket.io-client @testing-library/jest-native @testing-library/react-native react-test-renderer @types/react-test-renderer
```

- [ ] **Step 7: Clean up server package.json — remove unused deps**

Remove from `voxlingo/server/package.json` dependencies: `firebase-admin`, `helmet`, `socket.io`.

```bash
cd c:/Scripts/travelcompanion/voxlingo/server
npm uninstall firebase-admin helmet socket.io
```

- [ ] **Step 8: Verify clean state**

```bash
cd c:/Scripts/travelcompanion/voxlingo
ls app/ components/ services/ hooks/ server/
```

Expected: `app/` is empty, `components/` is empty, `services/` is empty, `hooks/` is empty, `server/` has only `package.json`, `tsconfig.json`, `node_modules/`, `.env`, `jest.config.js`.

- [ ] **Step 9: Commit**

```bash
cd c:/Scripts/travelcompanion
git add -A
git commit -m "chore: clean slate — delete all old source files for MVP rebuild"
```

---

### Task 2: Types and constants

**Files:**
- Create: `voxlingo/types/index.ts`
- Create: `voxlingo/constants/languages.ts`

- [ ] **Step 1: Create shared types**

Create `voxlingo/types/index.ts`:

```typescript
export type Translation = {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
};

export type TranslateRequest = {
  audio: string;
  sourceLang: string;
  targetLang: string;
};

export type TranslateResponse = {
  originalText: string;
  translatedText: string;
};

export type TranslateErrorResponse = {
  error: string;
};

export type Language = {
  code: string;
  name: string;
};
```

- [ ] **Step 2: Create language constants**

Create `voxlingo/constants/languages.ts`:

```typescript
import { Language } from '../types';

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'zh', name: 'Mandarin Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ar', name: 'Arabic' },
];

export const getLanguageName = (code: string): string => {
  const lang = LANGUAGES.find((l) => l.code === code);
  return lang ? lang.name : code;
};
```

- [ ] **Step 3: Run typecheck**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors (these files have no dependencies beyond each other).

- [ ] **Step 4: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/types/index.ts voxlingo/constants/languages.ts
git commit -m "feat: add shared types and language constants"
```

---

### Task 3: Backend — Express server with `/translate` endpoint

**Files:**
- Create: `voxlingo/server/index.ts`
- Test: `voxlingo/server/index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `voxlingo/server/index.test.ts`:

```typescript
import { createApp } from './index';
import request from 'supertest';

// Mock @google/genai
jest.mock('@google/genai', () => {
  const mockGenerateContent = jest.fn();
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
    __mockGenerateContent: mockGenerateContent,
  };
});

const { __mockGenerateContent: mockGenerateContent } = jest.requireMock('@google/genai');

describe('POST /translate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns translated text from Gemini', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '{"originalText": "hello", "translatedText": "hola"}',
    });

    const app = createApp();
    const res = await request(app)
      .post('/translate')
      .send({
        audio: 'dGVzdA==',
        sourceLang: 'en',
        targetLang: 'es',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      originalText: 'hello',
      translatedText: 'hola',
    });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when required fields are missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/translate')
      .send({ audio: 'dGVzdA==' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 when Gemini call fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'));

    const app = createApp();
    const res = await request(app)
      .post('/translate')
      .send({
        audio: 'dGVzdA==',
        sourceLang: 'en',
        targetLang: 'es',
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
```

- [ ] **Step 2: Install supertest in server**

```bash
cd c:/Scripts/travelcompanion/voxlingo/server
npm install --save-dev supertest @types/supertest
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd c:/Scripts/travelcompanion/voxlingo/server
npx jest --no-cache
```

Expected: FAIL — `createApp` is not a function / module not found.

- [ ] **Step 4: Write the server implementation**

Create `voxlingo/server/index.ts`:

```typescript
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const GEMINI_MODEL = 'gemini-2.5-flash';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  app.post('/translate', async (req: Request, res: Response) => {
    const { audio, sourceLang, targetLang } = req.body;

    if (!audio || !sourceLang || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: audio, sourceLang, targetLang' });
      return;
    }

    const prompt = `Transcribe the following audio spoken in ${sourceLang}. Then translate the transcription to ${targetLang}. Return JSON only: { "originalText": "...", "translatedText": "..." }`;

    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'audio/wav', data: audio } },
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
      res.json({
        originalText: parsed.originalText,
        translatedText: parsed.translatedText,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      res.status(500).json({ error: message });
    }
  });

  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 3001;
  const app = createApp();
  app.listen(port, () => {
    console.log(`VoxLingo server running on port ${port}`);
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd c:/Scripts/travelcompanion/voxlingo/server
npx jest --no-cache
```

Expected: 3 tests PASS.

- [ ] **Step 6: Run typecheck**

```bash
cd c:/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/server/index.ts voxlingo/server/index.test.ts voxlingo/server/package.json voxlingo/server/package-lock.json
git commit -m "feat: add Express server with POST /translate endpoint"
```

---

### Task 4: Frontend translate service

**Files:**
- Create: `voxlingo/services/translate.ts`
- Test: `voxlingo/services/translate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `voxlingo/services/translate.test.ts`:

```typescript
import { translateAudio } from './translate';

global.fetch = jest.fn();

describe('translateAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends audio to backend and returns translation', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        originalText: 'hello',
        translatedText: 'hola',
      }),
    });

    const result = await translateAudio('dGVzdA==', 'en', 'es');

    expect(result).toEqual({
      originalText: 'hello',
      translatedText: 'hola',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/translate'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: 'dGVzdA==',
          sourceLang: 'en',
          targetLang: 'es',
        }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    await expect(translateAudio('dGVzdA==', 'en', 'es')).rejects.toThrow('Server error');
  });

  it('throws on network failure', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network request failed'));

    await expect(translateAudio('dGVzdA==', 'en', 'es')).rejects.toThrow(
      'Could not connect to translation server',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest services/translate.test.ts --no-cache
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `voxlingo/services/translate.ts`:

```typescript
import { TranslateResponse, TranslateErrorResponse } from '../types';

const API_URL = __DEV__
  ? 'http://localhost:3001'
  : 'http://localhost:3001'; // Update for production later

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

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest services/translate.test.ts --no-cache
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/services/translate.ts voxlingo/services/translate.test.ts
git commit -m "feat: add translate service — POST audio to backend"
```

---

### Task 5: Audio recording service (platform-split)

**Files:**
- Create: `voxlingo/services/audio.ts`
- Test: `voxlingo/services/audio.test.ts`

- [ ] **Step 1: Write the failing test**

Create `voxlingo/services/audio.test.ts`:

```typescript
import { Platform } from 'react-native';

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn(),
      startAsync: jest.fn(),
      stopAndUnloadAsync: jest.fn(),
      getURI: jest.fn().mockReturnValue('file://test.wav'),
    })),
  },
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64audiodata'),
  EncodingType: { Base64: 'base64' },
}));

describe('audio service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('startRecording and stopRecording return base64 on native', async () => {
    Platform.OS = 'ios';
    const { startRecording, stopRecording } = require('./audio');

    await startRecording();
    const result = await stopRecording();

    expect(typeof result).toBe('string');
    expect(result).toBe('base64audiodata');
  });

  it('throws if stopRecording called without startRecording', async () => {
    Platform.OS = 'ios';
    const { stopRecording } = require('./audio');

    await expect(stopRecording()).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest services/audio.test.ts --no-cache
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `voxlingo/services/audio.ts`:

```typescript
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

let recording: Audio.Recording | null = null;

// --- Native (iOS/Android) using expo-av ---

async function startNativeRecording(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const newRecording = new Audio.Recording();
  await newRecording.prepareToRecordAsync({
    android: {
      extension: '.wav',
      outputFormat: 3, // THREE_GPP — expo-av maps this to WAV with correct settings
      audioEncoder: 1, // DEFAULT
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 256000,
    },
    ios: {
      extension: '.wav',
      outputFormat: 'linearPCM' as any,
      audioQuality: 127, // MAX
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 256000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {},
  });
  await newRecording.startAsync();
  recording = newRecording;
}

async function stopNativeRecording(): Promise<string> {
  if (!recording) {
    throw new Error('No recording in progress');
  }

  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  recording = null;

  if (!uri) {
    throw new Error('Recording failed — no file URI');
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return base64;
}

// --- Web using Web Audio API ---

let mediaStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let pcmChunks: Float32Array[] = [];

async function startWebRecording(): Promise<void> {
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext({ sampleRate: 16000 });
  pcmChunks = [];

  const source = audioContext.createMediaStreamSource(mediaStream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    pcmChunks.push(new Float32Array(data));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);
}

async function stopWebRecording(): Promise<string> {
  if (!mediaStream || !audioContext) {
    throw new Error('No recording in progress');
  }

  mediaStream.getTracks().forEach((t) => t.stop());
  await audioContext.close();

  // Merge chunks
  const totalLength = pcmChunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of pcmChunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  // Convert float32 to int16
  const int16 = new Int16Array(merged.length);
  for (let i = 0; i < merged.length; i++) {
    const s = Math.max(-1, Math.min(1, merged[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // Wrap in WAV header
  const wavBuffer = createWavBuffer(int16, 16000);

  // Convert to base64
  const bytes = new Uint8Array(wavBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  mediaStream = null;
  audioContext = null;
  pcmChunks = [];

  return btoa(binary);
}

function createWavBuffer(samples: Int16Array, sampleRate: number): ArrayBuffer {
  const byteLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + byteLength);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + byteLength, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, byteLength, true);

  const output = new Int16Array(buffer, 44);
  output.set(samples);

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// --- Public API ---

export async function startRecording(): Promise<void> {
  if (Platform.OS === 'web') {
    return startWebRecording();
  }
  return startNativeRecording();
}

export async function stopRecording(): Promise<string> {
  if (Platform.OS === 'web') {
    return stopWebRecording();
  }
  return stopNativeRecording();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest services/audio.test.ts --no-cache
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/services/audio.ts voxlingo/services/audio.test.ts
git commit -m "feat: add platform-split audio recording service"
```

---

### Task 6: useTranslation hook

**Files:**
- Create: `voxlingo/hooks/useTranslation.ts`
- Test: `voxlingo/hooks/useTranslation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `voxlingo/hooks/useTranslation.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useTranslation } from './useTranslation';

jest.mock('../services/audio', () => ({
  startRecording: jest.fn().mockResolvedValue(undefined),
  stopRecording: jest.fn().mockResolvedValue('base64audio'),
}));

jest.mock('../services/translate', () => ({
  translateAudio: jest.fn().mockResolvedValue({
    originalText: 'hello',
    translatedText: 'hola',
  }),
}));

describe('useTranslation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in idle state with empty translations', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isTranslating).toBe(false);
    expect(result.current.translations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('toggleRecord starts and stops recording, then translates', async () => {
    const { result } = renderHook(() => useTranslation());

    // Start recording
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });
    expect(result.current.isRecording).toBe(true);

    // Stop recording — triggers translation
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.translations).toHaveLength(1);
    expect(result.current.translations[0].originalText).toBe('hello');
    expect(result.current.translations[0].translatedText).toBe('hola');
  });

  it('sets error when translation fails', async () => {
    const { translateAudio } = require('../services/translate');
    translateAudio.mockRejectedValueOnce(new Error('API error'));

    const { result } = renderHook(() => useTranslation());

    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });

    expect(result.current.error).toBe('API error');
    expect(result.current.translations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Install @testing-library/react-native**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npm install --save-dev @testing-library/react-native
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest hooks/useTranslation.test.ts --no-cache
```

Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

Create `voxlingo/hooks/useTranslation.ts`:

```typescript
import { useState, useCallback, useRef } from 'react';
import { startRecording, stopRecording } from '../services/audio';
import { translateAudio } from '../services/translate';
import { Translation } from '../types';

export function useTranslation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef(false);

  const toggleRecord = useCallback(
    async (sourceLang: string, targetLang: string) => {
      setError(null);

      if (!recordingRef.current) {
        // Start recording
        try {
          await startRecording();
          recordingRef.current = true;
          setIsRecording(true);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to start recording';
          setError(msg);
        }
      } else {
        // Stop recording and translate
        recordingRef.current = false;
        setIsRecording(false);
        setIsTranslating(true);

        try {
          const audio = await stopRecording();
          const result = await translateAudio(audio, sourceLang, targetLang);

          const translation: Translation = {
            id: Date.now().toString(),
            originalText: result.originalText,
            translatedText: result.translatedText,
            sourceLang,
            targetLang,
            timestamp: Date.now(),
          };

          setTranslations((prev) => [...prev, translation]);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Translation failed';
          setError(msg);
        } finally {
          setIsTranslating(false);
        }
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    isRecording,
    isTranslating,
    translations,
    error,
    toggleRecord,
    clearError,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest hooks/useTranslation.test.ts --no-cache
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/hooks/useTranslation.ts voxlingo/hooks/useTranslation.test.ts
git commit -m "feat: add useTranslation hook — recording state + translation list"
```

---

### Task 7: UI components — LanguagePicker, TranslationBubble, RecordButton, ErrorBanner

**Files:**
- Create: `voxlingo/components/LanguagePicker.tsx`
- Create: `voxlingo/components/TranslationBubble.tsx`
- Create: `voxlingo/components/RecordButton.tsx`
- Create: `voxlingo/components/ErrorBanner.tsx`

- [ ] **Step 1: Create LanguagePicker**

Create `voxlingo/components/LanguagePicker.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LANGUAGES } from '../constants/languages';

type Props = {
  selectedCode: string;
  onSelect: (code: string) => void;
  label: string;
};

export function LanguagePicker({ selectedCode, onSelect, label }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedCode}
          onValueChange={onSelect}
          style={styles.picker}
        >
          {LANGUAGES.map((lang) => (
            <Picker.Item key={lang.code} label={lang.name} value={lang.code} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 48,
  },
});
```

- [ ] **Step 2: Install @react-native-picker/picker**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx expo install @react-native-picker/picker
```

- [ ] **Step 3: Create TranslationBubble**

Create `voxlingo/components/TranslationBubble.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Translation } from '../types';
import { getLanguageName } from '../constants/languages';

type Props = {
  translation: Translation;
};

export function TranslationBubble({ translation }: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.bubble, styles.sourceBubble]}>
        <Text style={styles.langLabel}>{getLanguageName(translation.sourceLang)}</Text>
        <Text style={styles.text}>{translation.originalText}</Text>
      </View>
      <View style={[styles.bubble, styles.targetBubble]}>
        <Text style={styles.langLabel}>{getLanguageName(translation.targetLang)}</Text>
        <Text style={[styles.text, styles.targetText]}>{translation.translatedText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 2,
    maxWidth: '85%',
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
  sourceBubble: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  targetBubble: {
    backgroundColor: '#e3f2fd',
    alignSelf: 'flex-end',
  },
  langLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  targetText: {
    color: '#1565c0',
  },
});
```

- [ ] **Step 4: Create RecordButton**

Create `voxlingo/components/RecordButton.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';

type Props = {
  isRecording: boolean;
  isTranslating: boolean;
  onPress: () => void;
};

export function RecordButton({ isRecording, isTranslating, onPress }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const disabled = isTranslating;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.button,
          isRecording && styles.recording,
          disabled && styles.disabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>{isRecording ? '⏹️' : isTranslating ? '⏳' : '🎙️'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1565c0',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  recording: {
    backgroundColor: '#d32f2f',
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 32,
  },
});
```

- [ ] **Step 5: Create ErrorBanner**

Create `voxlingo/components/ErrorBanner.tsx`:

```tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  message: string | null;
  onDismiss: () => void;
};

export function ErrorBanner({ message, onDismiss }: Props) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  text: {
    color: '#c62828',
    fontSize: 14,
  },
});
```

- [ ] **Step 6: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/components/LanguagePicker.tsx voxlingo/components/TranslationBubble.tsx voxlingo/components/RecordButton.tsx voxlingo/components/ErrorBanner.tsx voxlingo/package.json voxlingo/package-lock.json
git commit -m "feat: add UI components — LanguagePicker, TranslationBubble, RecordButton, ErrorBanner"
```

---

### Task 8: App layout and main screen

**Files:**
- Create: `voxlingo/app/_layout.tsx`
- Create: `voxlingo/app/index.tsx`

- [ ] **Step 1: Create root layout**

Create `voxlingo/app/_layout.tsx`:

```tsx
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
```

- [ ] **Step 2: Create main travel screen**

Create `voxlingo/app/index.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { LanguagePicker } from '../components/LanguagePicker';
import { TranslationBubble } from '../components/TranslationBubble';
import { RecordButton } from '../components/RecordButton';
import { ErrorBanner } from '../components/ErrorBanner';
import { Translation } from '../types';

export default function TravelScreen() {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const { isRecording, isTranslating, translations, error, toggleRecord, clearError } =
    useTranslation();

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleRecord = () => {
    toggleRecord(sourceLang, targetLang);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>VoxLingo</Text>

      <ErrorBanner message={error} onDismiss={clearError} />

      <View style={styles.languageBar}>
        <LanguagePicker
          selectedCode={sourceLang}
          onSelect={setSourceLang}
          label="From"
        />
        <TouchableOpacity onPress={handleSwapLanguages} style={styles.swapButton}>
          <Text style={styles.swapIcon}>🔄</Text>
        </TouchableOpacity>
        <LanguagePicker
          selectedCode={targetLang}
          onSelect={setTargetLang}
          label="To"
        />
      </View>

      <FlatList
        style={styles.list}
        data={translations}
        keyExtractor={(item: Translation) => item.id}
        renderItem={({ item }) => <TranslationBubble translation={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Tap the mic and start speaking</Text>
          </View>
        }
        contentContainerStyle={translations.length === 0 ? styles.emptyContainer : undefined}
      />

      <RecordButton
        isRecording={isRecording}
        isTranslating={isTranslating}
        onPress={handleRecord}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 12,
    color: '#1565c0',
  },
  languageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  swapButton: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  swapIcon: {
    fontSize: 24,
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
```

- [ ] **Step 3: Verify app loads**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx expo start --web
```

Expected: App loads in browser with "VoxLingo" header, two language pickers, empty state text, and a mic button. (Stop the server with Ctrl+C after confirming.)

- [ ] **Step 4: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/app/_layout.tsx voxlingo/app/index.tsx
git commit -m "feat: add root layout and main travel screen"
```

---

### Task 9: Update CLAUDE.md and app.json for the rebuild

**Files:**
- Modify: `voxlingo/CLAUDE.md`
- Modify: `voxlingo/app.json`

- [ ] **Step 1: Rewrite CLAUDE.md**

Replace `voxlingo/CLAUDE.md` with updated content reflecting the MVP rebuild:

```markdown
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
```

- [ ] **Step 2: Add web platform to app.json**

In `voxlingo/app.json`, add `"web"` to the platforms array so it reads `["ios", "android", "web"]`.

- [ ] **Step 3: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/CLAUDE.md voxlingo/app.json
git commit -m "docs: update CLAUDE.md and app.json for MVP rebuild"
```

---

### Task 10: End-to-end smoke test

- [ ] **Step 1: Start the backend**

```bash
cd c:/Scripts/travelcompanion/voxlingo/server
npm run dev
```

Expected: `VoxLingo server running on port 3001`

- [ ] **Step 2: Start the Expo app (in a separate terminal)**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx expo start --web
```

Expected: App loads with language pickers, empty state, and mic button.

- [ ] **Step 3: Test the full flow**

1. Select English → Spanish
2. Tap the mic button (grant mic permission if prompted)
3. Speak a short phrase in English
4. Tap the mic button again to stop
5. Wait for the translation to appear as chat bubbles

Expected: Source text bubble (left, gray) + translated text bubble (right, blue) appear.

- [ ] **Step 4: Test error handling**

1. Stop the backend server
2. Tap record, speak, stop
3. Verify error banner appears and auto-dismisses after 3 seconds

- [ ] **Step 5: Run all tests**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npm test
cd c:/Scripts/travelcompanion/voxlingo/server
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Run typecheck**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npm run typecheck
cd c:/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 7: Commit (if any fixes were needed)**

```bash
cd c:/Scripts/travelcompanion
git add -A
git commit -m "fix: smoke test fixes"
```
