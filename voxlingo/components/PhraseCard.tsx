import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Phrase } from '../types';
import { colors, spacing, radius, typography, shadow } from '../constants/theme';

type Props = {
  phrase: Phrase;
  onSpeak?: (text: string) => void;
};

export function PhraseCard({ phrase, onSpeak }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onSpeak?.(phrase.translated)}
      activeOpacity={0.7}
    >
      <Text style={styles.category}>{phrase.category.toUpperCase()}</Text>
      <Text style={styles.english}>{phrase.english}</Text>
      <Text style={styles.translated}>{phrase.translated}</Text>
      {phrase.romanized && (
        <Text style={styles.romanized}>{phrase.romanized}</Text>
      )}
      {onSpeak && <Text style={styles.speakerIcon}>🔊</Text>}
      {!phrase.isEditorial && (
        <Text style={styles.aiLabel}>AI</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginRight: spacing.md,
    width: 200,
    minHeight: 140,
    justifyContent: 'space-between',
    ...shadow('sm'),
  },
  category: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  english: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  translated: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: '700',
  },
  romanized: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  speakerIcon: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    fontSize: 16,
  },
  aiLabel: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 9,
    opacity: 0.5,
  },
});
