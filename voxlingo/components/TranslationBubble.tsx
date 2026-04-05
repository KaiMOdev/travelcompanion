import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Translation } from '../types';
import { getLanguageName } from '../constants/languages';
import { colors, shadow, spacing, radius } from '../constants/theme';

type Props = {
  translation: Translation;
  isSpeaking: boolean;
  onReplay: () => void;
};

export function TranslationBubble({ translation, isSpeaking, onReplay }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.sourceRow}>
        <View style={[styles.bubble, styles.sourceBubble]}>
          <Text style={styles.langLabel}>
            {getLanguageName(translation.sourceLang)}
          </Text>
          <Text style={styles.sourceText}>{translation.originalText}</Text>
        </View>
      </View>
      <View style={styles.targetRow}>
        <TouchableOpacity
          style={[styles.bubble, styles.targetBubble]}
          onPress={onReplay}
          activeOpacity={0.7}
        >
          <View style={styles.targetHeader}>
            <Text style={styles.langLabel}>
              {getLanguageName(translation.targetLang)}
            </Text>
            <Text style={styles.speakerIcon}>{isSpeaking ? '🔊' : '🔈'}</Text>
          </View>
          <Text style={styles.targetText}>
            {translation.translatedText}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: spacing.xs,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: spacing.xs,
  },
  bubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    maxWidth: '88%',
    ...shadow('sm'),
  },
  sourceBubble: {
    backgroundColor: colors.sourceBubble,
    borderTopLeftRadius: radius.sm,
  },
  targetBubble: {
    backgroundColor: colors.targetBubble,
    borderTopRightRadius: radius.sm,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  speakerIcon: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  sourceText: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  targetText: {
    fontSize: 16,
    color: colors.targetText,
    fontWeight: '600',
    lineHeight: 22,
  },
});
