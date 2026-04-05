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
import { LanguagePicker } from '../../components/LanguagePicker';
import { ErrorBanner } from '../../components/ErrorBanner';
import { translateImage } from '../../services/vision';
import { VisionResponse } from '../../types';
import { colors, shadow, spacing, radius } from '../../constants/theme';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [targetLang, setTargetLang] = useState('nl');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<VisionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const captureId = useRef(0);

  // Web fallback
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.containerLight}>
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>Camera not available</Text>
          <Text style={styles.fallbackText}>
            Use a mobile device to translate photos of text.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission loading
  if (!permission) {
    return (
      <SafeAreaView style={styles.containerLight}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.containerLight}>
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>Camera access needed</Text>
          <Text style={styles.fallbackText}>
            Grant camera permission to translate photos of menus, signs, and documents.
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
      const pic = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });
      if (!pic || !pic.base64) {
        setError('Failed to capture photo');
        return;
      }

      captureId.current += 1;
      const thisCapture = captureId.current;
      setPhoto(pic.uri);
      setResult(null);
      setError(null);
      setIsTranslating(true);

      try {
        const visionResult = await translateImage(pic.base64, targetLang);
        if (captureId.current !== thisCapture) return;
        setResult(visionResult);
      } catch (err: unknown) {
        if (captureId.current !== thisCapture) return;
        const msg = err instanceof Error ? err.message : 'Translation failed';
        setError(msg);
      } finally {
        if (captureId.current === thisCapture) {
          setIsTranslating(false);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to capture photo';
      setError(msg);
    }
  };

  const handleReset = () => {
    captureId.current += 1;
    setPhoto(null);
    setResult(null);
    setError(null);
  };

  // Result / translating state
  if (photo) {
    return (
      <SafeAreaView style={styles.containerLight}>
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

          {error && (
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          )}

          {result && (
            <View style={styles.resultCard}>
              <View style={styles.detectedBadge}>
                <Text style={styles.detectedText}>
                  🌐 {result.detectedLanguage}
                </Text>
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
      </SafeAreaView>
    );
  }

  // Viewfinder state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pickerBar}>
        <Text style={styles.pickerTitle}>TRANSLATE TO</Text>
        <View style={styles.pickerWrapper}>
          <LanguagePicker
            selectedCode={targetLang}
            onSelect={setTargetLang}
            label=""
          />
        </View>
      </View>

      <CameraView ref={cameraRef} style={styles.camera} facing="back" onCameraReady={() => setCameraReady(true)} />

      <View style={styles.shutterBar}>
        <TouchableOpacity
          style={[styles.shutterButton, !cameraReady && styles.shutterDisabled]}
          onPress={handleCapture}
          disabled={!cameraReady}
          activeOpacity={0.8}
        >
          <View style={styles.shutterInner}>
            <Text style={styles.shutterIcon}>📸</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
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
    borderRadius: radius.md,
    ...shadow('md'),
  },
  permissionButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerBar: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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
    alignItems: 'center',
  },
  shutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterIcon: {
    fontSize: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    ...shadow('sm'),
  },
  detectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  detectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
    ...shadow('md'),
  },
  newPhotoText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
