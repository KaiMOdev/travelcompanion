# TTS Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auto-play and tap-to-replay text-to-speech for translations using expo-speech.

**Architecture:** New `services/speech.ts` wraps expo-speech with language code mapping. `useTranslation` hook gains auto-speak on new translation + replay by id. `TranslationBubble` becomes tappable with speaker indicator.

**Tech Stack:** expo-speech, React Native Animated API

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `voxlingo/services/speech.ts` | Create | Wrap expo-speech: speak, stop, language mapping |
| `voxlingo/services/speech.test.ts` | Create | Tests for speech service |
| `voxlingo/hooks/useTranslation.ts` | Modify | Add speakingId, auto-speak, replay |
| `voxlingo/hooks/useTranslation.test.ts` | Modify | Add tests for TTS behavior |
| `voxlingo/components/TranslationBubble.tsx` | Modify | Add tap-to-replay, speaker emoji |
| `voxlingo/app/index.tsx` | Modify | Wire speakingId + replay to bubbles |

---

### Task 1: Install expo-speech and create speech service

**Files:**
- Create: `voxlingo/services/speech.ts`
- Test: `voxlingo/services/speech.test.ts`

- [ ] **Step 1: Install expo-speech**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx expo install expo-speech
```

- [ ] **Step 2: Write the failing test**

Create `voxlingo/services/speech.test.ts`:

```typescript
import * as Speech from 'expo-speech';
import { speak, stop, toBcp47 } from './speech';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
}));

describe('speech service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Speech.speak with text and language', () => {
    speak('hola', 'es', { onDone: jest.fn() });

    expect(Speech.speak).toHaveBeenCalledWith('hola', {
      language: 'es',
      onDone: expect.any(Function),
      onError: expect.any(Function),
    });
  });

  it('maps zh to zh-CN', () => {
    speak('你好', 'zh', { onDone: jest.fn() });

    expect(Speech.speak).toHaveBeenCalledWith('你好', {
      language: 'zh-CN',
      onDone: expect.any(Function),
      onError: expect.any(Function),
    });
  });

  it('maps tl to fil', () => {
    speak('kumusta', 'tl', { onDone: jest.fn() });

    expect(Speech.speak).toHaveBeenCalledWith('kumusta', {
      language: 'fil',
      onDone: expect.any(Function),
      onError: expect.any(Function),
    });
  });

  it('calls Speech.stop', () => {
    stop();
    expect(Speech.stop).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest services/speech.test.ts --no-cache
```

Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

Create `voxlingo/services/speech.ts`:

```typescript
import * as Speech from 'expo-speech';

const LANG_MAP: Record<string, string> = {
  zh: 'zh-CN',
  tl: 'fil',
};

export function toBcp47(langCode: string): string {
  return LANG_MAP[langCode] || langCode;
}

type SpeakOptions = {
  onDone?: () => void;
};

export function speak(text: string, langCode: string, options?: SpeakOptions): void {
  try {
    Speech.speak(text, {
      language: toBcp47(langCode),
      onDone: options?.onDone,
      onError: () => {
        // Silently fail — translation text is still visible
        options?.onDone?.();
      },
    });
  } catch {
    // expo-speech not available — silently fail
    options?.onDone?.();
  }
}

export function stop(): void {
  try {
    Speech.stop();
  } catch {
    // Silently fail
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest services/speech.test.ts --no-cache
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/services/speech.ts voxlingo/services/speech.test.ts voxlingo/package.json voxlingo/package-lock.json
git commit -m "feat: add speech service wrapping expo-speech with language mapping"
```

---

### Task 2: Add speakingId, auto-speak, and replay to useTranslation hook

**Files:**
- Modify: `voxlingo/hooks/useTranslation.ts`
- Modify: `voxlingo/hooks/useTranslation.test.ts`

- [ ] **Step 1: Add tests for TTS behavior**

Add these tests to the existing `voxlingo/hooks/useTranslation.test.ts`. Add the speech mock at the top alongside the existing mocks, and add three new test cases at the end of the `describe` block.

Add this mock after the existing `jest.mock('../services/translate', ...)`:

```typescript
jest.mock('../services/speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));
```

Add these test cases inside the existing `describe('useTranslation', ...)`:

```typescript
  it('auto-speaks translation after it arrives', async () => {
    const { speak } = require('../services/speech');
    const { result } = renderHook(() => useTranslation());

    // Start recording
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });
    // Stop recording — triggers translation + auto-speak
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });

    expect(speak).toHaveBeenCalledWith('hola', 'es', { onDone: expect.any(Function) });
    expect(result.current.speakingId).toBe(result.current.translations[0].id);
  });

  it('replay stops current speech and speaks the requested translation', async () => {
    const { speak, stop } = require('../services/speech');
    const { result } = renderHook(() => useTranslation());

    // Create a translation first
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });

    const translationId = result.current.translations[0].id;

    // Replay it
    await act(async () => {
      result.current.replay(translationId);
    });

    expect(stop).toHaveBeenCalled();
    expect(speak).toHaveBeenLastCalledWith('hola', 'es', { onDone: expect.any(Function) });
    expect(result.current.speakingId).toBe(translationId);
  });

  it('clears speakingId when speech finishes', async () => {
    const { speak } = require('../services/speech');
    // Capture the onDone callback
    speak.mockImplementation((_text: string, _lang: string, opts: { onDone?: () => void }) => {
      // Immediately call onDone to simulate speech finishing
      opts?.onDone?.();
    });

    const { result } = renderHook(() => useTranslation());

    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });

    expect(result.current.speakingId).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest hooks/useTranslation.test.ts --no-cache
