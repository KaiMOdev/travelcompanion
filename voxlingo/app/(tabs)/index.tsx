import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../../hooks/useTranslation';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { LanguagePicker } from '../../components/LanguagePicker';
import { TranslationBubble } from '../../components/TranslationBubble';
import { RecordButton } from '../../components/RecordButton';
import { ErrorBanner } from '../../components/ErrorBanner';
import { ShowCard } from '../../components/ShowCard';
import { DestinationPicker } from '../../components/DestinationPicker';
import { EmergencyCard } from '../../components/EmergencyCard';
import { TaxiCard } from '../../components/TaxiCard';
import { OfflineBanner } from '../../components/OfflineBanner';
import { Translation } from '../../types';
import { colors, spacing, radius, shadow } from '../../constants/theme';
import { setSlowMode, getSlowMode, speak } from '../../services/speech';
import { getEmergencyInfo } from '../../constants/emergency';
import { getDestination } from '../../constants/destinations';
import { getLanguageName } from '../../constants/languages';

export default function TravelScreen() {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const { isRecording, isTranslating, translations, error, speakingId, startRecord, stopRecord, replay, clearError, clearTranslations } =
    useTranslation();
  const { destination, setDestination, hotelAddress, setHotelAddress, saveHotelAddress, getLanguageCode, isLoaded } =
    useDestinationContext();
  const flatListRef = useRef<FlatList>(null);
  const [showCardItem, setShowCardItem] = useState<Translation | null>(null);
  const [slowSpeech, setSlowSpeech] = useState(getSlowMode());
  const [targetLangManuallySet, setTargetLangManuallySet] = useState(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showTaxi, setShowTaxi] = useState(false);

  // Fresh start when destination changes — reset language, clear translations
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Don't clear on initial mount (restoring saved destination)
      const langCode = getLanguageCode();
      if (langCode && !targetLangManuallySet) {
        setTargetLang(langCode);
      }
      return;
    }
    // User actively changed destination — full reset
    const langCode = getLanguageCode();
    if (langCode) {
      setTargetLang(langCode);
      setTargetLangManuallySet(false);
    }
    clearTranslations();
  }, [destination]);

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    clearTranslations();
  };

  // Track which side is recording in conversation mode
  const conversationLangsRef = useRef<{ source: string; target: string } | null>(null);

  const handlePressIn = () => {
    startRecord();
  };

  const handlePressOut = () => {
    stopRecord(sourceLang, targetLang);
  };

  // Conversation mode: "I speak" button (my language → their language)
  const handleMePressIn = () => {
    conversationLangsRef.current = { source: sourceLang, target: targetLang };
    startRecord();
  };
  const handleMePressOut = () => {
    if (conversationLangsRef.current) {
      stopRecord(conversationLangsRef.current.source, conversationLangsRef.current.target);
      conversationLangsRef.current = null;
    }
  };

  // Conversation mode: "They speak" button (their language → my language)
  const handleThemPressIn = () => {
    conversationLangsRef.current = { source: targetLang, target: sourceLang };
    startRecord();
  };
  const handleThemPressOut = () => {
    if (conversationLangsRef.current) {
      stopRecord(conversationLangsRef.current.source, conversationLangsRef.current.target);
      conversationLangsRef.current = null;
    }
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

      <OfflineBanner />

      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ErrorBanner message={error} onDismiss={clearError} />

        <View style={styles.languageCard}>
          <View style={styles.languageBar}>
            <LanguagePicker
              selectedCode={sourceLang}
              onSelect={(code) => { setSourceLang(code); clearTranslations(); }}
              label="FROM"
            />
            <TouchableOpacity onPress={handleSwapLanguages} style={styles.swapButton}>
              <Text style={styles.swapIcon}>⇄</Text>
            </TouchableOpacity>
            <LanguagePicker
              selectedCode={targetLang}
              onSelect={(code) => {
                setTargetLang(code);
                setTargetLangManuallySet(true);
                clearTranslations();
              }}
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
            <View style={styles.hotelSection}>
              <Text style={styles.hotelLabel}>Your hotel / accommodation</Text>
              <TextInput
                style={styles.hotelInput}
                placeholder="Enter address to show taxi drivers"
                placeholderTextColor={colors.textMuted}
                value={hotelAddress}
                onChangeText={setHotelAddress}
                onBlur={saveHotelAddress}
                multiline
              />
            </View>
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

        {destination ? (
          <View style={styles.conversationBar}>
            <TouchableOpacity
              style={[styles.convoButton, styles.convoButtonMe]}
              onPressIn={handleMePressIn}
              onPressOut={handleMePressOut}
              disabled={isTranslating}
              activeOpacity={0.7}
            >
              <Text style={styles.convoButtonIcon}>{isRecording && conversationLangsRef.current?.source === sourceLang ? '⏹️' : '🎙️'}</Text>
              <Text style={styles.convoButtonLabel}>{getLanguageName(sourceLang)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.convoButton, styles.convoButtonThem]}
              onPressIn={handleThemPressIn}
              onPressOut={handleThemPressOut}
              disabled={isTranslating}
              activeOpacity={0.7}
            >
              <Text style={styles.convoButtonIcon}>{isRecording && conversationLangsRef.current?.source === targetLang ? '⏹️' : '🎙️'}</Text>
              <Text style={styles.convoButtonLabel}>{getLanguageName(targetLang)}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <RecordButton
            isRecording={isRecording}
            isTranslating={isTranslating}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />
        )}
      </KeyboardAvoidingView>

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
        hotelAddress={hotelAddress || undefined}
        targetLang={targetLang}
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
  hotelSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  hotelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  hotelInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
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
  conversationBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  convoButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  convoButtonMe: {
    backgroundColor: colors.primary,
  },
  convoButtonThem: {
    backgroundColor: colors.headerBg,
  },
  convoButtonIcon: {
    fontSize: 28,
  },
  convoButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
});
