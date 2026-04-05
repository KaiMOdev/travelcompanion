import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { PhraseCard } from './PhraseCard';
import { Phrase } from '../types';
import { colors, spacing, typography } from '../constants/theme';

type Props = {
  phrases: Phrase[];
  isLoading: boolean;
  onSpeak?: (text: string) => void;
};

export function PhraseRow({ phrases, isLoading, onSpeak }: Props) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Loading phrases...</Text>
      </View>
    );
  }

  if (phrases.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Essential Phrases</Text>
      <FlatList
        data={phrases}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PhraseCard phrase={item} onSpeak={onSpeak} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
