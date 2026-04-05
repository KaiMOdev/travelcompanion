import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CultureEntry } from '../types';
import { colors, spacing, radius, typography, shadow } from '../constants/theme';

type Props = {
  entry: CultureEntry;
  onSpeak?: (text: string) => void;
};

export function CultureCard({ entry, onSpeak }: Props) {
  const hasSpeakable = !!entry.speakable && !!onSpeak;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.content}>
          <Text style={styles.title}>{entry.title}</Text>
          <Text style={styles.body}>{entry.body}</Text>
          {entry.speakable && (
            <Text style={styles.speakable}>{entry.speakable}</Text>
          )}
          {entry.romanized && (
            <Text style={styles.romanized}>{entry.romanized}</Text>
          )}
        </View>
        {hasSpeakable && (
          <TouchableOpacity
            style={styles.speakButton}
            onPress={() => onSpeak!(entry.speakable!)}
            activeOpacity={0.7}
          >
            <Text style={styles.speakIcon}>🔊</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadow('sm'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  speakable: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  romanized: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  speakButton: {
    padding: spacing.sm,
  },
  speakIcon: {
    fontSize: 20,
  },
});
