// voxlingo/app/(tabs)/camera.tsx
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
import { Camera as CameraIcon, ArrowLeft, Upload, Save } from "lucide-react-native";
import { LanguageCode, VisionTranslationResult } from "../../types";
import { DEFAULT_TARGET_LANG } from "../../constants/languages";
import { LanguagePicker } from "../../components/LanguagePicker";
import { ErrorBanner } from "../../components/ErrorBanner";
import { translateImage } from "../../services/vision";
import { colors, spacing, borderRadius, fontSize } from "../../theme";

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
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      if (!photo?.base64) {
        setError("Failed to capture photo");
        setIsProcessing(false);
        return;
      }
      const result = await translateImage(photo.base64, targetLang);
      setScans((prev) => [{ id: Date.now().toString(), imageUri: photo.uri, result, timestamp: Date.now() }, ...prev]);
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
      liveScanInterval.current = setInterval(() => { captureAndTranslate(); }, 2000);
    }
  }, [captureAndTranslate]);

  // Permission: loading
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.accentBlue} />
      </SafeAreaView>
    );
  }

  // Permission: not granted
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <CameraIcon size={24} color={colors.accentBlue} strokeWidth={2} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionSubtext}>
            VoxLingo needs camera access to translate text from photos
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Camera Viewfinder */}
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {/* Top overlay */}
          <View style={styles.cameraTopBar}>
            <Text style={styles.logo}>VoxLingo</Text>
            {scanMode === "livescan" && liveScanInterval.current && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>

          {/* Scan frame guides */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          {/* Live translation overlay */}
          {scans.length > 0 && scanMode === "livescan" && (
            <View style={styles.translationOverlay}>
              <View style={styles.overlayLangRow}>
                <View style={styles.overlayDot} />
                <Text style={styles.overlayLang}>
                  Detected — {scans[0].result.detectedLanguage}
                </Text>
              </View>
              <Text style={styles.overlayOriginal}>{scans[0].result.originalText}</Text>
              <View style={styles.overlayDivider} />
              <Text style={styles.overlayTranslated}>{scans[0].result.translatedText}</Text>
            </View>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={styles.processingText}>Translating...</Text>
            </View>
          )}

          {/* Hint */}
          {!isProcessing && scans.length === 0 && (
            <Text style={styles.hintText}>Point camera at text to translate</Text>
          )}
        </CameraView>
      </View>

      {/* Error */}
      {error && <ErrorBanner message={error} onRetry={captureAndTranslate} onDismiss={() => setError(null)} />}

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {/* Mode toggle */}
        <View style={styles.modeToggleWrap}>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, scanMode === "photo" && styles.modeBtnActive]}
              onPress={() => {
                if (liveScanInterval.current) { clearInterval(liveScanInterval.current); liveScanInterval.current = null; }
                setScanMode("photo");
              }}
            >
              <Text style={[styles.modeBtnText, scanMode === "photo" && styles.modeBtnTextActive]}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, scanMode === "livescan" && styles.modeBtnActive]}
              onPress={toggleLiveScan}
            >
              <Text style={[styles.modeBtnText, scanMode === "livescan" && styles.modeBtnTextActive]}>Live Scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shutter row */}
        <View style={styles.shutterRow}>
          <View style={styles.langChip}>
            <Text style={styles.langChipFrom}>JA</Text>
            <Text style={styles.langChipArrow}> → </Text>
            <Text style={styles.langChipTo}>EN</Text>
          </View>
          {scanMode === "photo" ? (
            <TouchableOpacity
              style={styles.shutterButton}
              onPress={captureAndTranslate}
              disabled={isProcessing}
            >
              <View style={[styles.shutterInner, isProcessing && styles.shutterDisabled]} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={toggleLiveScan}>
              <View style={styles.stopSquare} />
            </TouchableOpacity>
          )}
          <View style={{ width: 64 }} />
        </View>
      </View>

      {/* Recent scans */}
      {scans.length > 0 && scanMode === "photo" && (
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
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            renderItem={({ item }) => (
              <View style={styles.scanItem}>
                {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.scanThumb} />}
                <View style={styles.scanTextWrap}>
                  <Text style={styles.scanOriginal} numberOfLines={1}>{item.result.originalText}</Text>
                  <Text style={styles.scanTranslated} numberOfLines={1}>{item.result.translatedText}</Text>
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
  container: { flex: 1, backgroundColor: colors.black },
  cameraContainer: { flex: 1, position: "relative" },
  camera: { flex: 1 },
  cameraTopBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: spacing.lg, paddingTop: spacing.xl,
    backgroundColor: "transparent",
  },
  logo: { fontSize: 18, fontWeight: "700", color: colors.accentBlue },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: "rgba(16, 185, 129, 0.2)", paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  liveText: { color: colors.success, fontSize: 11, fontWeight: "600" },
  scanFrame: {
    position: "absolute", top: "30%", left: "10%", right: "10%", height: 160,
  },
  corner: { position: "absolute", width: 24, height: 24 },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderColor: colors.accentBlue, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderColor: colors.accentBlue, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: colors.accentCyan, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderColor: colors.accentCyan, borderBottomRightRadius: 4 },
  translationOverlay: {
    position: "absolute", bottom: 80, left: spacing.lg, right: spacing.lg,
    backgroundColor: colors.bgOverlay, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: "rgba(59, 130, 246, 0.3)",
  },
  overlayLangRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  overlayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentCyan },
  overlayLang: { color: colors.accentCyan, fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  overlayOriginal: { color: colors.textSubtle, fontSize: 13, marginBottom: spacing.sm },
  overlayDivider: { height: 1, backgroundColor: colors.bgElevated, marginVertical: spacing.sm },
  overlayTranslated: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  processingText: { color: colors.white, fontSize: 16, marginTop: spacing.sm },
  hintText: { position: "absolute", bottom: 80, alignSelf: "center", color: "rgba(255,255,255,0.5)", fontSize: fontSize.caption },
  bottomControls: { backgroundColor: colors.bgPrimary, paddingVertical: spacing.lg, paddingBottom: spacing.xl },
  modeToggleWrap: { alignItems: "center", marginBottom: spacing.lg },
  modeToggle: {
    flexDirection: "row", backgroundColor: colors.bgSurface, borderRadius: borderRadius.md,
    padding: 3, borderWidth: 1, borderColor: colors.bgElevated,
  },
  modeBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  modeBtnActive: { backgroundColor: colors.accentBlue },
  modeBtnText: { color: colors.textMuted, fontSize: fontSize.caption, fontWeight: "500" },
  modeBtnTextActive: { color: colors.white, fontWeight: "600" },
  shutterRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing["2xl"] },
  langChip: {
    flexDirection: "row", backgroundColor: colors.bgSurface, borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.bgElevated,
  },
  langChipFrom: { color: colors.textPrimary, fontSize: 11, fontWeight: "600" },
  langChipArrow: { color: colors.accentBlue, fontSize: 10 },
  langChipTo: { color: colors.accentCyan, fontSize: 11, fontWeight: "600" },
  shutterButton: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: colors.white,
    alignItems: "center", justifyContent: "center",
  },
  shutterInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.white },
  shutterDisabled: { backgroundColor: colors.textSubtle },
  stopButton: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 3, borderColor: colors.error, alignItems: "center", justifyContent: "center",
  },
  stopSquare: { width: 20, height: 20, borderRadius: 4, backgroundColor: colors.error },
  scansContainer: { maxHeight: 180, backgroundColor: colors.bgPrimary, borderTopWidth: 1, borderTopColor: colors.bgSurface },
  scansHeader: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  scansTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  clearText: { color: colors.textMuted, fontSize: 14 },
  scanItem: { flexDirection: "row", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.bgSurface },
  scanThumb: { width: 48, height: 48, borderRadius: borderRadius.sm, marginRight: spacing.md },
  scanTextWrap: { flex: 1 },
  scanOriginal: { color: colors.textSubtle, fontSize: 12 },
  scanTranslated: { color: colors.textPrimary, fontSize: 14, fontWeight: "600", marginTop: 2 },
  permissionContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  permissionIcon: {
    width: 56, height: 56, borderRadius: borderRadius.full, backgroundColor: colors.bgSurface,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md, borderWidth: 1, borderColor: colors.bgElevated,
  },
  permissionTitle: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: "600", marginBottom: spacing.xs },
  permissionSubtext: { color: colors.textMuted, fontSize: 13, textAlign: "center", marginBottom: spacing.lg },
  permissionButton: { backgroundColor: colors.accentBlue, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  permissionButtonText: { color: colors.white, fontSize: 14, fontWeight: "600" },
});
