import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SignTranslation } from '../types';
import { colors, spacing, radius, typography } from '../constants/theme';

type Props = {
  result: SignTranslation;
};

export function SignResult({ result }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.detectedLang}>
        Detected: {result.detectedLanguage.toUpperCase()}
      </Text>

      <View style={styles.textSection}>
        <Text style={styles.label}>Original</Text>
        <Text style={styles.originalText}>{result.originalText}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.textSection}>
        <Text style={styles.label}>Translation</Text>
        <Text style={styles.translatedText}>{result.translatedText}</Text>
      </View>

      {result.context && (
        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>What this means for you:</Text>
          <Text style={styles.contextText}>{result.context}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  detectedLang: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  textSection: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  originalText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  translatedText: {
    ...typography.subtitle,
    color: colors.primary,
    fontWeight: '700',
  },
  contextCard: {
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  contextLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  contextText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
});