```

Expected: 3 new tests FAIL (speakingId and replay don't exist yet), 3 old tests still PASS.

- [ ] **Step 3: Update the hook implementation**

Replace the full contents of `voxlingo/hooks/useTranslation.ts` with:

```typescript
import { useState, useCallback, useRef } from 'react';
import { startRecording, stopRecording } from '../services/audio';
import { translateAudio } from '../services/translate';
import { speak, stop } from '../services/speech';
import { Translation } from '../types';

export function useTranslation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const recordingRef = useRef(false);

  const speakTranslation = useCallback((text: string, langCode: string, id: string) => {
    stop();
    setSpeakingId(id);
    speak(text, langCode, {
      onDone: () => setSpeakingId(null),
    });
  }, []);

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
          speakTranslation(result.translatedText, targetLang, translation.id);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Translation failed';
          setError(msg);
        } finally {
          setIsTranslating(false);
        }
      }
    },
    [speakTranslation],
  );

  const replay = useCallback(
    (id: string) => {
      const translation = translations.find((t) => t.id === id);
      if (translation) {
        speakTranslation(translation.translatedText, translation.targetLang, id);
      }
    },
    [translations, speakTranslation],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    isRecording,
    isTranslating,
    translations,
    error,
    speakingId,
    toggleRecord,
    replay,
    clearError,
  };
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest hooks/useTranslation.test.ts --no-cache
```

Expected: 6 tests PASS (3 old + 3 new).

- [ ] **Step 5: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/hooks/useTranslation.ts voxlingo/hooks/useTranslation.test.ts
git commit -m "feat: add auto-speak and replay to useTranslation hook"
```

---

### Task 3: Update TranslationBubble with tap-to-replay and speaker indicator

**Files:**
- Modify: `voxlingo/components/TranslationBubble.tsx`

- [ ] **Step 1: Update TranslationBubble**

Replace the full contents of `voxlingo/components/TranslationBubble.tsx` with:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Translation } from '../types';
import { getLanguageName } from '../constants/languages';

type Props = {
  translation: Translation;
  isSpeaking: boolean;
  onReplay: () => void;
};

export function TranslationBubble({ translation, isSpeaking, onReplay }: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.bubble, styles.sourceBubble]}>
        <Text style={styles.langLabel}>{getLanguageName(translation.sourceLang)}</Text>
        <Text style={styles.text}>{translation.originalText}</Text>
      </View>
      <TouchableOpacity
        style={[styles.bubble, styles.targetBubble]}
        onPress={onReplay}
        activeOpacity={0.7}
      >
        <Text style={styles.langLabel}>{getLanguageName(translation.targetLang)}</Text>
        <View style={styles.targetRow}>
          <Text style={[styles.text, styles.targetText, styles.targetTextFlex]}>
            {translation.translatedText}
          </Text>
          <Text style={styles.speakerIcon}>{isSpeaking ? '🔊' : '🔈'}</Text>
        </View>
      </TouchableOpacity>
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
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetTextFlex: {
    flex: 1,
  },
  speakerIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/components/TranslationBubble.tsx
git commit -m "feat: add tap-to-replay and speaker indicator to TranslationBubble"
```

---

### Task 4: Wire TTS into the main screen

**Files:**
- Modify: `voxlingo/app/index.tsx`

- [ ] **Step 1: Update index.tsx to pass speakingId and replay**

In `voxlingo/app/index.tsx`, make two changes:

**Change 1:** Update the destructured hook return (line 20-21) to include `speakingId` and `replay`:

Replace:
```tsx
  const { isRecording, isTranslating, translations, error, toggleRecord, clearError } =
    useTranslation();
```

With:
```tsx
  const { isRecording, isTranslating, translations, error, speakingId, toggleRecord, replay, clearError } =
    useTranslation();
```

**Change 2:** Update the FlatList renderItem (line 58) to pass the new props:

Replace:
```tsx
        renderItem={({ item }) => <TranslationBubble translation={item} />}
```

With:
```tsx
        renderItem={({ item }) => (
          <TranslationBubble
            translation={item}
            isSpeaking={item.id === speakingId}
            onReplay={() => replay(item.id)}
          />
        )}
```

- [ ] **Step 2: Run all frontend tests**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx jest --no-cache
```

Expected: All tests PASS.

- [ ] **Step 3: Run typecheck**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd c:/Scripts/travelcompanion
git add voxlingo/app/index.tsx
git commit -m "feat: wire TTS auto-play and replay into main screen"
```

---

### Task 5: Manual smoke test

- [ ] **Step 1: Start backend**

```bash
cd c:/Scripts/travelcompanion/voxlingo/server
npm run dev
```

Expected: `VoxLingo server running on port 3001`

- [ ] **Step 2: Start Expo app**

```bash
cd c:/Scripts/travelcompanion/voxlingo
npx expo start --web
```

- [ ] **Step 3: Test auto-play**

1. Select English → Spanish
2. Tap mic, speak "hello", tap mic again
3. Translation appears as bubbles
4. Translation is spoken aloud automatically in Spanish
5. Target bubble shows 🔊 while speaking, 🔈 after done

- [ ] **Step 4: Test tap-to-replay**

1. After translation is done speaking (shows 🔈)
2. Tap the blue target bubble
3. Translation is spoken again
4. Bubble shows 🔊 while replaying

- [ ] **Step 5: Test interruption**

1. While a translation is being spoken, record another phrase
2. When the new translation arrives, old speech stops, new one plays
