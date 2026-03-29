# VoxLingo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the complete VoxLingo project with Expo (frontend) and Node.js (backend), folder structure, dependencies, tab navigation, and type-checking — no business logic.

**Architecture:** Expo Router app with 3 tabs (Travel, Camera, Meeting) + Settings screen. Separate Node.js/Express backend with socket.io for WebSocket support. Firebase JS SDK for auth/Firestore. All Gemini API calls proxied through backend.

**Tech Stack:** Expo SDK 55, TypeScript, Expo Router (file-based routing), Express, socket.io, `@google/genai`, Firebase JS SDK, Jest

---

## File Structure

After scaffolding, the project will look like this:

```
voxlingo/
├── app/
│   ├── _layout.tsx              # Root layout (Stack navigator)
│   ├── settings.tsx             # Settings screen
│   └── (tabs)/
│       ├── _layout.tsx          # Tab navigator (Travel, Camera, Meeting)
│       ├── index.tsx            # Travel tab (default)
│       ├── camera.tsx           # Camera tab
│       └── meeting.tsx          # Meeting tab
├── components/
│   ├── AudioWaveform.tsx        # Voice visualization (placeholder)
│   ├── LanguagePicker.tsx       # Language selection (placeholder)
│   ├── TranslationBubble.tsx    # Chat bubble (placeholder)
│   └── SubtitleOverlay.tsx      # Meeting subtitle (placeholder)
├── services/
│   ├── gemini.ts                # Gemini Live API client (placeholder)
│   ├── vision.ts                # Gemini Vision API client (placeholder)
│   ├── maps.ts                  # Google Maps Grounding (placeholder)
│   └── firebase.ts              # Firebase init + auth + Firestore (placeholder)
├── hooks/
│   ├── useAudioStream.ts        # Mic recording hook (placeholder)
│   ├── useTranslation.ts        # Translation state hook (placeholder)
│   └── useLanguageDetect.ts     # Language detection hook (placeholder)
├── constants/
│   └── languages.ts             # Supported language list + codes
├── types/
│   └── index.ts                 # Shared TypeScript types
├── server/
│   ├── package.json             # Separate package.json for backend
│   ├── tsconfig.json            # Backend TS config
│   ├── index.ts                 # Express + socket.io entry point
│   ├── routes/
│   │   ├── auth.ts              # Auth routes (placeholder)
│   │   └── translate.ts         # Translation routes (placeholder)
│   ├── middleware/
│   │   └── rateLimit.ts         # Rate limiter (placeholder)
│   └── services/
│       └── geminiProxy.ts       # Gemini API proxy (placeholder)
├── .env.example                 # Required env vars template
├── .gitignore                   # Ignore node_modules, .env, .expo, etc.
├── package.json                 # Expo app package.json
├── tsconfig.json                # Expo TS config
├── CLAUDE.md                    # Already exists
└── SPEC.md                      # Already exists
```

---

### Task 1: Initialize Expo Project

**Files:**
- Create: entire `voxlingo/` directory via `create-expo-app`

- [ ] **Step 1: Create Expo project with TypeScript**

Run:
```bash
cd /c/Scripts/travelcompanion
npx create-expo-app@latest voxlingo --template blank-typescript
```

Expected: New `voxlingo/` directory with Expo project, `package.json`, `tsconfig.json`, `app.json`.

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Move CLAUDE.md and SPEC.md into the project**

```bash
mv /c/Scripts/travelcompanion/CLAUDE.md /c/Scripts/travelcompanion/voxlingo/CLAUDE.md
mv /c/Scripts/travelcompanion/SPEC.md /c/Scripts/travelcompanion/voxlingo/SPEC.md
```

- [ ] **Step 4: Commit**

```bash
cd /c/Scripts/travelcompanion/voxlingo
git init
git add -A
git commit -m "chore: initialize Expo project with TypeScript"
```

---

### Task 2: Install Frontend Dependencies

**Files:**
- Modify: `voxlingo/package.json`

