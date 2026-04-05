import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Brightness from 'expo-brightness';
import { Translation } from '../types';
import { getLanguageName } from '../constants/languages';
import { colors, spacing, radius } from '../constants/theme';

type Props = {
  translation: Translation | null;
  onClose: () => void;
};

export function ShowCard({ translation, onClose }: Props) {
  useEffect(() => {
    if (!translation) return;

    let originalBrightness: number | null = null;

    (async () => {
      try {
        if (Platform.OS !== 'web') {
          originalBrightness = await Brightness.getBrightnessAsync();
          await Brightness.setBrightnessAsync(1);
        }
      } catch {
        // Brightness API not available
      }
    })();

    return () => {
      (async () => {
        try {
          if (Platform.OS !== 'web' && originalBrightness !== null) {
            await Brightness.setBrightnessAsync(originalBrightness);
          }
        } catch {
          // Ignore
        }
      })();
    };
  }, [translation]);

  if (!translation) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.card}>
          <Text style={styles.langFrom}>
            {getLanguageName(translation.sourceLang)}
          </Text>
          <Text style={styles.originalText}>{translation.originalText}</Text>

          <View style={styles.divider} />

          <Text style={styles.langTo}>
            {getLanguageName(translation.targetLang)}
          </Text>
          <Text style={styles.translatedText}>{translation.translatedText}</Text>
        </View>

        <Text style={styles.hint}>Tap anywhere to close</Text>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.headerBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxxl,
    width: '100%',
    maxWidth: 400,
  },
  langFrom: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  originalText: {
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 32,
  },
  divider: {
    height: 2,
    backgroundColor: colors.primary,
    marginVertical: spacing.xxl,
    borderRadius: 1,
  },
  langTo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  translatedText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    lineHeight: 38,
  },
  hint: {
    marginTop: spacing.xxxl,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
});
