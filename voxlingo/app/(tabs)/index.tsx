import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../../hooks/useTranslation';
import { useDestination } from '../../hooks/useDestination';
import { LanguagePicker } from '../../components/LanguagePicker';
import { TranslationBubble } from '../../components/TranslationBubble';
import { RecordButton } from '../../components/RecordButton';
import { ErrorBanner } from '../../components/ErrorBanner';
import { ShowCard } from '../../components/ShowCard';
import { DestinationPicker } from '../../components/DestinationPicker';
import { PhraseRow } from '../../components/PhraseRow';
import { TipCard } from '../../components/TipCard';
import { EmergencyCard } from '../../components/EmergencyCard';
import { TaxiCard } from '../../components/TaxiCard';
import { Translation } from '../../types';
import { colors, spacing, radius, shadow } from '../../constants/theme';
import { setSlowMode, getSlowMode, speak } from '../../services/speech';
import { getEmergencyInfo } from '../../constants/emergency';
import { getDestination } from '../../constants/destinations';

export default function TravelScreen() {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const { isRecording, isTranslating, translations, error, speakingId, startRecord, stopRecord, replay, clearError } =
    useTranslation();
  const { destination, phrases, tips, isLoading: destLoading, setDestination, loadSaved, getLanguageCode } =
    useDestination();
  const flatListRef = useRef<FlatList>(null);
  const [showCardItem, setShowCardItem] = useState<Translation | null>(null);
  const [slowSpeech, setSlowSpeech] = useState(getSlowMode());
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showTaxi, setShowTaxi] = useState(false);

  useEffect(() => {
    loadSaved();
  }, []);

  // Auto-set target language when destination changes
  useEffect(() => {
    const langCode = getLanguageCode();
    if (langCode && langCode !== targetLang) {
      setTargetLang(langCode);
    }
  }, [destination]);

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handlePressIn = () => {
    startRecord();
  };

  const handlePressOut = () => {
    stopRecord(sourceLang, targetLang);
  };

  const toggleSlowSpeech = () => {
    const next = !slowSpeech;
    setSlowSpeech(next);
    setSlowMode(next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>VoxLingo</Text>
              {destination ? (
                <TouchableOpacity onPress={() => setShowDestinationPicker(true)}>
                  <Text style={styles.destinationBadge}>
                    {getDestination(destination)?.countryName || destination}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.headerSub}>Travel Companion</Text>
              )}
            </View>
            <View style={styles.headerRight}>
              {destination && (
                <TouchableOpacity onPress={() => setShowEmergency(true)} style={styles.sosButton}>
                  <Text style={styles.sosText}>SOS</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.slowButton, slowSpeech && styles.slowButtonActive]}
                onPress={toggleSlowSpeech}
              >
                <Text style={styles.slowIcon}>{slowSpeech ? '🐢' : '🐇'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.body}>
        <ErrorBanner message={error} onDismiss={clearError} />

        <View style={styles.languageCard}>
          <View style={styles.languageBar}>
            <LanguagePicker
              selectedCode={sourceLang}
              onSelect={setSourceLang}
              label="FROM"
            />
            <TouchableOpacity onPress={handleSwapLanguages} style={styles.swapButton}>
              <Text style={styles.swapIcon}>⇄</Text>
            </TouchableOpacity>
            <LanguagePicker
              selectedCode={targetLang}
              onSelect={setTargetLang}
              label="TO"
            />
          </View>
        </View>

        {!destination && translations.length === 0 && (
          <TouchableOpacity
            style={styles.setupDestination}
            onPress={() => setShowDestinationPicker(true)}
          >
            <Text style={styles.setupText}>Where are you traveling?</Text>
            <Text style={styles.setupSubtext}>Set your destination for phrases, tips, and more</Text>
          </TouchableOpacity>
        )}

        {destination && translations.length === 0 && (
          <ScrollView style={styles.travelContent} showsVerticalScrollIndicator={false}>
            <PhraseRow
              phrases={phrases}
              isLoading={destLoading}
              onSpeak={(text) => {
                const langCode = getLanguageCode();
                if (langCode) speak(text, langCode);
              }}
            />
            <TipCard tips={tips} />
            <TouchableOpacity style={styles.taxiButton} onPress={() => setShowTaxi(true)}>
              <Text style={styles.taxiButtonText}>Show location to taxi driver</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {translations.length > 0 && (
          <FlatList
            ref={flatListRef}
            style={styles.list}
            data={translations}
            keyExtractor={(item: Translation) => item.id}
            onContentSizeChange={() => {
              if (translations.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            renderItem={({ item }) => (
              <TranslationBubble
                translation={item}
                isSpeaking={item.id === speakingId}
                onReplay={() => replay(item.id)}
                onShowCard={() => setShowCardItem(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )}

        {!destination && translations.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyCircle}>
              <Text style={styles.emptyIcon}>🎙️</Text>
            </View>
            <Text style={styles.emptyTitle}>Ready to translate</Text>
            <Text style={styles.emptyText}>
              Tap the mic below and speak naturally
            </Text>
          </View>
        )}

        <RecordButton
          isRecording={isRecording}
          isTranslating={isTranslating}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        />
      </View>

      <ShowCard
        translation={showCardItem}
        onClose={() => setShowCardItem(null)}
      />

      <DestinationPicker
        visible={showDestinationPicker}
        selectedCode={destination}
        onSelect={(code) => setDestination(code)}
        onClose={() => setShowDestinationPicker(false)}
      />

      {destination && (
        <EmergencyCard
          visible={showEmergency}
          info={getEmergencyInfo(destination)}
          countryName={getDestination(destination)?.countryName || destination}
          onClose={() => setShowEmergency(false)}
        />
      )}

      <TaxiCard
        visible={showTaxi}
        onClose={() => setShowTaxi(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBlock: {
    backgroundColor: colors.headerBg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: colors.headerSubtext,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  destinationBadge: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sosButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  sosText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '800',
    letterSpacing: 1,
  },
  slowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slowButtonActive: {
    backgroundColor: colors.secondary,
  },
  slowIcon: {
    fontSize: 24,
  },
  body: {
    flex: 1,
  },
  languageCard: {
    marginHorizontal: spacing.lg,
    marginTop: -spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow('md'),
  },
  languageBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    marginTop: spacing.lg,
    ...shadow('glow'),
  },
  swapIcon: {
    fontSize: 18,
    color: colors.textOnPrimary,
    fontWeight: 'bold',
  },
  setupDestination: {
    backgroundColor: colors.primaryGlow,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  setupText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  setupSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  travelContent: {
    flex: 1,
    marginTop: spacing.lg,
  },
  taxiButton: {
    backgroundColor: colors.headerBg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  taxiButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
