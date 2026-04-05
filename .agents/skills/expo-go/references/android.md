# Android-Specific Expo Go Guide

## Table of Contents
1. [Shadow & Elevation](#shadow--elevation)
2. [Permissions](#permissions)
3. [Keyboard Handling](#keyboard-handling)
4. [Navigation & Back Button](#navigation--back-button)
5. [Performance Considerations](#performance-considerations)
6. [Common Crashes & Fixes](#common-crashes--fixes)
7. [Emulator Tips](#emulator-tips)

---

## Shadow & Elevation

Android does not support iOS-style shadow properties (`shadowColor`, `shadowOffset`, etc.). Use `elevation` instead.

```typescript
// WRONG — these do nothing on Android
{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }

// RIGHT — use Platform.select
...Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  android: { elevation: 4 },
})
```

**Known crash:** Border radius values above ~2000 (e.g., Tailwind's `rounded-full` = 9999) combined with elevation can crash Android. Use a reasonable max like `borderRadius: 999` instead.

**Gotcha:** `elevation` requires a `backgroundColor` to be set on the same view. Without it, the shadow won't render. If your shadow disappears, add `backgroundColor: 'white'` (or your desired color).

**Gotcha:** `elevation` does not animate properly when nested inside a view that animates opacity. If you need animated shadows, animate the elevated view itself, not a parent.

---

## Permissions

Android permissions work in two layers:
1. **Manifest declaration** — listed in `app.json` under `expo.android.permissions`
2. **Runtime request** — asked via `useCameraPermissions()`, `useMediaLibraryPermissions()`, etc.

Both are required. Missing the manifest declaration means the runtime request silently fails.

```json
// app.json
{
  "expo": {
    "android": {
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

### Android-Specific Permission Gotchas

**"Ask every time" (one-time permissions):** Android 11+ allows users to grant one-time permissions. The `useCameraPermissions` hook incorrectly reports `canAskAgain: false` for these — but you *can* actually ask again. Don't rely solely on `canAskAgain` to decide whether to show a "go to settings" prompt.

**RECORD_AUDIO for video:** If using expo-camera to record video with audio, you must explicitly include `RECORD_AUDIO` in your permissions array. It's not included by default even though the camera plugin is present.

**Background location:** `ACCESS_BACKGROUND_LOCATION` must be requested separately from `ACCESS_FINE_LOCATION` on Android 10+. Request foreground location first, then background.

**Permission rationale:** Android best practice is to explain *why* you need a permission before requesting it. Show a modal explaining the use case, then call `requestPermission()`.

---

## Keyboard Handling

Android pushes the entire view up when the keyboard opens (default `android:windowSoftInputMode="adjustResize"`). This is usually what you want, but can cause layout issues with absolute positioning.

```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  {/* content */}
</KeyboardAvoidingView>
```

**Tip:** On Android, `behavior="height"` usually works better than `behavior="padding"`. The reverse is true on iOS.

**Tip:** If using a `ScrollView` or `FlatList`, the keyboard avoidance often works automatically on Android without `KeyboardAvoidingView`.

---

## Navigation & Back Button

Android has a hardware/gesture back button. It must be handled explicitly or users get unexpected behavior (like exiting the app from a nested screen).

expo-router handles back navigation automatically for stack navigators. For custom behavior:

```typescript
import { useBackHandler } from '@react-navigation/native';
// or
import { BackHandler } from 'react-native';

// Prevent back on a specific screen
useBackHandler(() => {
  // return true = prevent default back behavior
  // return false = allow default behavior
  if (isRecording) {
    showConfirmDialog();
    return true;
  }
  return false;
});
```

**Gotcha:** Tab navigators — pressing back on the first tab exits the app by default. If you want back to go to the first tab from other tabs, handle it explicitly.

---

## Performance Considerations

Android devices span a much wider performance range than iOS. A mid-range Android phone is significantly less powerful than even an older iPhone.

**React Compiler:** Enable it in your Babel config for automatic memoization. This is the single biggest performance win for Expo apps as of 2025.

**FlatList over ScrollView:** For any list over ~20 items, use `FlatList` or `FlashList`. Mid-range Android devices will noticeably stutter with large ScrollViews.

**Image optimization:** Use `expo-image` instead of `Image` from react-native. It uses native caching and handles memory better on Android.

**Bundle size:** Android devices on slower networks feel startup time more. Use `npx expo-atlas` to analyze and reduce bundle size.

**Hermes:** Enabled by default in modern Expo. Hermes significantly improves startup time and memory usage on Android. Don't disable it.

**Thread offloading:** Heavy computation (crypto, parsing large JSON, etc.) should be offloaded. Use `expo-crypto` or consider a native module for CPU-intensive work.

---

## Common Crashes & Fixes

### Splash Screen Crash (SDK 53+, Android 11 and below)
**Symptom:** Expo Go crashes immediately on launch, before any project loads.
**Cause:** Binary XML inflating issue with splash screen views on older Android APIs (≤ 30).
**Fix:** Download the latest Expo Go APK from https://expo.dev/go or use `npx expo start` which serves a compatible version.

### Samsung First-Load Crash
**Symptom:** App crashes on first open on Samsung devices, works on subsequent opens.
**Cause:** Samsung's aggressive memory management kills the process during initialization.
**Fix:** Usually resolved by Expo updates. Ensure you're on the latest Expo Go version.

### API 35 Emulator Crash
**Symptom:** Expo Go crashes in Android emulator with API 35.
**Fix:** Use API 34 for the emulator until the issue is resolved upstream.

### "Network request failed"
**Symptom:** API calls fail on Android emulator.
**Cause:** Emulator uses `10.0.2.2` to reach the host machine, not `localhost`.
**Fix:** In your server config, use `10.0.2.2:PORT` when running on Android emulator, or use `--tunnel` mode.

### New Architecture Crashes
**Symptom:** Random crashes after enabling `newArchEnabled: true`.
**Fix:** Check that all your dependencies support the new architecture. Run `npx expo-doctor` to identify incompatible packages.

---

## Emulator Tips

```bash
# List available emulators
emulator -list-avds

# Start a specific emulator
emulator -avd Pixel_7_API_34

# Use adb to forward ports (when not on same network)
adb reverse tcp:8081 tcp:8081   # Metro bundler
adb reverse tcp:3001 tcp:3001   # Your backend server

# View device logs (crucial for debugging crashes)
adb logcat *:E    # Errors only
adb logcat | grep -i "expo"    # Expo-related logs

# Install APK directly
adb install expo-go.apk
```

**Recommended emulator config:** Pixel 7 with API 34, 4GB RAM, hardware GPU acceleration enabled. API 35 has known Expo Go issues.

**Physical device via USB:** Enable USB debugging in Developer Options, connect via USB, run `adb devices` to verify, then `npx expo start --android` will auto-detect it.
