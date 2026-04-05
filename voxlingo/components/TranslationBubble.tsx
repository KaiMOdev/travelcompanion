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
          <Text style={styles.langBadge}>
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
            <Text style={[styles.langBadge, styles.targetBadge]}>
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
    marginVertical: spacing.xs,
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
    borderRadius: radius.xl,
    maxWidth: '88%',
    ...shadow('sm'),
  },
  sourceBubble: {
    backgroundColor: colors.sourceBubble,
    borderBottomLeftRadius: radius.sm,
  },
  targetBubble: {
    backgroundColor: colors.targetBubble,
    borderBottomRightRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 191, 166, 0.15)',
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  langBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  targetBadge: {
    color: colors.primaryDark,
  },
  speakerIcon: {
    fontSize: 14,
  },
  sourceText: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 23,
  },
  targetText: {
    fontSize: 16,
    color: colors.targetText,
    fontWeight: '600',
    lineHeight: 23,
  },
});
