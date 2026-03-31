# Platform-Specific Patterns

## Table of Contents
1. [Platform Detection](#platform-detection)
2. [iOS Patterns](#ios-patterns)
3. [Android Patterns](#android-patterns)
4. [Web Patterns](#web-patterns)
5. [Cross-Platform Components](#cross-platform-components)

---

## Platform Detection

```typescript
import { Platform } from "react-native";

// Simple check
if (Platform.OS === "ios") { /* iOS only */ }
if (Platform.OS === "android") { /* Android only */ }
if (Platform.OS === "web") { /* Web only */ }

// Platform-specific values
const padding = Platform.select({ ios: 20, android: 16, web: 24, default: 16 });

// Platform-specific files
// Component.ios.tsx, Component.android.tsx, Component.web.tsx
// React Native auto-resolves based on platform
```

---

## iOS Patterns

### Audio Recording
```typescript
import { Audio } from "expo-av";

const RECORDING_OPTIONS_IOS: Audio.RecordingOptions["ios"] = {
  extension: ".wav",
  outputFormat: Audio.IOSOutputFormat.LINEARPCM,
  audioQuality: Audio.IOSAudioQuality.MAX,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  linearPCMBitDepth: 16,
  linearPCMIsBigEndian: false,
  linearPCMIsFloat: false,
};
```

### Keyboard Handling
```typescript
import { KeyboardAvoidingView, Platform } from "react-native";

<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
>
```

### Status Bar
iOS uses light/dark status bar styles. Set in root layout:
```typescript
import { StatusBar } from "expo-status-bar";
<StatusBar style="light" />
```

### Haptics
```typescript
import * as Haptics from "expo-haptics";
if (Platform.OS !== "web") {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}
```

---

## Android Patterns

### Audio Recording
```typescript
const RECORDING_OPTIONS_ANDROID: Audio.RecordingOptions["android"] = {
  extension: ".wav",
  outputFormat: Audio.AndroidOutputFormat.DEFAULT,
  audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
};
```

### Back Button Handling
```typescript
import { BackHandler } from "react-native";

useEffect(() => {
  const handler = BackHandler.addEventListener("hardwareBackPress", () => {
    if (isRecording) {
      stopRecording();
      return true; // Handled — don't navigate back
    }
    return false; // Default behavior
  });
  return () => handler.remove();
}, [isRecording]);
```

### Elevation (Shadows)
Android doesn't support iOS shadow props. Use `elevation`:
```typescript
const cardStyle = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  android: {
    elevation: 4,
  },
  default: {},
});
```

### Notification Channels (SDK 26+)
Required for push notifications on Android 8+:
```typescript
import * as Notifications from "expo-notifications";
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
  });
}
```

---

## Web Patterns

### Web Audio API (PCM capture)
`expo-av` Recording on web produces webm/opus. For raw PCM:
```typescript
const audioContext = new AudioContext({ sampleRate: 16000 });
const source = audioContext.createMediaStreamSource(stream);
const processor = audioContext.createScriptProcessor(512, 1, 1);

processor.onaudioprocess = (event) => {
  const float32 = event.inputBuffer.getChannelData(0);
  // Convert float32 to int16 PCM
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
};
```

### Browser TTS
```typescript
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es"; // BCP-47 language tag
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}
```

### Feature Detection
```typescript
function isWebPlatform(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function hasCamera(): boolean {
  return isWebPlatform() && !!navigator.mediaDevices?.getUserMedia;
}
```

---

## Cross-Platform Components

### Platform-Aware Icon
```typescript
// Avoid SVG icons that crash on Android Expo Go
// Use emoji or PNG for maximum compatibility
function PlatformIcon({ emoji, size = 20 }: { emoji: string; size?: number }) {
  return <Text style={{ fontSize: size }}>{emoji}</Text>;
}
```

### Platform-Aware Recording
```typescript
const startRecording = async () => {
  if (isWebPlatform()) {
    await startWebAudioCapture(onChunk);
  } else {
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      android: RECORDING_OPTIONS_ANDROID,
      ios: RECORDING_OPTIONS_IOS,
      web: {},
    });
    await recording.startAsync();
  }
};
```

### Safe Modal/Alert
```typescript
import { Alert, Platform } from "react-native";

function showConfirmation(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: onConfirm },
    ]);
  }
}
```
