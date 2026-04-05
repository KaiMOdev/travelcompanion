import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

type Props = {
  message: string | null;
  onDismiss: () => void;
};

export function ErrorBanner({ message, onDismiss }: Props) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.text} numberOfLines={3}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  text: {
    color: colors.error,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
