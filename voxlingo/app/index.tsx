import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { LanguagePicker } from '../components/LanguagePicker';
import { TranslationBubble } from '../components/TranslationBubble';
import { RecordButton } from '../components/RecordButton';
import { ErrorBanner } from '../components/ErrorBanner';
import { Translation } from '../types';

export default function TravelScreen() {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const { isRecording, isTranslating, translations, error, toggleRecord, clearError } =
    useTranslation();

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleRecord = () => {
    toggleRecord(sourceLang, targetLang);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>VoxLingo</Text>

      <ErrorBanner message={error} onDismiss={clearError} />

      <View style={styles.languageBar}>
        <LanguagePicker
          selectedCode={sourceLang}
          onSelect={setSourceLang}
          label="From"
        />
        <TouchableOpacity onPress={handleSwapLanguages} style={styles.swapButton}>
          <Text style={styles.swapIcon}>🔄</Text>
        </TouchableOpacity>
        <LanguagePicker
          selectedCode={targetLang}
          onSelect={setTargetLang}
          label="To"
        />
      </View>

      <FlatList
        style={styles.list}
        data={translations}
        keyExtractor={(item: Translation) => item.id}
        renderItem={({ item }) => <TranslationBubble translation={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Tap the mic and start speaking</Text>
          </View>
        }
        contentContainerStyle={translations.length === 0 ? styles.emptyContainer : undefined}
      />

      <RecordButton
        isRecording={isRecording}
        isTranslating={isTranslating}
        onPress={handleRecord}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 12,
    color: '#1565c0',
  },
  languageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  swapButton: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  swapIcon: {
    fontSize: 24,
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
