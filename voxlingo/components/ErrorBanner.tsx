import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  message: string | null;
  onDismiss: () => void;
};

export function ErrorBanner({ message, onDismiss }: Props) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  text: {
    color: '#c62828',
    fontSize: 14,
  },
});
