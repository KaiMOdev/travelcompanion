import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { useExplore } from '../../hooks/useExplore';
import { CategoryChips } from '../../components/CategoryChips';
import { PlaceCard } from '../../components/PlaceCard';
import { PlacePhrases } from '../../components/PlacePhrases';
import { DestinationPicker } from '../../components/DestinationPicker';
import { ExplorePlace, ExploreCategoryId } from '../../types';
import { EXPLORE_CATEGORIES } from '../../constants/explore';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { speak } from '../../services/speech';
import { getDestination } from '../../constants/destinations';

const CHIP_CATEGORIES = EXPLORE_CATEGORIES.map((c) => ({
  key: c.id,
  label: `${c.emoji} ${c.label}`,
}));

export default function ExploreScreen() {
  const router = useRouter();
  const { destination, setDestination, getLanguageCode, isLoaded } = useDestinationContext();
  const [activeCategory, setActiveCategory] = useState<ExploreCategoryId>('street-food');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<ExplorePlace | null>(null);
  const [showPhrases, setShowPhrases] = useState(false);
  const listRef = useRef<FlatList<ExplorePlace>>(null);

  const {
    places,
    page,
    totalPages,
    total,
    nextPage,
    prevPage,
    isLoading,
    error,
  } = useExplore(destination, activeCategory);

  function handleCategorySelect(category: string) {
    setActiveCategory(category as ExploreCategoryId);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function handlePhrases(place: ExplorePlace) {
    setSelectedPlace(place);
    setShowPhrases(true);
  }

  function handleDirections(place: ExplorePlace) {
    const dest = getDestination(destination ?? '');
    const query = encodeURIComponent(`${place.name} ${dest?.countryName || ''}`);
    const url = Platform.OS === 'ios'
      ? `maps://?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url);
  }

  function handleTranslate() {
    router.push('/(tabs)/');
  }

  function handleSpeak(text: string) {
    const langCode = getLanguageCode();
    if (langCode) {
      speak(text, langCode);
    }
  }

  function handleNextPage() {
    nextPage();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function handlePrevPage() {
    prevPage();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

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
              <Text style={styles.headerTitle}>WanderVox</Text>
              <Text style={styles.headerSub}>Explore</Text>
            </View>
          </SafeAreaView>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧭</Text>
          <Text style={styles.emptyTitle}>Discover local spots</Text>
          <Text style={styles.emptyText}>Select a destination to explore hidden gems, street food, and more</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>WanderVox</Text>
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
        categories={CHIP_CATEGORIES}
        active={activeCategory}
        onSelect={handleCategorySelect}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Discovering places...</Text>
        </View>
      )}

      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!isLoading && !error && (
        <FlatList
          ref={listRef}
          data={places}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={({ item }) => (
            <PlaceCard
              place={item}
              onPhrases={handlePhrases}
              onDirections={handleDirections}
              onTranslate={handleTranslate}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No places found</Text>
              <Text style={styles.emptyText}>Try a different category</Text>
            </View>
          }
          ListFooterComponent={
            <>
              {totalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
                    onPress={handlePrevPage}
                    disabled={page <= 1}
                  >
                    <Text style={[styles.pageButtonText, page <= 1 && styles.pageButtonTextDisabled]}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageInfo}>
                    {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total}
                  </Text>
                  <TouchableOpacity
                    style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
                    onPress={handleNextPage}
                    disabled={page >= totalPages}
                  >
                    <Text style={[styles.pageButtonText, page >= totalPages && styles.pageButtonTextDisabled]}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.disclaimer}>
                Recommendations are AI-generated. Verify hours and availability before visiting.
              </Text>
            </>
          }
        />
      )}

      <PlacePhrases
        visible={showPhrases}
        place={selectedPlace}
        onClose={() => setShowPhrases(false)}
        onSpeak={handleSpeak}
      />

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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  pageButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  pageButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  pageButtonText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  pageButtonTextDisabled: {
    color: colors.textMuted,
  },
  pageInfo: {
    ...typography.label,
    color: colors.textSecondary,
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
  },
});
