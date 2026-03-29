# VoxLingo Meeting Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the meeting mode — continuous multi-speaker audio listening with auto language detection, real-time translated subtitles, and transcript export/share.

**Architecture:** Continuous mic recording via expo-av → audio streams via socket.io to backend → backend forwards to Gemini Live API with meeting-specific system prompt → Gemini detects speakers, languages, transcribes, and translates → results displayed as color-coded subtitles → transcript saved and exportable as .txt/.pdf via expo-sharing.

**Tech Stack:** expo-av (continuous recording), expo-file-system (save transcripts), expo-sharing (share), socket.io (streaming), `@google/genai` (Gemini Live API), React Native (UI)

---

## File Structure

```
hooks/useMeetingStream.ts           — CREATE: Continuous audio streaming hook for meetings
hooks/useMeetingStream.test.ts      — CREATE: Tests
services/transcript.ts              — CREATE: Transcript export/share logic
services/transcript.test.ts         — CREATE: Tests
app/(tabs)/meeting.tsx              — MODIFY: Full meeting screen UI
```

The backend already supports meeting mode — the existing `start-translation` socket event and `GeminiLiveSession` class can be reused with a different system prompt. We'll add a new socket event `start-meeting` to use a meeting-specific prompt.

Additionally:
```
server/index.ts                     — MODIFY: Add start-meeting socket event
```

---

### Task 1: Backend Meeting Socket Event

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Add start-meeting event handler**

In `server/index.ts`, add a new socket event `start-meeting` inside the `io.on("connection")` block, after the existing `start-translation` handler. The meeting prompt tells Gemini to detect speakers and languages.

Add this event handler after the `socket.on("stop-translation", ...)` block:

```typescript
  socket.on(
    "start-meeting",
    async (data: { userLang: string }) => {
      try {
        const existing = activeSessions.get(socket.id);
        if (existing) {
          existing.disconnect();
          activeSessions.delete(socket.id);
        }

        const session = new GeminiLiveSession(
          "auto",
          data.userLang,
          {
            onTranslatedAudio: (audioBase64: string) => {
              socket.emit("translated-audio", { audio: audioBase64 });
            },
            onTranslatedText: (text: string) => {
              socket.emit("meeting-utterance", { text });
            },
            onInputText: (text: string) => {
              socket.emit("meeting-input", { text });
            },
            onError: (error: Error) => {
              socket.emit("translation-error", { message: error.message });
            },
          }
        );

        await session.connect();
        activeSessions.set(socket.id, session);
        socket.emit("translation-ready");
      } catch (error: any) {
        socket.emit("translation-error", {
          message: error.message || "Failed to start meeting session",
        });
      }
    }
  );
```

Also update `GeminiLiveSession` to handle "auto" source language with a meeting-specific prompt. In `server/services/geminiProxy.ts`, modify the `connect()` method's system instruction:

Replace the system instruction building in `connect()` with:

```typescript
    let systemPrompt: string;
    if (this.sourceLang === "auto") {
      systemPrompt = `You are a real-time meeting translator. Listen to continuous audio. For each utterance: detect the speaker (label as Speaker 1, Speaker 2, etc. based on voice characteristics), detect the language they are speaking, provide the original text, and translate to ${targetName}. Respond with the translation spoken in ${targetName}.`;
    } else {
      systemPrompt = `You are a real-time voice translator. The user will speak in ${sourceName}. Translate everything they say into ${targetName}. Speak the translation naturally. Do not add commentary or explanations — only translate.`;
    }

    this.session = await ai.live.connect({
      model: "gemini-2.0-flash-live-001",
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      },
      // ... rest stays the same
```

- [ ] **Step 2: Verify server compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```

- [ ] **Step 3: Run existing tests still pass**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npm test
```

- [ ] **Step 4: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/server/index.ts voxlingo/server/services/geminiProxy.ts
git commit -m "feat: add meeting mode socket event with multi-speaker prompt"
```

---

### Task 2: Meeting Audio Stream Hook

**Files:**
- Create: `hooks/useMeetingStream.ts`
- Create: `hooks/useMeetingStream.test.ts`

- [ ] **Step 1: Write tests**

Create `hooks/useMeetingStream.test.ts`:

```typescript
import { renderHook, act } from "@testing-library/react-native";
import { useMeetingStream } from "./useMeetingStream";

jest.mock("expo-av", () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      startAsync: jest.fn().mockResolvedValue(undefined),
      stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
      getURI: jest.fn().mockReturnValue("file:///mock/recording.wav"),
    })),
  },
}));

