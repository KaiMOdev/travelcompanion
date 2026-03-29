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
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
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
