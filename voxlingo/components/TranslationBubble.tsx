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
      <View style={[styles.bubble, styles.sourceBubble]}>
        <Text style={styles.langLabel}>{getLanguageName(translation.sourceLang)}</Text>
        <Text style={styles.text}>{translation.originalText}</Text>
      </View>
      <TouchableOpacity
        style={[styles.bubble, styles.targetBubble]}
        onPress={onReplay}
        activeOpacity={0.7}
      >
        <Text style={styles.langLabel}>{getLanguageName(translation.targetLang)}</Text>
        <View style={styles.targetRow}>
          <Text style={[styles.text, styles.targetText, styles.targetTextFlex]}>
            {translation.translatedText}
          </Text>
          <Text style={styles.speakerIcon}>{isSpeaking ? '🔊' : '🔈'}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 2,
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
    alignSelf: 'flex-start',
  },
  targetBubble: {
    backgroundColor: '#e3f2fd',
    alignSelf: 'flex-end',
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
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetTextFlex: {
    flex: 1,
  },
  speakerIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
});
