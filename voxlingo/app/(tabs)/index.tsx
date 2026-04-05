import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../../hooks/useTranslation';
import { LanguagePicker } from '../../components/LanguagePicker';
import { TranslationBubble } from '../../components/TranslationBubble';
import { RecordButton } from '../../components/RecordButton';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Translation } from '../../types';
import { colors, spacing, radius, shadow } from '../../constants/theme';

export default function TravelScreen() {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const { isRecording, isTranslating, translations, error, speakingId, toggleRecord, replay, clearError } =
    useTranslation();
  const flatListRef = useRef<FlatList>(null);

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleRecord = () => {
    toggleRecord(sourceLang, targetLang);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.header}>VoxLingo</Text>
        <Text style={styles.tagline}>Voice Translation</Text>
      </View>

      <ErrorBanner message={error} onDismiss={clearError} />

      <View style={styles.languageCard}>
        <View style={styles.languageBar}>
          <LanguagePicker
            selectedCode={sourceLang}
            onSelect={setSourceLang}
            label="From"
          />
          <TouchableOpacity onPress={handleSwapLanguages} style={styles.swapButton}>
            <Text style={styles.swapIcon}>⇄</Text>
          </TouchableOpacity>
          <LanguagePicker
            selectedCode={targetLang}
            onSelect={setTargetLang}
            label="To"
          />
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        style={styles.list}
        data={translations}
        keyExtractor={(item: Translation) => item.id}
        onContentSizeChange={() => {
          if (translations.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
        renderItem={({ item }) => (
          <TranslationBubble
            translation={item}
            isSpeaking={item.id === speakingId}
            onReplay={() => replay(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌍</Text>
            <Text style={styles.emptyTitle}>Ready to translate</Text>
            <Text style={styles.emptyText}>
              Tap the microphone and start speaking
            </Text>
          </View>
        }
        contentContainerStyle={translations.length === 0 ? styles.emptyContainer : styles.listContent}
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
    backgroundColor: colors.background,
  },
  headerBar: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  languageCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow('sm'),
  },
  languageBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    marginTop: spacing.lg,
  },
  swapIcon: {
    fontSize: 18,
    color: colors.primary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
