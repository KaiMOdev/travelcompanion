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
import { ShowCard } from '../../components/ShowCard';
import { Translation } from '../../types';
import { colors, spacing, radius, shadow } from '../../constants/theme';
import { setSlowMode, getSlowMode } from '../../services/speech';

export default function TravelScreen() {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const { isRecording, isTranslating, translations, error, speakingId, toggleRecord, replay, clearError } =
    useTranslation();
  const flatListRef = useRef<FlatList>(null);
  const [showCardItem, setShowCardItem] = useState<Translation | null>(null);
  const [slowSpeech, setSlowSpeech] = useState(getSlowMode());

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleRecord = () => {
    toggleRecord(sourceLang, targetLang);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>VoxLingo</Text>
              <Text style={styles.headerSub}>Voice Translation</Text>
            </View>
            <TouchableOpacity
              style={[styles.slowButton, slowSpeech && styles.slowButtonActive]}
              onPress={() => {
                const next = !slowSpeech;
                setSlowSpeech(next);
                setSlowMode(next);
              }}
            >
              <Text style={styles.slowIcon}>{slowSpeech ? '🐢' : '🐇'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.body}>
        <ErrorBanner message={error} onDismiss={clearError} />

        <View style={styles.languageCard}>
          <View style={styles.languageBar}>
            <LanguagePicker
              selectedCode={sourceLang}
              onSelect={setSourceLang}
              label="FROM"
            />
            <TouchableOpacity onPress={handleSwapLanguages} style={styles.swapButton}>
              <Text style={styles.swapIcon}>⇄</Text>
            </TouchableOpacity>
            <LanguagePicker
              selectedCode={targetLang}
              onSelect={setTargetLang}
              label="TO"
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
              onShowCard={() => setShowCardItem(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyCircle}>
                <Text style={styles.emptyIcon}>🎙️</Text>
              </View>
              <Text style={styles.emptyTitle}>Ready to translate</Text>
              <Text style={styles.emptyText}>
                Tap the mic below and speak naturally
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
      </View>

      <ShowCard
        translation={showCardItem}
        onClose={() => setShowCardItem(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBlock: {
    backgroundColor: colors.headerBg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: colors.headerSubtext,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  slowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slowButtonActive: {
    backgroundColor: colors.secondary,
  },
  slowIcon: {
    fontSize: 24,
  },
  body: {
    flex: 1,
  },
  languageCard: {
    marginHorizontal: spacing.lg,
    marginTop: -spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow('md'),
  },
  languageBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    marginTop: spacing.lg,
    ...shadow('glow'),
  },
  swapIcon: {
    fontSize: 18,
    color: colors.textOnPrimary,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyIcon: {
    fontSize: 36,
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
