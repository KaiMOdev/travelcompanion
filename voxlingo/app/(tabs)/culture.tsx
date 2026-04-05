import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { usePhrases } from '../../hooks/usePhrases';
import { useTips } from '../../hooks/useTips';
import { useCulture } from '../../hooks/useCulture';
import { CategoryChips } from '../../components/CategoryChips';
import { CultureCard } from '../../components/CultureCard';
import { PhraseCard } from '../../components/PhraseCard';
import { TipCard } from '../../components/TipCard';
import { DestinationPicker } from '../../components/DestinationPicker';
import { CultureCategory, CultureEntry, Phrase, CulturalTip } from '../../types';
import { colors, spacing, radius, typography, shadow } from '../../constants/theme';
import { speak } from '../../services/speech';
import { getDestination } from '../../constants/destinations';

const CATEGORIES: { key: CultureCategory; label: string }[] = [
  { key: 'phrases', label: 'Phrases' },
  { key: 'tips', label: 'Tips' },
  { key: 'dos-donts', label: "Do's & Don'ts" },
  { key: 'gestures', label: 'Gestures' },
  { key: 'food', label: 'Food' },
  { key: 'tipping', label: 'Tipping' },
  { key: 'sacred-sites', label: 'Sacred Sites' },
  { key: 'numbers', label: 'Numbers' },
];

// Categories that use the new /culture/ endpoint
const CULTURE_API_CATEGORIES = new Set<CultureCategory>([
  'dos-donts', 'gestures', 'food', 'tipping', 'sacred-sites', 'numbers',
]);

export default function CultureScreen() {
  const { destination, setDestination, getLanguageCode, isLoaded } = useDestinationContext();
  const [activeCategory, setActiveCategory] = useState<CultureCategory>('phrases');
  const [showPicker, setShowPicker] = useState(false);

  const cultureCategory = CULTURE_API_CATEGORIES.has(activeCategory) ? activeCategory : null;
  const { phrases, isLoading: phrasesLoading, error: phrasesError } = usePhrases(
    activeCategory === 'phrases' ? destination : null
  );
  const { tips, isLoading: tipsLoading, error: tipsError } = useTips(
    activeCategory === 'tips' ? destination : null
  );
  const { entries, isLoading: cultureLoading, error: cultureError } = useCulture(
    destination,
    cultureCategory,
  );

  const langCode = getLanguageCode();

  const handleSpeak = (text: string) => {
    if (langCode) speak(text, langCode);
  };

  const activeError = activeCategory === 'phrases' ? phrasesError
    : activeCategory === 'tips' ? tipsError
    : cultureError;

  // Wait for AsyncStorage to load saved destination before rendering
  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!destination) {
    return (
      <View style={styles.container}>
        <View style={styles.headerBlock}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>VoxLingo</Text>
              <Text style={styles.headerSub}>Culture Guide</Text>
            </View>
          </SafeAreaView>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>Explore local culture</Text>
          <Text style={styles.emptyText}>Select a destination to see phrases, tips, etiquette, and more</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => setShowPicker(true)}>
            <Text style={styles.emptyButtonText}>Choose destination</Text>
          </TouchableOpacity>
        </View>
        <DestinationPicker
          visible={showPicker}
          selectedCode={null}
          onSelect={(code) => setDestination(code)}
          onClose={() => setShowPicker(false)}
        />
      </View>
    );
  }

  const isLoading = activeCategory === 'phrases' ? phrasesLoading
    : activeCategory === 'tips' ? tipsLoading
    : cultureLoading;

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>VoxLingo</Text>
            </View>
            <TouchableOpacity onPress={() => setShowPicker(true)}>
              <Text style={styles.destinationBadge}>
                {getDestination(destination)?.countryName || destination}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <CategoryChips
        categories={CATEGORIES}
        active={activeCategory}
        onSelect={setActiveCategory}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {activeError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{activeError}</Text>
        </View>
      )}

      {!isLoading && !activeError && activeCategory === 'phrases' && (
        <FlatList
          data={phrases}
          keyExtractor={(item: Phrase) => item.id}
          renderItem={({ item }) => (
            <View style={styles.phraseCardWrapper}>
              <PhraseCard phrase={item} onSpeak={handleSpeak} />
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {!isLoading && !activeError && activeCategory === 'tips' && (
        <View style={styles.tipsContainer}>
          <TipCard tips={tips} />
        </View>
      )}

      {!isLoading && !activeError && CULTURE_API_CATEGORIES.has(activeCategory) && (
        <FlatList
          data={entries}
          keyExtractor={(item: CultureEntry) => item.id}
          renderItem={({ item }) => (
            <CultureCard entry={item} onSpeak={item.speakable ? handleSpeak : undefined} />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <DestinationPicker
        visible={showPicker}
        selectedCode={destination}
        onSelect={(code) => setDestination(code)}
        onClose={() => setShowPicker(false)}
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
  destinationBadge: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.xl,
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
    marginBottom: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  emptyButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  errorContainer: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  phraseCardWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tipsContainer: {
    flex: 1,
    paddingTop: spacing.md,
  },
});