- [ ] **Step 1: Install Expo packages**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx expo install expo-av expo-camera expo-sharing expo-file-system expo-location
```

These must be installed via `npx expo install` to get SDK-compatible versions.

- [ ] **Step 2: Install npm packages**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm install socket.io-client firebase @react-navigation/bottom-tabs
```

- [ ] **Step 3: Verify it still compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /c/Scripts/travelcompanion/voxlingo
git add package.json package-lock.json
git commit -m "chore: install frontend dependencies"
```

---

### Task 3: Set Up Expo Router with Tab Navigation

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx`
- Create: `app/(tabs)/camera.tsx`
- Create: `app/(tabs)/meeting.tsx`
- Create: `app/settings.tsx`
- Delete: default `App.tsx` if present

- [ ] **Step 1: Install Expo Router dependencies**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx expo install expo-router expo-linking expo-constants expo-status-bar
```

- [ ] **Step 2: Update app.json for Expo Router**

Add the `scheme` and `plugins` fields to `app.json`:

```json
{
  "expo": {
    "name": "voxlingo",
    "slug": "voxlingo",
    "version": "1.0.0",
    "scheme": "voxlingo",
    "platforms": ["ios", "android"],
    "plugins": ["expo-router"],
    "web": {
      "bundler": "metro"
    }
  }
}
```

- [ ] **Step 3: Update package.json main entry**

In `package.json`, set the `main` field:

```json
{
  "main": "expo-router/entry"
}
```

- [ ] **Step 4: Delete default App.tsx**

Remove `App.tsx` if it exists — Expo Router uses file-based routing instead.

```bash
rm -f /c/Scripts/travelcompanion/voxlingo/App.tsx
```

- [ ] **Step 5: Create root layout**

Create `app/_layout.tsx`:

```typescript
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
```

- [ ] **Step 6: Create tab layout**

Create `app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Travel",
          tabBarLabel: "Travel",
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "Camera",
          tabBarLabel: "Camera",
        }}
      />
      <Tabs.Screen
        name="meeting"
        options={{
          title: "Meeting",
          tabBarLabel: "Meeting",
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 7: Create Travel tab (index)**

Create `app/(tabs)/index.tsx`:

```typescript
import { View, Text, StyleSheet } from "react-native";

export default function TravelScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Travel Mode</Text>
      <Text style={styles.subtitle}>Voice-to-voice translation</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
});
```

- [ ] **Step 8: Create Camera tab**

Create `app/(tabs)/camera.tsx`:

```typescript
import { View, Text, StyleSheet } from "react-native";

export default function CameraScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera Mode</Text>
      <Text style={styles.subtitle}>Point at text to translate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
});
```

- [ ] **Step 9: Create Meeting tab**

Create `app/(tabs)/meeting.tsx`:

```typescript
import { View, Text, StyleSheet } from "react-native";

export default function MeetingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meeting Mode</Text>
      <Text style={styles.subtitle}>Live multi-speaker subtitles</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
});
```

- [ ] **Step 10: Create Settings screen**

Create `app/settings.tsx`:

```typescript
import { View, Text, StyleSheet } from "react-native";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Language preferences & account</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
});
```

- [ ] **Step 11: Verify it compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 12: Commit**

```bash
cd /c/Scripts/travelcompanion/voxlingo
git add -A
git commit -m "feat: add Expo Router with tab navigation (Travel, Camera, Meeting)"
```

---

### Task 4: Create Shared Types and Constants

**Files:**
- Create: `types/index.ts`
- Create: `constants/languages.ts`

- [ ] **Step 1: Create shared types**

Create `types/index.ts`:

```typescript
export type LanguageCode =
  | "en" | "es" | "zh" | "hi" | "ja" | "ko"
  | "th" | "vi" | "id" | "tl" | "pt" | "it"
  | "ru" | "tr" | "pl" | "nl" | "ar";

export type TranslationMode = "travel" | "camera" | "meeting";

export interface Translation {
  id: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  originalText: string;
  translatedText: string;
  mode: TranslationMode;
  timestamp: number;
  cached: boolean;
}

export interface TranscriptEntry {
  speaker: string;
  lang: LanguageCode;
  original: string;
  translated: string;
  timestamp: number;
}

export interface Transcript {
  id: string;
  title: string;
  date: number;
  duration: number;
  speakers: string[];
  entries: TranscriptEntry[];
  exportedAs: "txt" | "pdf" | null;
}

export interface WordListItem {
  id: string;
  word: string;
  translation: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  savedAt: number;
}

export interface UserProfile {
  displayName: string;
  email: string;
  preferredLanguages: LanguageCode[];
  createdAt: number;
}

export interface UserSettings {
  defaultSourceLang: LanguageCode;
  defaultTargetLang: LanguageCode;
  autoDetect: boolean;
}

export interface VisionTranslationResult {
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
}

export interface MeetingUtterance {
  speaker: string;
  lang: string;
  original: string;
  translated: string;
}
```

- [ ] **Step 2: Create language constants**

Create `constants/languages.ts`:

```typescript
import { LanguageCode } from "../types";

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog" },
];

export const DEFAULT_SOURCE_LANG: LanguageCode = "en";
export const DEFAULT_TARGET_LANG: LanguageCode = "es";

export function getLanguageName(code: LanguageCode): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang ? lang.name : code;
}

export function getLanguageNativeName(code: LanguageCode): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang ? lang.nativeName : code;
}
```

- [ ] **Step 3: Verify it compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /c/Scripts/travelcompanion/voxlingo
git add types/ constants/
git commit -m "feat: add shared TypeScript types and language constants"
```

---

### Task 5: Create Placeholder Services

**Files:**
- Create: `services/gemini.ts`
- Create: `services/vision.ts`
- Create: `services/maps.ts`
- Create: `services/firebase.ts`

- [ ] **Step 1: Create Gemini Live API service placeholder**

Create `services/gemini.ts`:

```typescript
import { LanguageCode } from "../types";

export interface GeminiStreamCallbacks {
  onTranslatedAudio: (audioBase64: string) => void;
  onTranslatedText: (text: string) => void;
  onError: (error: Error) => void;
}

export function connectToGeminiLive(
  _sourceLang: LanguageCode,
  _targetLang: LanguageCode,
  _callbacks: GeminiStreamCallbacks
): { sendAudio: (chunk: ArrayBuffer) => void; disconnect: () => void } {
  // TODO: Implement in Travel Mode task
  return {
    sendAudio: () => {},
    disconnect: () => {},
  };
}
```

- [ ] **Step 2: Create Vision API service placeholder**

Create `services/vision.ts`:

```typescript
import { LanguageCode, VisionTranslationResult } from "../types";

export async function translateImage(
  _imageBase64: string,
  _targetLang: LanguageCode
): Promise<VisionTranslationResult> {
  // TODO: Implement in Camera Mode task
  return {
    detectedLanguage: "",
    originalText: "",
    translatedText: "",
  };
}
```

- [ ] **Step 3: Create Maps service placeholder**

Create `services/maps.ts`:

```typescript
export interface LocationContext {
  country: string;
  city: string;
  culturalHints: string[];
}

export async function getLocationContext(): Promise<LocationContext | null> {
  // TODO: Implement in Context & Polish task
  return null;
}
```

- [ ] **Step 4: Create Firebase service placeholder**

Create `services/firebase.ts`:

```typescript
import { UserProfile, UserSettings } from "../types";

export function initializeFirebase(): void {
  // TODO: Implement in Context & Polish task
}

export async function signInWithGoogle(): Promise<UserProfile | null> {
  // TODO: Implement in Context & Polish task
  return null;
}

export async function signOut(): Promise<void> {
  // TODO: Implement in Context & Polish task
}

export async function getUserSettings(): Promise<UserSettings | null> {
  // TODO: Implement in Context & Polish task
  return null;
}

export async function saveTranslation(): Promise<void> {
  // TODO: Implement in Context & Polish task
}
```

- [ ] **Step 5: Verify it compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd /c/Scripts/travelcompanion/voxlingo
git add services/
git commit -m "feat: add placeholder service modules (gemini, vision, maps, firebase)"
```

---

### Task 6: Create Placeholder Hooks

**Files:**
- Create: `hooks/useAudioStream.ts`
- Create: `hooks/useTranslation.ts`
- Create: `hooks/useLanguageDetect.ts`

- [ ] **Step 1: Create useAudioStream hook placeholder**

Create `hooks/useAudioStream.ts`:

```typescript
import { useState } from "react";

export interface AudioStreamState {
  isRecording: boolean;
  error: string | null;
}

export function useAudioStream() {
  const [state, setState] = useState<AudioStreamState>({
    isRecording: false,
    error: null,
  });

  const startRecording = async () => {
    // TODO: Implement in Travel Mode task
    setState({ isRecording: true, error: null });
  };

  const stopRecording = async () => {
    // TODO: Implement in Travel Mode task
    setState({ isRecording: false, error: null });
  };

  return {
    isRecording: state.isRecording,
    error: state.error,
    startRecording,
    stopRecording,
  };
}
```

- [ ] **Step 2: Create useTranslation hook placeholder**

Create `hooks/useTranslation.ts`:

```typescript
import { useState } from "react";
import { Translation, LanguageCode } from "../types";

export interface TranslationState {
  translations: Translation[];
  isTranslating: boolean;
  error: string | null;
}

export function useTranslation(
  _sourceLang: LanguageCode,
  _targetLang: LanguageCode
) {
  const [state, setState] = useState<TranslationState>({
    translations: [],
    isTranslating: false,
    error: null,
  });

  const addTranslation = (_translation: Translation) => {
    // TODO: Implement in Travel Mode task
    setState((prev) => ({ ...prev }));
  };

  const clearTranslations = () => {
    setState({ translations: [], isTranslating: false, error: null });
  };

  return {
    translations: state.translations,
    isTranslating: state.isTranslating,
    error: state.error,
    addTranslation,
    clearTranslations,
  };
}
```

- [ ] **Step 3: Create useLanguageDetect hook placeholder**

Create `hooks/useLanguageDetect.ts`:

```typescript
import { useState } from "react";
import { LanguageCode } from "../types";

export function useLanguageDetect() {
  const [detectedLang, setDetectedLang] = useState<LanguageCode | null>(null);

  const detectLanguage = async (_audioChunk: ArrayBuffer) => {
    // TODO: Implement in Meeting Mode task
    setDetectedLang(null);
  };

  return {
    detectedLang,
    detectLanguage,
  };
}
```

- [ ] **Step 4: Verify it compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /c/Scripts/travelcompanion/voxlingo
git add hooks/
git commit -m "feat: add placeholder hooks (useAudioStream, useTranslation, useLanguageDetect)"
```

---

### Task 7: Create Placeholder UI Components

**Files:**
- Create: `components/AudioWaveform.tsx`
- Create: `components/LanguagePicker.tsx`
- Create: `components/TranslationBubble.tsx`
- Create: `components/SubtitleOverlay.tsx`

- [ ] **Step 1: Create AudioWaveform component**

Create `components/AudioWaveform.tsx`:

```typescript
import { View, StyleSheet } from "react-native";

interface AudioWaveformProps {
  isActive: boolean;
}

export function AudioWaveform({ isActive }: AudioWaveformProps) {
  return (
    <View
      style={[styles.container, isActive && styles.active]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    width: "100%",
  },
  active: {
    backgroundColor: "#3b82f6",
  },
});
```

- [ ] **Step 2: Create LanguagePicker component**

Create `components/LanguagePicker.tsx`:

```typescript
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LanguageCode } from "../types";
import { getLanguageName } from "../constants/languages";

interface LanguagePickerProps {
  selectedLang: LanguageCode;
  onSelect: (lang: LanguageCode) => void;
}

export function LanguagePicker({ selectedLang, onSelect }: LanguagePickerProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => {
        // TODO: Open language selection modal
        onSelect(selectedLang);
      }}
    >
      <Text style={styles.label}>{getLanguageName(selectedLang)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});
