# Expo Go Crashing on Samsung Galaxy — Troubleshooting Guide

This is a known issue pattern. Samsung devices have specific behaviors that interact poorly with certain Expo Go versions. Let's diagnose systematically.

## Step 1: Check Your Android Version

The most likely cause depends on your Android version:

### Android 11 and below (API ≤ 30) — Splash Screen Crash
**This is the most common cause.** Expo Go SDK 53+ has a known crash on Android 11 and below — the app crashes immediately on launch due to a Binary XML inflating issue with splash screen views.

**Fix:**
- Download the latest patched Expo Go APK from https://expo.dev/go
- Or connect your device via USB and let `npx expo start` serve a compatible version

### Android 12+ — Samsung First-Load Crash
Samsung devices have aggressive memory management that can kill the Expo Go process during initialization on the very first launch.

**Fix:**
- Force-close Expo Go and reopen — it usually works on the second attempt
- Update Expo Go to the latest version from the Play Store
- Clear Expo Go's app data: Settings → Apps → Expo Go → Clear Data

## Step 2: Check SDK Version Compatibility

Your project uses Expo SDK 54 (`expo ~54.0.33`). The Expo Go app on your phone must match.

```bash
# Verify your SDK version
npx expo --version

# The terminal output when running npx expo start shows the required Expo Go version
npx expo start
```

If there's a mismatch: update Expo Go from the Play Store, or run `npx expo install --fix` to align your project.

## Step 3: Check New Architecture

Your project has `"newArchEnabled": true` in app.json. The new React Native architecture can cause crashes on some devices if dependencies aren't fully compatible.

**Quick test:** Temporarily set `"newArchEnabled": false` in app.json and restart. If the crash stops, run `npx expo-doctor` to identify which packages aren't new-architecture-ready.

## Step 4: Clear All Caches

```bash
# Clear Metro cache
npx expo start -c

# If that doesn't help, full reset
rm -rf node_modules
npm install
npx expo install --fix
npx expo start -c
```

## Step 5: Get Crash Logs

If none of the above fixes it, get the actual crash reason:

```bash
# Connect Samsung via USB (enable USB debugging first)
adb logcat *:E | grep -i "expo"

# Or capture full crash log
adb logcat -d > crash_log.txt
```

The crash log will tell you exactly what's failing — share it and we can pinpoint the issue.

## Quick Checklist

- [ ] Expo Go updated to latest from Play Store (or APK from expo.dev/go)
- [ ] SDK version in project matches Expo Go version on device
- [ ] Tried with `newArchEnabled: false`
- [ ] Cleared Metro cache with `npx expo start -c`
- [ ] Ran `npx expo-doctor` to check for issues
- [ ] Checked `adb logcat` for specific error
