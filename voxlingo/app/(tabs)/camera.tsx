import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LanguageCode, VisionTranslationResult } from "../../types";
import { DEFAULT_TARGET_LANG } from "../../constants/languages";
import { LanguagePicker } from "../../components/LanguagePicker";
import { translateImage } from "../../services/vision";

type ScanMode = "photo" | "livescan";

interface ScanResult {
  id: string;
  imageUri: string | null;
  result: VisionTranslationResult;
  timestamp: number;
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [targetLang, setTargetLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const [scanMode, setScanMode] = useState<ScanMode>("photo");
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const liveScanInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (liveScanInterval.current) {
        clearInterval(liveScanInterval.current);
        liveScanInterval.current = null;
      }
    };
  }, []);

  const captureAndTranslate = useCallback(async () => {
    if (!cameraRef.current || isProcessingRef.current) return;

    try {
      isProcessingRef.current = true;
      setIsProcessing(true);
      setError(null);

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });

      if (!photo?.base64) {
        setError("Failed to capture photo");
        setIsProcessing(false);
        return;
      }

      const result = await translateImage(photo.base64, targetLang);

      const scanResult: ScanResult = {
        id: Date.now().toString(),
        imageUri: photo.uri,
        result,
        timestamp: Date.now(),
      };

      setScans((prev) => [scanResult, ...prev]);
    } catch (err: any) {
      setError(err.message || "Translation failed");
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [targetLang]);

  const toggleLiveScan = useCallback(() => {
    if (liveScanInterval.current) {
      clearInterval(liveScanInterval.current);
      liveScanInterval.current = null;
      setScanMode("photo");
    } else {
      setScanMode("livescan");
      liveScanInterval.current = setInterval(() => {
        captureAndTranslate();
      }, 2000);
    }
  }, [captureAndTranslate]);

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera access is needed to translate text from photos
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <LanguagePicker
          selectedLang={targetLang}
          onSelect={setTargetLang}
          label="Translate to"
        />
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              scanMode === "photo" && styles.modeButtonActive,
            ]}
            onPress={() => {
              if (liveScanInterval.current) {
                clearInterval(liveScanInterval.current);
                liveScanInterval.current = null;
              }
              setScanMode("photo");
            }}
          >
            <Text
              style={[
                styles.modeText,
                scanMode === "photo" && styles.modeTextActive,
              ]}
            >
              Photo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              scanMode === "livescan" && styles.modeButtonActive,
            ]}
            onPress={toggleLiveScan}
          >
            <Text
              style={[
                styles.modeText,
                scanMode === "livescan" && styles.modeTextActive,
              ]}
            >
              Live Scan
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.processingText}>Translating...</Text>
            </View>
          )}

          {scans.length > 0 && (
            <View style={styles.translationOverlay}>
              <Text style={styles.overlayDetected}>
                {scans[0].result.detectedLanguage}
              </Text>
              <Text style={styles.overlayOriginal}>
                {scans[0].result.originalText}
              </Text>
              <Text style={styles.overlayTranslated}>
                {scans[0].result.translatedText}
              </Text>
            </View>
          )}
        </CameraView>

        {scanMode === "photo" && (
          <TouchableOpacity
            style={styles.shutterButton}
            onPress={captureAndTranslate}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.shutterInner,
                isProcessing && styles.shutterDisabled,
              ]}
            />
          </TouchableOpacity>
        )}

        {scanMode === "livescan" && liveScanInterval.current && (
          <View style={styles.liveScanIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Scanning...</Text>
          </View>
        )}
      </View>

      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {scans.length > 0 && (
        <View style={styles.scansContainer}>
          <View style={styles.scansHeader}>
            <Text style={styles.scansTitle}>Recent Scans</Text>
            <TouchableOpacity onPress={() => setScans([])}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={scans}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.scanItem}>
                {item.imageUri && (
                  <Image
                    source={{ uri: item.imageUri }}
                    style={styles.scanThumbnail}
                  />
                )}
                <View style={styles.scanTextContainer}>
                  <Text style={styles.scanDetected} numberOfLines={1}>
                    {item.result.detectedLanguage}
                  </Text>
                  <Text style={styles.scanOriginal} numberOfLines={2}>
                    {item.result.originalText}
                  </Text>
                  <Text style={styles.scanTranslated} numberOfLines={2}>
                    {item.result.translatedText}
                  </Text>
                </View>
              </View>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#111827",
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#1f2937",
    borderRadius: 8,
    overflow: "hidden",
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modeButtonActive: {
    backgroundColor: "#3b82f6",
  },
  modeText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "600",
  },
  modeTextActive: {
    color: "#ffffff",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  processingText: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 8,
  },
  translationOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    padding: 16,
  },
  overlayDetected: {
    color: "#9ca3af",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  overlayOriginal: {
    color: "#d1d5db",
    fontSize: 14,
    marginBottom: 4,
  },
  overlayTranslated: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  shutterButton: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ffffff",
  },
  shutterDisabled: {
    backgroundColor: "#9ca3af",
  },
  liveScanIndicator: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  liveText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  errorBar: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
  },
  scansContainer: {
    maxHeight: 200,
    backgroundColor: "#111827",
  },
  scansHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  scansTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  clearText: {
    color: "#6b7280",
    fontSize: 14,
  },
  scanItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  scanThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  scanTextContainer: {
    flex: 1,
  },
  scanDetected: {
    color: "#6b7280",
    fontSize: 11,
    textTransform: "uppercase",
  },
  scanOriginal: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 2,
  },
  scanTranslated: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permissionText: {
    color: "#ffffff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