```

- [ ] **Step 3: Create TranslationBubble component**

Create `components/TranslationBubble.tsx`:

```typescript
import { View, Text, StyleSheet } from "react-native";

interface TranslationBubbleProps {
  text: string;
  isSource: boolean;
}

export function TranslationBubble({ text, isSource }: TranslationBubbleProps) {
  return (
    <View style={[styles.bubble, isSource ? styles.source : styles.target]}>
      <Text style={[styles.text, !isSource && styles.targetText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  source: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
  },
  target: {
    alignSelf: "flex-end",
    backgroundColor: "#3b82f6",
  },
  text: {
    fontSize: 16,
    color: "#1f2937",
  },
  targetText: {
    color: "#ffffff",
  },
});
```

- [ ] **Step 4: Create SubtitleOverlay component**

Create `components/SubtitleOverlay.tsx`:

```typescript
import { View, Text, StyleSheet } from "react-native";

interface SubtitleOverlayProps {
  speaker: string;
  originalText: string;
  translatedText: string;
  color: string;
}

export function SubtitleOverlay({
  speaker,
  originalText,
  translatedText,
  color,
}: SubtitleOverlayProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{speaker.charAt(0)}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.speaker}>{speaker}</Text>
        <Text style={styles.original}>{originalText}</Text>
        <Text style={styles.translated}>{translatedText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 12,
    marginVertical: 4,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  textContainer: {
    flex: 1,
  },
  speaker: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 2,
  },
  original: {
    fontSize: 14,
    color: "#9ca3af",
  },
  translated: {
    fontSize: 16,
    color: "#1f2937",
    marginTop: 2,
  },
});
```

- [ ] **Step 5: Verify it compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd /c/Scripts/travelcompanion/voxlingo
git add components/
git commit -m "feat: add placeholder UI components (AudioWaveform, LanguagePicker, TranslationBubble, SubtitleOverlay)"
```

