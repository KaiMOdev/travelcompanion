# iOS-Specific Expo Go Guide

## Table of Contents
1. [Safe Areas & Notch Handling](#safe-areas--notch-handling)
2. [Permissions](#permissions)
3. [Keyboard Handling](#keyboard-handling)
4. [App Transport Security](#app-transport-security)
5. [Performance & Memory](#performance--memory)
6. [Common Crashes & Fixes](#common-crashes--fixes)
7. [Simulator Tips](#simulator-tips)

---

## Safe Areas & Notch Handling

iOS devices with notches (iPhone X+) and Dynamic Island require safe area handling. Content behind the notch or home indicator is clipped or obscured.

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

// Wrap your screen content
<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
  {/* Your content */}
</SafeAreaView>
```

**Prefer `react-native-safe-area-context` over React Native's built-in `SafeAreaView`.** The built-in version only works on iOS and doesn't support granular edge control.

**Tab bars and bottom sheets:** Use `edges={['top']}` only — the tab bar already accounts for the bottom safe area. Double-padding is a common visual bug.

**Status bar height:** Don't hardcode it. Use `useSafeAreaInsets()` to get the actual inset values.

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();
// insets.top = status bar + notch height
// insets.bottom = home indicator height
```

---

## Permissions

iOS permissions are declared via `infoPlist` in `app.json` with usage description strings. Apple **rejects apps** that don't explain why each permission is needed.

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "VoxLingo needs camera access to translate text from signs and menus",
        "NSMicrophoneUsageDescription": "VoxLingo needs microphone access for real-time voice translation",
        "NSLocationWhenInUseUsageDescription": "VoxLingo uses your location for culturally-aware translations"
      }
    }
  }
}
```

### iOS-Specific Permission Gotchas

**Permission state not updating after grant:** When the camera view is mounted for the first time after a fresh install, iOS prompts for permission. If the user grants it, the `useCameraPermissions` hook may not update immediately. Workaround: add a small delay or re-check permission status after the native dialog dismisses.

```typescript
const [permission, requestPermission] = useCameraPermissions();

const handlePermission = async () => {
  const result = await requestPermission();
  if (!result.granted) {
    // On iOS, check again after a brief delay
    setTimeout(async () => {
      const recheck = await Camera.getCameraPermissionsAsync();
      // Update your state based on recheck
    }, 500);
  }
};
```

**Manual Settings toggle:** If a user grants permission then later revokes it in iOS Settings, calling `requestPermission()` again does NOT show the system dialog — it returns the denied status silently. You must direct the user to Settings:

```typescript
import { Linking } from 'react-native';

if (!permission.granted && !permission.canAskAgain) {
  // Direct user to Settings
  Linking.openSettings();
}
```

**One-shot permission model:** iOS only allows you to ask for a permission once per app install. If the user denies, you can never show the system dialog again — only `Linking.openSettings()`.

**Photo library "limited access":** iOS 14+ allows users to grant access to only selected photos. Handle this gracefully — don't assume full library access.

---

## Keyboard Handling

iOS keyboards cover content by default (unlike Android which resizes). `KeyboardAvoidingView` is essential.

```typescript
<KeyboardAvoidingView
  behavior="padding"  // "padding" works best on iOS
  keyboardVerticalOffset={headerHeight}  // Account for nav header
  style={{ flex: 1 }}
>
  {/* content */}
</KeyboardAvoidingView>
```

**With ScrollView:** Wrap content in a ScrollView with `keyboardShouldPersistTaps="handled"` to allow tapping buttons while the keyboard is open.

**With tab bars:** Add `keyboardVerticalOffset` equal to the tab bar height to prevent the keyboard from pushing content behind the tab bar.

**Keyboard dismiss:** iOS users expect to dismiss the keyboard by tapping outside an input. Use `<ScrollView keyboardDismissMode="on-drag">` or wrap in `<TouchableWithoutFeedback onPress={Keyboard.dismiss}>`.

---

## App Transport Security

iOS blocks HTTP (non-HTTPS) requests by default via App Transport Security (ATS).

**In Expo Go development:** ATS is already configured to allow localhost connections. Your local dev server works fine.

**For production / other HTTP endpoints:** You must add ATS exceptions in `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true
        }
      }
    }
  }
}
```

**Warning:** `NSAllowsArbitraryLoads: true` disables ATS entirely. For production, use domain-specific exceptions instead — Apple may reject apps with blanket ATS disabling.

---

## Performance & Memory

iOS devices are generally more powerful than equivalent Android devices, but iOS is stricter about memory usage — the OS kills apps more aggressively when memory is low.

**Image memory:** Large images (from camera or photo library) can consume massive memory. Always resize images before displaying:

```typescript
import * as ImageManipulator from 'expo-image-manipulator';

