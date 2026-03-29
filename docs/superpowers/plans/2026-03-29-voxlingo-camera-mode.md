# VoxLingo Camera Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build camera-based text translation — point camera at text (menus, signs, documents), take a photo or live scan, and get instant translations via Gemini Vision API.

**Architecture:** Camera preview via expo-camera → user takes photo or enables live scan (1 frame/2s) → image sent as base64 to backend POST endpoint → backend forwards to Gemini multimodal API with translation prompt → returns detected language + original text + translated text → displayed in overlay/list.

**Tech Stack:** expo-camera (camera preview + capture), `@google/genai` (Gemini multimodal), Express (REST endpoint), React Native (UI)

---

## File Structure

```
server/services/geminiVision.ts     — CREATE: Gemini Vision translation (multimodal image+text)
server/services/geminiVision.test.ts — CREATE: Tests for vision service
server/routes/translate.ts          — MODIFY: Wire POST /image to geminiVision
services/vision.ts                  — MODIFY: Frontend API client calling backend /api/translate/image
app/(tabs)/camera.tsx               — MODIFY: Full camera screen with photo + live scan modes
```

---

### Task 1: Backend Gemini Vision Service

**Files:**
- Create: `server/services/geminiVision.ts`
- Create: `server/services/geminiVision.test.ts`

- [ ] **Step 1: Write tests**

Create `server/services/geminiVision.test.ts`:

```typescript
import { translateImageWithGemini } from "./geminiVision";

const mockGenerateContent = jest.fn().mockResolvedValue({
  text: JSON.stringify({
    detectedLanguage: "Spanish",
    originalText: "Hola mundo",
    translatedText: "Hello world",
  }),
});

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

describe("translateImageWithGemini", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("sends image and prompt to Gemini", async () => {
    const result = await translateImageWithGemini("base64data", "en");

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.model).toBe("gemini-2.0-flash");
    expect(callArgs.contents[0].parts).toHaveLength(2);
    expect(callArgs.contents[0].parts[0].inlineData.mimeType).toBe("image/jpeg");
    expect(callArgs.contents[0].parts[0].inlineData.data).toBe("base64data");
    expect(callArgs.contents[0].parts[1].text).toContain("English");
  });

  it("returns parsed translation result", async () => {
    const result = await translateImageWithGemini("base64data", "en");

    expect(result.detectedLanguage).toBe("Spanish");
    expect(result.originalText).toBe("Hola mundo");
    expect(result.translatedText).toBe("Hello world");
  });

  it("throws if GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(translateImageWithGemini("data", "en")).rejects.toThrow(
      "GEMINI_API_KEY"
    );
  });

  it("handles non-JSON response gracefully", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "This is not valid JSON but contains a translation",
    });

    const result = await translateImageWithGemini("base64data", "en");
    expect(result.detectedLanguage).toBe("unknown");
    expect(result.translatedText).toContain("translation");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npm test -- services/geminiVision.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement geminiVision service**

Create `server/services/geminiVision.ts`:

```typescript
import { GoogleGenAI } from "@google/genai";
import { getLanguageNameForPrompt } from "./languageNames";

export interface VisionResult {
  detectedLanguage: string;
  originalText: string;
  translatedText: string;
}

export async function translateImageWithGemini(
  imageBase64: string,
  targetLang: string
): Promise<VisionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const ai = new GoogleGenAI({ apiKey });
  const targetName = getLanguageNameForPrompt(targetLang);

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64,
            },
          },
          {
            text: `Detect all text in this image. Identify the language. Translate all detected text to ${targetName}. Return as JSON: { "detectedLanguage": string, "originalText": string, "translatedText": string }. Return ONLY the JSON, no other text.`,
          },
        ],
      },
    ],
  });

  const responseText = response.text;
  return parseVisionResponse(responseText);
}

function parseVisionResponse(responseText: string): VisionResult {
  try {
    // Try to extract JSON from the response (may be wrapped in markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        detectedLanguage: parsed.detectedLanguage || "unknown",
        originalText: parsed.originalText || "",
        translatedText: parsed.translatedText || "",
      };
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: return raw text as translation
  return {
    detectedLanguage: "unknown",
    originalText: "",
    translatedText: responseText,
  };
}
```

- [ ] **Step 4: Run tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npm test -- services/geminiVision.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 5: Verify server compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/server/services/geminiVision.ts voxlingo/server/services/geminiVision.test.ts
git commit -m "feat: implement Gemini Vision translation service"
```