---

### Task 8: Set Up Node.js Backend

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/index.ts`
- Create: `server/routes/auth.ts`
- Create: `server/routes/translate.ts`
- Create: `server/middleware/rateLimit.ts`
- Create: `server/services/geminiProxy.ts`

- [ ] **Step 1: Create server package.json**

Create `server/package.json`:

```json
{
  "name": "voxlingo-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nodemon --exec ts-node index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "helmet": "^8.0.0",
    "socket.io": "^4.8.3",
    "@google/genai": "^1.47.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "nodemon": "^3.1.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create server tsconfig.json**

Create `server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create Express + socket.io entry point**

Create `server/index.ts`:

```typescript
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./routes/auth";
import { translateRouter } from "./routes/translate";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRouter);
app.use("/api/translate", translateRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("audio-stream", (_data: Buffer) => {
    // TODO: Forward to Gemini Live API in Travel Mode task
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`VoxLingo server running on port ${PORT}`);
});

export { app, io };
```

- [ ] **Step 4: Create auth routes placeholder**

Create `server/routes/auth.ts`:

```typescript
import { Router } from "express";

export const authRouter = Router();

authRouter.post("/verify", (_req, res) => {
  // TODO: Implement Firebase token verification in Context & Polish task
  res.json({ message: "Auth endpoint placeholder" });
});
```

- [ ] **Step 5: Create translate routes placeholder**

Create `server/routes/translate.ts`:

```typescript
import { Router } from "express";

