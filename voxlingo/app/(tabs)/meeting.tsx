// voxlingo/app/(tabs)/meeting.tsx
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
import { Globe } from "lucide-react-native";
import { LanguageCode, TranscriptEntry } from "../../types";
import { DEFAULT_TARGET_LANG } from "../../constants/languages";
import { LanguagePicker } from "../../components/LanguagePicker";
import { SubtitleOverlay } from "../../components/SubtitleOverlay";
import { ErrorBanner } from "../../components/ErrorBanner";
import {
  useMeetingStream,
  MeetingUtteranceData,
} from "../../hooks/useMeetingStream";
import { exportAndShareTranscript } from "../../services/transcript";
import {
  colors,
  speakerColors,
  spacing,
  borderRadius,
  shadows,
  fontFamily,
  fontSize,
} from "../../theme";

function getSpeakerColor(speaker: string, speakerMap: Map<string, number>): string {
  if (!speakerMap.has(speaker)) {
    speakerMap.set(speaker, speakerMap.size);
  }
  const index = speakerMap.get(speaker)!;
  return speakerColors[index % speakerColors.length].start;
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Meeting</Text>
        {isListening && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.timerText}>{formatDuration(duration)}</Text>
          </View>
        )}
      </View>

      {/* Target language */}
      {!isListening ? (
        <View style={styles.langSection}>
          <Text style={styles.langLabel}>TRANSLATE TO</Text>
          <LanguagePicker selectedLang={userLang} onSelect={setUserLang} />
        </View>
      ) : (
        <View style={styles.langCompact}>
          <Globe size={12} color={colors.accentCyan} strokeWidth={2} />
          <Text style={styles.langCompactLabel}>Translating to</Text>
          <Text style={styles.langCompactValue}>
            {userLang.toUpperCase()}
          </Text>
        </View>
      )}

      {/* Subtitle list */}
      <FlatList
        ref={flatListRef}
        style={styles.subtitleList}
        contentContainerStyle={utterances.length === 0 ? styles.subtitleEmpty : undefined}
        data={utterances}
        keyExtractor={(_, index) => index.toString()}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        renderItem={({ item, index }) => (
          <SubtitleOverlay
            speaker={item.speaker}
            originalText={item.original}
            translatedText={item.translated}
            speakerColor={getSpeakerColor(item.speaker, speakerMapRef.current)}
            timestamp={new Date(item.timestamp).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
            isActive={isListening && index === utterances.length - 1}
          />
        )}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>👥</Text>
            </View>
            <Text style={styles.emptyTitle}>Ready to translate</Text>
            <Text style={styles.emptySubtext}>
              Start a session to capture{"\n"}multi-speaker conversations
            </Text>
          </View>
        }
      />

      {/* Error */}
      {error && <ErrorBanner message={error} />}

      {/* Bottom controls */}
      <View style={styles.controls}>
        {isListening ? (
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleExport}
              disabled={isExporting}
            >
              <Text style={styles.secondaryBtnText}>
                {isExporting ? "..." : "Export"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopBtn} onPress={handleToggleSession}>
              <View style={styles.stopSquare} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleExport}>
              <Text style={styles.secondaryBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.controlColumn}>
            {utterances.length > 0 && (
              <View style={styles.controlRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleExport}>
                  <Text style={styles.secondaryBtnText}>Export</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleExport}>
                  <Text style={styles.secondaryBtnText}>Share</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleToggleSession}
              activeOpacity={0.7}
            >
              <Text style={styles.startBtnText}>
                {utterances.length > 0 ? "New Session" : "Start Session"}
              </Text>
            </TouchableOpacity>
            {utterances.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearText}>Clear transcript</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.displayMedium, fontSize: fontSize.heading, color: colors.textPrimary,
  },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: "rgba(16, 185, 129, 0.15)", paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  timerText: { color: colors.success, fontSize: 11, fontWeight: "600", fontVariant: ["tabular-nums"] },
  langSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  langLabel: {
    fontSize: fontSize.label, color: colors.textMuted, textTransform: "uppercase",
    letterSpacing: 1.5, fontWeight: "600", marginBottom: spacing.sm,
  },
  langCompact: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  langCompactLabel: { color: colors.textMuted, fontSize: 11 },
  langCompactValue: { color: colors.accentCyan, fontSize: 11, fontWeight: "600" },
  subtitleList: { flex: 1, paddingHorizontal: spacing.lg },
  subtitleEmpty: { flex: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyIcon: {
    width: 80, height: 80, borderRadius: borderRadius.full, backgroundColor: colors.bgSurface,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.bgElevated,
  },
  emptyIconText: { fontSize: 36, opacity: 0.3 },
  emptyTitle: { fontSize: fontSize.body, fontWeight: "500", color: colors.textDim },
  emptySubtext: { fontSize: 13, color: colors.bgElevated, textAlign: "center", marginTop: spacing.xs },
  controls: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderTopColor: colors.bgSurface },
  controlRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md },
  controlColumn: { alignItems: "center", gap: spacing.md },
  secondaryBtn: {
    flex: 1, backgroundColor: colors.bgSurface, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.bgElevated,
  },
  secondaryBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: "500" },
  stopBtn: {
    width: 52, height: 52, borderRadius: borderRadius.full, backgroundColor: colors.error,
    alignItems: "center", justifyContent: "center", ...shadows.glowError,
  },
  stopSquare: { width: 18, height: 18, borderRadius: 3, backgroundColor: colors.white },
  startBtn: {
    width: "100%", backgroundColor: colors.accentBlue, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: "center", ...shadows.glowMd,
  },
  startBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  clearText: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
});