const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();
const mockConnect = jest.fn();
jest.mock("../services/gemini", () => ({
  getSocket: jest.fn().mockReturnValue({
    connected: true,
    connect: mockConnect,
    emit: mockEmit,
    on: mockOn,
    off: mockOff,
  }),
}));

describe("useMeetingStream", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() =>
      useMeetingStream({
        onUtterance: jest.fn(),
        onError: jest.fn(),
      })
    );

    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets isListening to true when startListening is called", async () => {
    const { result } = renderHook(() =>
      useMeetingStream({
        onUtterance: jest.fn(),
        onError: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.startListening("en");
    });

    expect(result.current.isListening).toBe(true);
    expect(mockEmit).toHaveBeenCalledWith("start-meeting", { userLang: "en" });
  });

  it("sets isListening to false when stopListening is called", async () => {
    const { result } = renderHook(() =>
      useMeetingStream({
        onUtterance: jest.fn(),
        onError: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.startListening("en");
    });

    await act(async () => {
      await result.current.stopListening();
    });

    expect(result.current.isListening).toBe(false);
  });
});
```

- [ ] **Step 2: Implement useMeetingStream**

Create `hooks/useMeetingStream.ts`:

```typescript
import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import { LanguageCode } from "../types";
import { getSocket } from "../services/gemini";

export interface MeetingUtteranceData {
  speaker: string;
  lang: string;
  original: string;
  translated: string;
  timestamp: number;
}

export interface MeetingStreamCallbacks {
  onUtterance: (utterance: MeetingUtteranceData) => void;
  onError: (error: Error) => void;
}

export function useMeetingStream(callbacks: MeetingStreamCallbacks) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startListening = useCallback(
    async (userLang: LanguageCode) => {
      try {
        setError(null);

        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          setError("Microphone permission denied");
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const socket = getSocket();
        if (!socket.connected) {
          socket.connect();
        }

        // Listen for meeting events
        socket.off("meeting-utterance");
        socket.off("meeting-input");
        socket.off("translation-error");

        socket.on("meeting-utterance", (data: { text: string }) => {
          const utterance: MeetingUtteranceData = {
            speaker: "Speaker",
            lang: "auto",
            original: "",
            translated: data.text,
            timestamp: Date.now(),
          };
          callbacks.onUtterance(utterance);
        });

        socket.on("meeting-input", (data: { text: string }) => {
          const utterance: MeetingUtteranceData = {
            speaker: "Speaker",
            lang: "auto",
            original: data.text,
            translated: "",
            timestamp: Date.now(),
          };
          callbacks.onUtterance(utterance);
        });

        socket.on("translation-error", (data: { message: string }) => {
          callbacks.onError(new Error(data.message));
        });

        socket.emit("start-meeting", { userLang });

        // Start continuous recording
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync({
          android: {
            extension: ".wav",
            outputFormat: 2,
            audioEncoder: 1,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 256000,
          },
          ios: {
            extension: ".wav",
            outputFormat: "linearPCM" as any,
            audioQuality: 127,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 256000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {},
        });

        recordingRef.current = recording;
        await recording.startAsync();

        // Send audio chunks every 1 second
        chunkIntervalRef.current = setInterval(async () => {
          if (!recordingRef.current) return;
          try {
            // Stop current recording, send it, start new one
            const currentRecording = recordingRef.current;
            await currentRecording.stopAndUnloadAsync();
            const uri = currentRecording.getURI();

            if (uri) {
              const response = await fetch(uri);
              const blob = await response.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(",")[1];
                if (base64) {
                  socket.emit("audio-stream", { audio: base64 });
                }
              };
              reader.readAsDataURL(blob);
            }

            // Start new recording
            const newRecording = new Audio.Recording();
            await newRecording.prepareToRecordAsync({
              android: {
                extension: ".wav",
                outputFormat: 2,
                audioEncoder: 1,
                sampleRate: 16000,
                numberOfChannels: 1,
                bitRate: 256000,
              },
              ios: {
                extension: ".wav",
                outputFormat: "linearPCM" as any,
                audioQuality: 127,
                sampleRate: 16000,
                numberOfChannels: 1,
                bitRate: 256000,
                linearPCMBitDepth: 16,
                linearPCMIsBigEndian: false,
                linearPCMIsFloat: false,
              },
              web: {},
            });
            recordingRef.current = newRecording;
            await newRecording.startAsync();
          } catch (e) {
            console.warn("Chunk recording error:", e);
          }
        }, 1000);

        // Session timer
        setDuration(0);
        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);

        setIsListening(true);
      } catch (err: any) {
        setError(err.message || "Failed to start meeting");
        callbacks.onError(err);
      }
    },
    [callbacks]
  );

  const stopListening = useCallback(async () => {
    try {
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
        chunkIntervalRef.current = null;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      const socket = getSocket();
      socket.emit("stop-translation");
      socket.off("meeting-utterance");
      socket.off("meeting-input");
      socket.off("translation-error");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      setIsListening(false);
    } catch (err: any) {
      setError(err.message || "Failed to stop meeting");
    }
  }, []);

  return {
    isListening,
    error,
    duration,
    startListening,
    stopListening,
  };
}
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test -- hooks/useMeetingStream.test.ts --no-cache
```
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/hooks/useMeetingStream.ts voxlingo/hooks/useMeetingStream.test.ts
git commit -m "feat: implement continuous meeting audio stream hook"
```

