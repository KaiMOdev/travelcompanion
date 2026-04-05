import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LanguagePicker } from '../../components/LanguagePicker';
import { ErrorBanner } from '../../components/ErrorBanner';
import { MenuResult } from '../../components/MenuResult';
import { SignResult } from '../../components/SignResult';
import { OfflineBanner } from '../../components/OfflineBanner';
import { translateImageSmart } from '../../services/vision';
import { SmartVisionResponse } from '../../types';
import { colors, shadow, spacing, radius } from '../../constants/theme';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [targetLang, setTargetLang] = useState('nl');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<SmartVisionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const captureId = useRef(0);

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.containerLight}>
        <View style={styles.centered}>
          <View style={styles.emptyCircle}>
            <Text style={styles.emptyIconLarge}>📷</Text>
          </View>
          <Text style={styles.emptyTitle}>Camera not available</Text>
          <Text style={styles.fallbackText}>
            Use a mobile device to translate photos of text.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.containerLight}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.containerLight}>
        <View style={styles.centered}>
          <View style={styles.emptyCircle}>
            <Text style={styles.emptyIconLarge}>🔒</Text>
          </View>
          <Text style={styles.emptyTitle}>Camera access needed</Text>
          <Text style={styles.fallbackText}>
            Grant camera permission to translate menus, signs, and documents.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!pic || !pic.base64) { setError('Failed to capture photo'); return; }

      captureId.current += 1;
      const thisCapture = captureId.current;
      setPhoto(pic.uri);
      setResult(null);
      setError(null);
      setIsTranslating(true);

      try {
        const visionResult = await translateImageSmart(pic.base64, targetLang);
        if (captureId.current !== thisCapture) return;
        setResult(visionResult);
      } catch (err: unknown) {
        if (captureId.current !== thisCapture) return;
        setError(err instanceof Error ? err.message : 'Translation failed');
      } finally {
        if (captureId.current === thisCapture) setIsTranslating(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to capture photo');
    }
  };

  const handleGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.7,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.base64) return;

      captureId.current += 1;
      const thisCapture = captureId.current;
      const base64 = asset.base64;
      setPhoto(asset.uri);
      setResult(null);
      setError(null);
      setIsTranslating(true);

      try {
        const visionResult = await translateImageSmart(base64, targetLang);
        if (captureId.current !== thisCapture) return;
        setResult(visionResult);
      } catch (err: unknown) {
        if (captureId.current !== thisCapture) return;
        setError(err instanceof Error ? err.message : 'Translation failed');
      } finally {
        if (captureId.current === thisCapture) setIsTranslating(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to pick image');
    }
  };

  const handleReset = () => {
    captureId.current += 1;
    setPhoto(null);
    setResult(null);
    setError(null);
  };

  if (photo) {
    return (
      <View style={styles.containerLight}>
        <SafeAreaView edges={['top']} style={styles.resultHeader}>
          <Text style={styles.resultHeaderText}>📷 Translation Result</Text>
        </SafeAreaView>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.photoCard}>
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          </View>

          {isTranslating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Translating...</Text>
            </View>
          )}

          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          {result && result.contentType === 'menu' && (
            <View style={styles.resultCard}>
              <MenuResult result={result} />
            </View>
          )}

          {result && result.contentType === 'sign' && (
            <View style={styles.resultCard}>
              <SignResult result={result} />
            </View>
          )}

          {result && result.contentType === 'general' && (
            <View style={styles.resultCard}>
              <View style={styles.detectedBadge}>
                <Text style={styles.detectedText}>🌐 {result.detectedLanguage}</Text>
              </View>
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>ORIGINAL</Text>
                <Text style={styles.originalText}>{result.originalText}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>TRANSLATION</Text>
                <Text style={styles.translatedText}>
                  {result.translatedText || 'No text detected in this image'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
        <TouchableOpacity style={styles.newPhotoButton} onPress={handleReset}>
          <Text style={styles.newPhotoText}>📷  Take New Photo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <SafeAreaView edges={['top']} style={styles.pickerBar}>
        <Text style={styles.pickerTitle}>TRANSLATE TO</Text>
        <View style={styles.pickerWrapper}>
          <LanguagePicker selectedCode={targetLang} onSelect={setTargetLang} label="" />
        </View>
      </SafeAreaView>

      <CameraView ref={cameraRef} style={styles.camera} facing="back" flash={torchEnabled ? 'on' : 'off'} enableTorch={torchEnabled} onCameraReady={() => setCameraReady(true)} />

      <View style={styles.shutterBar}>
        <TouchableOpacity
          style={styles.flashButton}
          onPress={() => setTorchEnabled(!torchEnabled)}
        >
          <Text style={styles.flashIcon}>{torchEnabled ? '⚡' : '🔦'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shutterOuter, !cameraReady && styles.shutterDisabled]}
          onPress={handleCapture}
          disabled={!cameraReady}
          activeOpacity={0.8}
        >
          <View style={styles.shutterInner}>
            <Text style={styles.shutterIcon}>📸</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.flashButton}
          onPress={handleGallery}
        >
          <Text style={styles.flashIcon}>🖼️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cameraBg,
  },
  containerLight: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyIconLarge: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  fallbackText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: 14,
    borderRadius: radius.full,
    ...shadow('glow'),
  },
  permissionButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pickerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  pickerWrapper: {
    minHeight: 56,
  },
  camera: {
    flex: 1,
  },
  shutterBar: {
    backgroundColor: colors.shutterBg,
    paddingVertical: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashIcon: {
    fontSize: 20,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.shutterRing,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow('glow'),
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterIcon: {
    fontSize: 30,
  },
  resultHeader: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  resultHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  photoCard: {
    margin: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow('md'),
  },
  photo: {
    width: '100%',
    height: 280,
    backgroundColor: colors.surfaceAlt,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.textSecondary,
  },
  resultCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow('sm'),
  },
  detectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  detectedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  resultSection: {
    marginVertical: spacing.sm,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  resultDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  originalText: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  translatedText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  newPhotoButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadow('glow'),
  },
  newPhotoText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