---

### Task 2: Backend Translate Route

**Files:**
- Modify: `server/routes/translate.ts`

- [ ] **Step 1: Implement the /image endpoint**

Replace `server/routes/translate.ts` with:

```typescript
import { Router, Request, Response } from "express";
import { translateImageWithGemini } from "../services/geminiVision";
import { rateLimiter } from "../middleware/rateLimit";

export const translateRouter = Router();

translateRouter.post(
  "/image",
  rateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { image, targetLang } = req.body;

      if (!image || typeof image !== "string") {
        res.status(400).json({ error: "Missing or invalid 'image' field (base64 string)" });
        return;
      }

      if (!targetLang || typeof targetLang !== "string") {
        res.status(400).json({ error: "Missing or invalid 'targetLang' field" });
        return;
      }

      const result = await translateImageWithGemini(image, targetLang);
      res.json(result);
    } catch (error: any) {
      console.error("Image translation error:", error);
      res.status(500).json({
        error: error.message || "Failed to translate image",
      });
    }
  }
);
```

- [ ] **Step 2: Verify server compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/server/routes/translate.ts
git commit -m "feat: wire /api/translate/image endpoint to Gemini Vision"
```

---

### Task 3: Frontend Vision Service

**Files:**
- Modify: `services/vision.ts`

- [ ] **Step 1: Implement the vision API client**

Replace `services/vision.ts` with:

```typescript
import { LanguageCode, VisionTranslationResult } from "../types";

const BACKEND_URL = __DEV__
  ? "http://localhost:3001"
  : "https://your-production-server.com";

export async function translateImage(
  imageBase64: string,
  targetLang: LanguageCode
): Promise<VisionTranslationResult> {
  const response = await fetch(`${BACKEND_URL}/api/translate/image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: imageBase64,
      targetLang,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Translation failed with status ${response.status}`
    );
  }

  return response.json();
}
```

- [ ] **Step 2: Verify frontend compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/services/vision.ts
git commit -m "feat: implement frontend vision API client"
```

---

### Task 4: Camera Screen UI

**Files:**
- Modify: `app/(tabs)/camera.tsx`

- [ ] **Step 1: Implement full camera screen**

Replace `app/(tabs)/camera.tsx` with:

```typescript
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
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const liveScanInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up live scan on unmount or mode change
  useEffect(() => {
    return () => {
      if (liveScanInterval.current) {
        clearInterval(liveScanInterval.current);
        liveScanInterval.current = null;
      }
    };
  }, []);

  const captureAndTranslate = useCallback(async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
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
      setIsProcessing(false);
    }
  }, [targetLang, isProcessing]);

  const toggleLiveScan = useCallback(() => {
    if (liveScanInterval.current) {
      clearInterval(liveScanInterval.current);
      liveScanInterval.current = null;
      setScanMode("photo");
    } else {
      setScanMode("livescan");
      // Capture every 2 seconds
      liveScanInterval.current = setInterval(() => {
        captureAndTranslate();
      }, 2000);
    }
  }, [captureAndTranslate]);

  // Permission not yet determined
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  // Permission denied
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
      {/* Target Language Selector */}
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

      {/* Camera Preview */}
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {/* Processing Overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.processingText}>Translating...</Text>
            </View>
          )}

          {/* Latest translation overlay */}
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

        {/* Shutter button (photo mode only) */}
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

        {/* Live scan indicator */}
        {scanMode === "livescan" && liveScanInterval.current && (
          <View style={styles.liveScanIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Scanning...</Text>
          </View>
        )}
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Recent Scans List */}
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
```

- [ ] **Step 2: Verify frontend compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/app/\(tabs\)/camera.tsx
git commit -m "feat: implement camera screen with photo and live scan modes"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run all frontend tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test
```
Expected: All tests pass.

- [ ] **Step 2: Run all backend tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npm test
```
Expected: All tests pass (geminiProxy + geminiVision).

- [ ] **Step 3: Typecheck frontend**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

- [ ] **Step 4: Typecheck backend**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```

- [ ] **Step 5: Push to GitHub**

```bash
cd /c/Scripts/travelcompanion
git push origin main
```
