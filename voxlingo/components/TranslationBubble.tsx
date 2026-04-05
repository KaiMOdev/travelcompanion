import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Translation } from '../types';
import { getLanguageName } from '../constants/languages';

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
          <Text style={styles.langLabel}>{getLanguageName(translation.sourceLang)}</Text>
          <Text style={styles.text}>{translation.originalText}</Text>
        </View>
      </View>
      <View style={styles.targetRow}>
        <TouchableOpacity
          style={[styles.bubble, styles.targetBubble]}
          onPress={onReplay}
          activeOpacity={0.7}
        >
          <Text style={styles.langLabel}>
            {getLanguageName(translation.targetLang)} {isSpeaking ? '🔊' : '🔈'}
          </Text>
          <Text style={[styles.text, styles.targetText]}>
            {translation.translatedText}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 2,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 2,
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sourceBubble: {
    backgroundColor: '#f0f0f0',
  },
  targetBubble: {
    backgroundColor: '#e3f2fd',
  },
  langLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  targetText: {
    color: '#1565c0',
  },
});
