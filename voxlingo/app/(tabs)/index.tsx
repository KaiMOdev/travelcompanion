import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Audio } from "expo-av";
import { LanguageCode, Translation } from "../../types";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
} from "../../constants/languages";
import { LanguagePicker } from "../../components/LanguagePicker";
import { TranslationBubble } from "../../components/TranslationBubble";
import { AudioWaveform } from "../../components/AudioWaveform";
import { useAudioStream } from "../../hooks/useAudioStream";
import { useTranslation } from "../../hooks/useTranslation";

export default function TravelScreen() {
  const [sourceLang, setSourceLang] = useState<LanguageCode>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const flatListRef = useRef<FlatList>(null);

  const {
    translations,
    isTranslating,
    addTranslation,
    clearTranslations,
    setTranslating,
  } = useTranslation(sourceLang, targetLang);

  const { isRecording, error, startRecording, stopRecording } = useAudioStream({
    onTranslatedAudio: async (audioBase64: string) => {
      try {
        const { sound } = await Audio.Sound.createAsync({
          uri: `data:audio/pcm;base64,${audioBase64}`,
        });
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if ("didJustFinish" in status && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
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
    },
    onInputText: (text: string) => {
      const translation: Translation = {
        id: `input-${Date.now()}`,
        sourceLang,
        targetLang,
        originalText: text,
        translatedText: "",
        mode: "travel",
        timestamp: Date.now(),
        cached: false,
      };
      addTranslation(translation);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Language Selectors */}
      <View style={styles.languageBar}>
        <LanguagePicker
          selectedLang={sourceLang}
          onSelect={setSourceLang}
          label="From"
        />
        <TouchableOpacity
          style={styles.swapButton}
          onPress={handleSwapLanguages}
        >
          <Text style={styles.swapIcon}>⇄</Text>
        </TouchableOpacity>
        <LanguagePicker
          selectedLang={targetLang}
          onSelect={setTargetLang}
          label="To"
        />
      </View>

      {/* Translation Chat */}
      <FlatList
        ref={flatListRef}
        style={styles.chatContainer}
        data={translations}
        keyExtractor={(item) => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        renderItem={({ item }) => (
          <View>
            {item.originalText !== "" && (
              <TranslationBubble text={item.originalText} isSource={true} />
            )}
            {item.translatedText !== "" && (
              <TranslationBubble text={item.translatedText} isSource={false} />
            )}
          </View>
        )}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Tap the microphone to start translating
            </Text>
          </View>
        }
      />

      {/* Error Display */}
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Mic Button */}
      <View style={styles.micContainer}>
        <AudioWaveform isActive={isRecording} />
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPress={handleMicPress}
          activeOpacity={0.7}
        >
          <Text style={styles.micIcon}>{isRecording ? "⏹" : "🎤"}</Text>
        </TouchableOpacity>
        {isTranslating && !isRecording && (
          <Text style={styles.translatingText}>Translating...</Text>
        )}
        {translations.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearTranslations}
          >
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
  languageBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  swapIcon: {
    fontSize: 20,
    color: "#3b82f6",
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
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
  micContainer: {
    alignItems: "center",
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 8,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  micButtonActive: {
    backgroundColor: "#ef4444",
  },
  micIcon: {
    fontSize: 28,
  },
  translatingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  clearButton: {
    position: "absolute",
    right: 24,
    bottom: 40,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  clearText: {
    fontSize: 14,
    color: "#6b7280",
  },
});