---

### Task 3: Transcript Export Service

**Files:**
- Create: `services/transcript.ts`
- Create: `services/transcript.test.ts`

- [ ] **Step 1: Write tests**

Create `services/transcript.test.ts`:

```typescript
import { formatTranscriptAsText } from "./transcript";

describe("formatTranscriptAsText", () => {
  it("formats utterances as readable text", () => {
    const entries = [
      {
        speaker: "Speaker 1",
        lang: "en",
        original: "Hello everyone",
        translated: "Hallo allemaal",
        timestamp: 0,
      },
      {
        speaker: "Speaker 2",
        lang: "nl",
        original: "Goedemorgen",
        translated: "Good morning",
        timestamp: 5000,
      },
    ];

    const result = formatTranscriptAsText(entries, 10);

    expect(result).toContain("Speaker 1");
    expect(result).toContain("Hello everyone");
    expect(result).toContain("Hallo allemaal");
    expect(result).toContain("Speaker 2");
    expect(result).toContain("Duration: 0:10");
  });

  it("handles empty entries", () => {
    const result = formatTranscriptAsText([], 0);
    expect(result).toContain("VoxLingo Meeting Transcript");
    expect(result).toContain("No utterances recorded");
  });
});
```

- [ ] **Step 2: Implement transcript service**

Create `services/transcript.ts`:

```typescript
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { TranscriptEntry } from "../types";

export function formatTranscriptAsText(
  entries: TranscriptEntry[],
  durationSeconds: number
): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const durationStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  let text = "VoxLingo Meeting Transcript\n";
  text += `Date: ${new Date().toLocaleDateString()}\n`;
  text += `Duration: ${durationStr}\n`;
  text += "─".repeat(40) + "\n\n";

  if (entries.length === 0) {
    text += "No utterances recorded.\n";
    return text;
  }

  for (const entry of entries) {
    text += `[${entry.speaker}] (${entry.lang})\n`;
    if (entry.original) {
      text += `  Original: ${entry.original}\n`;
    }
    if (entry.translated) {
      text += `  Translated: ${entry.translated}\n`;
    }
    text += "\n";
  }

  return text;
}

export async function saveTranscriptToFile(content: string): Promise<string> {
  const filename = `voxlingo-transcript-${Date.now()}.txt`;
  const filePath = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(filePath, content);
  return filePath;
}

export async function shareTranscript(filePath: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("Sharing is not available on this device");
  }
  await Sharing.shareAsync(filePath, {
    mimeType: "text/plain",
    dialogTitle: "Share Meeting Transcript",
  });
}

export async function exportAndShareTranscript(
  entries: TranscriptEntry[],
  durationSeconds: number
): Promise<void> {
  const content = formatTranscriptAsText(entries, durationSeconds);
  const filePath = await saveTranscriptToFile(content);
  await shareTranscript(filePath);
}
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test -- services/transcript.test.ts --no-cache
```
Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/services/transcript.ts voxlingo/services/transcript.test.ts
git commit -m "feat: implement transcript export and share service"
```

---

### Task 4: Meeting Screen UI

**Files:**
- Modify: `app/(tabs)/meeting.tsx`

- [ ] **Step 1: Implement full meeting screen**

Replace `app/(tabs)/meeting.tsx` with:

```typescript
import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { LanguageCode, TranscriptEntry } from "../../types";
import { DEFAULT_TARGET_LANG } from "../../constants/languages";
import { LanguagePicker } from "../../components/LanguagePicker";
import { SubtitleOverlay } from "../../components/SubtitleOverlay";
import {
  useMeetingStream,
  MeetingUtteranceData,
} from "../../hooks/useMeetingStream";
import { exportAndShareTranscript } from "../../services/transcript";

