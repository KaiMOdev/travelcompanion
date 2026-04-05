import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CulturalTip } from '../types';
import { colors, spacing, radius, typography, shadow } from '../constants/theme';

const CATEGORY_LABELS: Record<string, string> = {
  etiquette: 'Etiquette',
  money: 'Money & Tipping',
  food: 'Food & Dining',
  safety: 'Safety',
  social: 'Social Norms',
  language: 'Language Tips',
};

type Props = {
  tips: CulturalTip[];
};

export function TipCard({ tips }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (tips.length === 0) return null;

  const tip = tips[currentIndex];
  const hasNext = currentIndex < tips.length - 1;
  const hasPrev = currentIndex > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Did you know?</Text>
      <View style={styles.card}>
        <Text style={styles.category}>{CATEGORY_LABELS[tip.category] || tip.category}</Text>
        <Text style={styles.title}>{tip.title}</Text>
        <Text style={styles.body}>{tip.body}</Text>
        <View style={styles.footer}>
          <View style={styles.nav}>
            <TouchableOpacity
              onPress={() => setCurrentIndex((i) => i - 1)}
              disabled={!hasPrev}
              style={[styles.navButton, !hasPrev && styles.navButtonDisabled]}
            >
              <Text style={styles.navText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.counter}>{currentIndex + 1}/{tips.length}</Text>
            <TouchableOpacity
              onPress={() => setCurrentIndex((i) => i + 1)}
              disabled={!hasNext}
              style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
            >
              <Text style={styles.navText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          {tip.sourceType === 'ai-generated' && (
            <Text style={styles.aiLabel}>AI-generated tip</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    ...shadow('sm'),
  },
  category: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  counter: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  aiLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    fontStyle: 'italic',
  },
});
