// voxlingo/app/(tabs)/index.tsx
import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import { ArrowLeftRight, Settings, List } from "lucide-react-native";
import { LanguageCode, Translation } from "../../types";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
  getLanguageName,
} from "../../constants/languages";
import { LanguagePicker } from "../../components/LanguagePicker";
import { TranslationBubble } from "../../components/TranslationBubble";
import { AudioWaveform } from "../../components/AudioWaveform";
import { ErrorBanner } from "../../components/ErrorBanner";
import { useAudioStream } from "../../hooks/useAudioStream";
import { useTranslation } from "../../hooks/useTranslation";
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  fontFamily,
  fontSize,
  letterSpacing,
} from "../../theme";

export default function TravelScreen() {
  const [sourceLang, setSourceLang] = useState<LanguageCode>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const flatListRef = useRef<FlatList>(null);

  const {
    translations,
    isTranslating,
    addTranslation,
    upsertTranslation,
    clearTranslations,
    setTranslating,
  } = useTranslation(sourceLang, targetLang);

  const playAudioWeb = useCallback(async (pcmBase64: string) => {
    try {
      const pcmBytes = Uint8Array.from(atob(pcmBase64), (c) => c.charCodeAt(0));
      const sampleRate = 24000; // Gemini outputs 24kHz audio
      const numChannels = 1;
      const bitsPerSample = 16;
      const dataLength = pcmBytes.length;
      const headerLength = 44;
      const wav = new ArrayBuffer(headerLength + dataLength);
      const view = new DataView(wav);

      // WAV header
      const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeString(0, "RIFF");
      view.setUint32(4, 36 + dataLength, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
      view.setUint16(32, numChannels * (bitsPerSample / 8), true);
      view.setUint16(34, bitsPerSample, true);
      writeString(36, "data");
      view.setUint32(40, dataLength, true);
      new Uint8Array(wav, headerLength).set(pcmBytes);

      const audioCtx = new AudioContext({ sampleRate });
      const audioBuffer = await audioCtx.decodeAudioData(wav);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
      source.onended = () => audioCtx.close();
    } catch (e) {
      console.warn("Web audio playback error:", e);
    }
  }, []);

  // Cancel any in-progress TTS before speaking new text
  const speakTranslation = useCallback((text: string, lang: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Stop previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "zh" ? "zh-CN" : lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const { isRecording, error, startRecording, stopRecording } = useAudioStream({
    onTranslatedAudio: async (audioBase64: string) => {
      try {
        if (Platform.OS === "web") {
          await playAudioWeb(audioBase64);
        } else {
          const { sound } = await Audio.Sound.createAsync({
            uri: `data:audio/pcm;base64,${audioBase64}`,
          });
          await sound.playAsync();
          sound.setOnPlaybackStatusUpdate((status) => {
            if ("didJustFinish" in status && status.didJustFinish) {
              sound.unloadAsync();
            }
          });
        }
      } catch (e) {
        console.warn("Audio playback error:", e);
      }
    },
    onTranslatedText: (text: string) => {
      const translation: Translation = {
        id: Date.now().toString(),
        sourceLang,
        targetLang,
        originalText: "",
        translatedText: text,
        mode: "travel",
        timestamp: Date.now(),
        cached: false,
      };
      addTranslation(translation);
      setTranslating(false);
      speakTranslation(text, targetLang);
    },
    onInputText: (text: string) => {
      // Server sends full accumulated transcription — upsert to update in place
      upsertTranslation({
        id: "live-input",
        sourceLang,
        targetLang,
        originalText: text,
        translatedText: "",
        mode: "travel",
        timestamp: Date.now(),
        cached: false,
      });
    },
    onError: (err: Error) => {
      console.error("Translation error:", err);
      setTranslating(false);
    },
  });

  const handleSwapLanguages = useCallback(() => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  }, [sourceLang, targetLang]);

  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
      setTranslating(false);
    } else {
      setTranslating(true);
      await startRecording(sourceLang, targetLang);
    }
  }, [isRecording, sourceLang, targetLang, startRecording, stopRecording, setTranslating]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const hasConversation = translations.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>VoxLingo</Text>
        <View style={styles.headerActions}>
          {hasConversation && (
            <TouchableOpacity style={styles.headerButton} onPress={clearTranslations}>
              <List size={16} color={colors.textSubtle} strokeWidth={2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerButton}>
            <Settings size={16} color={colors.textSubtle} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Bar */}
      {!isRecording && (
        <View style={styles.languageBar}>
          {hasConversation ? (
            <View style={styles.compactLangChip}>
              <Text style={styles.compactLangFrom}>
                {getLanguageName(sourceLang).substring(0, 2).toUpperCase()}
              </Text>
              <Text style={styles.compactLangArrow}>→</Text>
              <Text style={styles.compactLangTo}>
                {getLanguageName(targetLang).substring(0, 2).toUpperCase()}
              </Text>
            </View>
          ) : (
            <>
              <LanguagePicker selectedLang={sourceLang} onSelect={setSourceLang} label="From" />
              <TouchableOpacity style={styles.swapButton} onPress={handleSwapLanguages}>
                <ArrowLeftRight size={16} color={colors.white} strokeWidth={2.5} />
              </TouchableOpacity>
              <LanguagePicker selectedLang={targetLang} onSelect={setTargetLang} label="To" />
            </>
          )}
        </View>
      )}

      {/* Chat / Waveform Area */}
      {isRecording ? (
        <View style={styles.recordingArea}>
          <AudioWaveform isActive={true} />
          <Text style={styles.listeningLabel}>Listening...</Text>
          <Text style={styles.releaseHint}>Release to translate</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          style={styles.chatContainer}
          contentContainerStyle={translations.length === 0 ? styles.chatEmpty : undefined}
          data={translations}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          renderItem={({ item }) => (
            <View>
              {item.originalText !== "" && (
                <TranslationBubble
                  text={item.originalText}
                  isSource={true}
                  timestamp={formatTime(item.timestamp)}
                />
              )}
              {item.translatedText !== "" && (
                <TranslationBubble
                  text={item.translatedText}
                  isSource={false}
                  timestamp={formatTime(item.timestamp)}
                />
              )}
            </View>
          )}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>💬</Text>
              </View>
              <Text style={styles.emptyTitle}>Start a conversation</Text>
              <Text style={styles.emptySubtitle}>Tap the mic or type a phrase</Text>
            </View>
          }
        />
      )}

      {/* Error */}
      {error && <ErrorBanner message={error} />}

      {/* Bottom Input Bar */}
      <View style={styles.bottomBar}>
        {isRecording ? (
          <View style={styles.recordingControls}>
            <TouchableOpacity onPress={() => { stopRecording(); setTranslating(false); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.micButton, styles.micButtonStop]}
              onPress={handleMicPress}
            >
              <View style={styles.stopSquare} />
            </TouchableOpacity>
            <View style={{ width: 48 }} />
          </View>
        ) : (
          <View style={styles.inputRow}>
            <View style={styles.textInputWrap}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a phrase..."
                placeholderTextColor={colors.textDim}
              />
            </View>
            <TouchableOpacity
              style={[styles.micButton, styles.micButtonIdle]}
              onPress={handleMicPress}
              activeOpacity={0.7}
            >
              <Text style={styles.micEmoji}>🎤</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  logo: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.heading,
    color: colors.accentBlue,
    letterSpacing: letterSpacing.display,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.bgElevated,
  },
  languageBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accentBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    ...shadows.glowSm,
  },
  compactLangChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.bgElevated,
    gap: spacing.sm,
  },
  compactLangFrom: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  compactLangArrow: {
    fontSize: 10,
    color: colors.accentBlue,
  },
  compactLangTo: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentCyan,
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  chatEmpty: {
    flex: 1,
  },
  recordingArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },
  listeningLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accentBlue,
    marginTop: spacing.lg,
  },
  releaseHint: {
    fontSize: fontSize.caption,
    color: colors.textDim,
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.bgElevated,
    marginBottom: spacing.lg,
  },
  emptyIconText: {
    fontSize: 28,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textDim,
  },
  emptySubtitle: {
    fontSize: fontSize.caption,
    color: colors.bgElevated,
    marginTop: spacing.xs,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.bgSurface,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  textInputWrap: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.bgElevated,
  },
  textInput: {
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonIdle: {
    backgroundColor: colors.accentBlue,
    ...shadows.glowMd,
  },
  micButtonStop: {
    backgroundColor: colors.error,
    width: 60,
    height: 60,
    ...shadows.glowError,
  },
  micEmoji: {
    fontSize: 22,
  },
  stopSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  recordingControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  cancelText: {
    fontSize: 13,
    color: colors.textMuted,
    padding: spacing.sm,
  },
});