const SPEAKER_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

function getSpeakerColor(speaker: string, speakerMap: Map<string, number>): string {
  if (!speakerMap.has(speaker)) {
    speakerMap.set(speaker, speakerMap.size);
  }
  const index = speakerMap.get(speaker)!;
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MeetingScreen() {
  const [userLang, setUserLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const [utterances, setUtterances] = useState<TranscriptEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const speakerMapRef = useRef(new Map<string, number>());

  const { isListening, error, duration, startListening, stopListening } =
    useMeetingStream({
      onUtterance: (data: MeetingUtteranceData) => {
        const entry: TranscriptEntry = {
          speaker: data.speaker,
          lang: data.lang as LanguageCode,
          original: data.original,
          translated: data.translated,
          timestamp: data.timestamp,
        };
        setUtterances((prev) => [...prev, entry]);
      },
      onError: (err: Error) => {
        console.error("Meeting error:", err);
      },
    });

  const handleToggleSession = useCallback(async () => {
    if (isListening) {
      await stopListening();
    } else {
      speakerMapRef.current.clear();
      await startListening(userLang);
    }
  }, [isListening, userLang, startListening, stopListening]);

  const handleExport = useCallback(async () => {
    if (utterances.length === 0) {
      Alert.alert("No transcript", "Start a meeting session first.");
      return;
    }

    try {
      setIsExporting(true);
      await exportAndShareTranscript(utterances, duration);
    } catch (err: any) {
      Alert.alert("Export failed", err.message);
    } finally {
      setIsExporting(false);
    }
  }, [utterances, duration]);

  const handleClear = useCallback(() => {
    setUtterances([]);
    speakerMapRef.current.clear();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <LanguagePicker
          selectedLang={userLang}
          onSelect={setUserLang}
          label="My language"
        />
        {isListening && (
          <View style={styles.timerContainer}>
            <View style={styles.liveDot} />
            <Text style={styles.timerText}>{formatDuration(duration)}</Text>
          </View>
        )}
      </View>

      {/* Subtitle List */}
      <FlatList
        ref={flatListRef}
        style={styles.subtitleList}
        data={utterances}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <SubtitleOverlay
            speaker={item.speaker}
            originalText={item.original}
            translatedText={item.translated}
            color={getSpeakerColor(item.speaker, speakerMapRef.current)}
          />
        )}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Meeting Mode</Text>
            <Text style={styles.emptyText}>
              Start a session to get real-time translated subtitles from
              multiple speakers
            </Text>
          </View>
        }
      />

      {/* Error */}
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExport}
          disabled={isExporting || utterances.length === 0}
        >
          <Text
            style={[
              styles.exportText,
              utterances.length === 0 && styles.disabledText,
            ]}
          >
            {isExporting ? "Exporting..." : "Export & Share"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sessionButton,
            isListening && styles.sessionButtonStop,
          ]}
          onPress={handleToggleSession}
          activeOpacity={0.7}
        >
          <Text style={styles.sessionButtonText}>
            {isListening ? "Stop Session" : "Start Session"}
          </Text>
        </TouchableOpacity>

        {utterances.length > 0 && !isListening && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  timerText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ef4444",
    fontVariant: ["tabular-nums"],
  },
  subtitleList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 22,
  },
  errorBar: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  sessionButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sessionButtonStop: {
    backgroundColor: "#ef4444",
  },
  sessionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  exportButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: "#f3f4f6",
  },
  exportText: {
    color: "#1f2937",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledText: {
    color: "#9ca3af",
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: "#f3f4f6",
  },
  clearText: {
    color: "#6b7280",
    fontSize: 14,
  },
});
```

- [ ] **Step 2: Verify frontend compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/app/\(tabs\)/meeting.tsx
git commit -m "feat: implement meeting screen with live subtitles and transcript export"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run all frontend tests**

```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test
```

- [ ] **Step 2: Run all backend tests**

```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npm test
```

- [ ] **Step 3: Typecheck frontend**

```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

- [ ] **Step 4: Typecheck backend**

```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```

- [ ] **Step 5: Push to GitHub**

```bash
cd /c/Scripts/travelcompanion
git push origin main
```
