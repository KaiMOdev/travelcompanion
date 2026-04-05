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
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.fallbackText}>
            Camera is not available on web. Use a mobile device.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission loading
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1565c0" />
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.fallbackText}>
            Camera access is needed to translate photos.
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
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <Image source={{ uri: photo }} style={styles.photo} resizeMode="contain" />

          {isTranslating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1565c0" />
              <Text style={styles.loadingText}>Translating...</Text>
            </View>
          )}

          {error && (
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          )}

          {result && (
            <View style={styles.resultCard}>
              <Text style={styles.detectedLabel}>
                Detected: {result.detectedLanguage}
              </Text>
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Original</Text>
                <Text style={styles.originalText}>{result.originalText}</Text>
              </View>
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Translation</Text>
                <Text style={styles.translatedText}>
                  {result.translatedText || 'No text detected in this image'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.newPhotoButton} onPress={handleReset}>
          <Text style={styles.newPhotoText}>📷 New Photo</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Viewfinder state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pickerBar}>
        <Text style={styles.pickerTitle}>Translate to:</Text>
        <LanguagePicker
          selectedCode={targetLang}
          onSelect={setTargetLang}
          label=""
        />
      </View>

      <CameraView ref={cameraRef} style={styles.camera} facing="back" onCameraReady={() => setCameraReady(true)} />

      <TouchableOpacity style={[styles.shutterButton, !cameraReady && { opacity: 0.4 }]} onPress={handleCapture} disabled={!cameraReady}>
        <Text style={styles.shutterIcon}>📸</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 16,
    backgroundColor: '#1565c0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  camera: {
    flex: 1,
  },
  shutterButton: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#111',
  },
  shutterIcon: {
    fontSize: 48,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  photo: {
    width: '100%',
    height: 300,
    backgroundColor: '#eee',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  resultCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
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
  detectedLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  resultSection: {
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  originalText: {
    fontSize: 16,
    color: '#333',
  },
  translatedText: {
    fontSize: 16,
    color: '#1565c0',
    fontWeight: 'bold',
  },
  newPhotoButton: {
    backgroundColor: '#1565c0',
    padding: 16,
    alignItems: 'center',
  },
  newPhotoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