export const translateRouter = Router();

translateRouter.post("/image", (_req, res) => {
  // TODO: Implement Gemini Vision translation in Camera Mode task
  res.json({ message: "Image translation endpoint placeholder" });
});
```

- [ ] **Step 6: Create rate limiter middleware placeholder**

Create `server/middleware/rateLimit.ts`:

```typescript
import { Request, Response, NextFunction } from "express";

const requestCounts = new Map<string, { count: number; resetAt: number }>();

const MAX_REQUESTS_PER_MINUTE = 15;

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientId = req.ip || "unknown";
  const now = Date.now();
  const entry = requestCounts.get(clientId);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(clientId, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
    return;
  }

  entry.count++;
  next();
}
```

- [ ] **Step 7: Create Gemini proxy service placeholder**

Create `server/services/geminiProxy.ts`:

```typescript
export interface GeminiProxyConfig {
  apiKey: string;
  model: string;
}

export function getGeminiConfig(): GeminiProxyConfig {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return {
    apiKey,
    model: "gemini-2.0-flash",
  };
}

export async function translateWithGeminiVision(
  _imageBase64: string,
  _targetLang: string
): Promise<{ detectedLanguage: string; originalText: string; translatedText: string }> {
  // TODO: Implement in Camera Mode task
  return {
    detectedLanguage: "",
    originalText: "",
    translatedText: "",
  };
}
```

- [ ] **Step 8: Install server dependencies**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npm install
```

Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 9: Verify server compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 10: Commit**