const resized = await ImageManipulator.manipulateAsync(
  uri,
  [{ resize: { width: 800 } }],
  { compress: 0.8, format: 'jpeg' }
);
```

**Audio sessions (expo-av):** iOS requires proper audio session configuration. If audio playback is interrupted by other apps or doesn't play in silent mode:

```typescript
import { Audio } from 'expo-av';

await Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  shouldDuckAndroid: true,  // Also good for Android
});
```

**"Reduce Motion" accessibility setting:** When enabled, Expo Go's developer menu intro animation can block app interaction entirely (known bug). If a tester reports the app is unresponsive, check this setting.

---

## Common Crashes & Fixes

### "Project is incompatible with this version of Expo Go"
**Symptom:** Error when scanning QR code or opening project URL.
**Cause:** SDK version in `package.json` doesn't match the Expo Go app version on the device.
**Fix:** Update Expo Go from the App Store, or downgrade your SDK to match: `npx expo install expo@<version>`.

### iOS Simulator Crash (EXC_BAD_ACCESS)
**Symptom:** Expo Go crashes on iOS Simulator with `EXC_BAD_ACCESS in requestLocalNetworkAuthorization`.
**Cause:** Local network permission prompt issue in Simulator.
**Fix:** Reset Simulator (Device > Erase All Content and Settings) or use a physical device.

### Deep Links Not Working When App Is Killed
**Symptom:** Deep links work when app is backgrounded but not when killed.
**Cause:** The native click event fires before React's lifecycle starts.
**Fix:** Use `Linking.getInitialURL()` in your root layout to catch the URL that launched the app:

```typescript
import * as Linking from 'expo-linking';

useEffect(() => {
  const getInitialUrl = async () => {
    const url = await Linking.getInitialURL();
    if (url) handleDeepLink(url);
  };
  getInitialUrl();
}, []);
```

### White Screen After Splash
**Symptom:** App shows white screen after splash screen dismisses.
**Cause:** Usually a JS error that crashes silently, or fonts/assets not loaded.
**Fix:** Check Metro terminal for errors. Ensure `SplashScreen.preventAutoHideAsync()` is paired with `SplashScreen.hideAsync()` after assets load.

---

## Simulator Tips

```bash
# Open iOS Simulator directly
open -a Simulator

# Boot a specific device
xcrun simctl boot "iPhone 16 Pro"

# Install Expo Go on Simulator (happens automatically with npx expo start --ios)
# But if needed manually:
xcrun simctl install booted expo-go.app

# View Simulator logs
xcrun simctl spawn booted log stream --predicate 'process == "Expo Go"'

# Reset Simulator (fixes many weird issues)
# Device menu > Erase All Content and Settings

# Simulate location
# Debug menu > Location > Custom Location
```

**Recommended Simulator:** iPhone 16 Pro — matches a common real device and has the Dynamic Island for safe area testing.

**Physical device:** Connect via USB, trust the computer on the device, then `npx expo start --ios` auto-detects it. If it doesn't, scan the QR code with the Camera app.

**Note:** iOS Simulator runs on macOS only. Windows/Linux users must use physical iOS devices or cloud-based Mac services for iOS testing.