```bash
cd /c/Scripts/travelcompanion/voxlingo
git add server/
git commit -m "feat: add Node.js backend with Express, socket.io, and placeholder routes"
```

---

### Task 9: Create Environment and Git Configuration

**Files:**
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create .env.example**

Create `.env.example` in project root:

```
# Gemini API (get from https://aistudio.google.com)
GEMINI_API_KEY=your_gemini_api_key_here

# Google Maps (get from https://console.cloud.google.com)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Firebase (get from https://console.firebase.google.com)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com

# Server
PORT=3001
```

- [ ] **Step 2: Update .gitignore**

Ensure `.gitignore` contains (add any missing entries):

```
# Dependencies
node_modules/
server/node_modules/

# Environment
.env
.env.local

# Expo
.expo/
dist/
web-build/

# Build
server/dist/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Superpowers brainstorm sessions
.superpowers/
```

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion/voxlingo
git add .env.example .gitignore
git commit -m "chore: add .env.example and update .gitignore"
```

---

### Task 10: Set Up Jest Testing

**Files:**
- Modify: `package.json` (add jest config)
- Create: `jest.config.js`
- Create: `constants/languages.test.ts`

- [ ] **Step 1: Install test dependencies**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm install --save-dev jest @types/jest ts-jest @testing-library/react-native @testing-library/jest-native react-test-renderer @types/react-test-renderer
```

- [ ] **Step 2: Create jest.config.js**

Create `jest.config.js`:

```javascript
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|firebase)",
  ],
  setupFilesAfterSetup: ["@testing-library/jest-native/extend-expect"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  collectCoverageFrom: [
    "**/*.{ts,tsx}",
    "!**/node_modules/**",
    "!**/server/**",
    "!**/types/**",
  ],
};
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, ensure the `scripts` section includes:

```json
{
  "scripts": {
    "test": "jest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 4: Write a smoke test for language constants**

Create `constants/languages.test.ts`:

```typescript
import {
  SUPPORTED_LANGUAGES,
  getLanguageName,
  getLanguageNativeName,
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
} from "./languages";

describe("languages", () => {
  it("has 17 supported languages", () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(17);
  });

  it("has unique language codes", () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("returns language name by code", () => {
    expect(getLanguageName("en")).toBe("English");
    expect(getLanguageName("ja")).toBe("Japanese");
    expect(getLanguageName("nl")).toBe("Dutch");
  });

  it("returns native name by code", () => {
    expect(getLanguageNativeName("ja")).toBe("日本語");
    expect(getLanguageNativeName("nl")).toBe("Nederlands");
  });

  it("has valid defaults", () => {
    expect(DEFAULT_SOURCE_LANG).toBe("en");
    expect(DEFAULT_TARGET_LANG).toBe("es");
  });
});
```

- [ ] **Step 5: Run tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Run typecheck**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd /c/Scripts/travelcompanion/voxlingo
git add jest.config.js constants/languages.test.ts package.json package-lock.json
git commit -m "chore: set up Jest testing with smoke test for language constants"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Run full typecheck on frontend**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Run full typecheck on backend**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run all tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Verify project structure**

Run:
```bash
find /c/Scripts/travelcompanion/voxlingo -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/.expo/*" \
  | sort
```

Expected: All files from the file structure listed at the top of this plan.

- [ ] **Step 5: Push to GitHub**

```bash
cd /c/Scripts/travelcompanion/voxlingo
git remote add origin https://github.com/KaiMOdev/travelcompanion.git
git branch -M main
git push -u origin main
```
