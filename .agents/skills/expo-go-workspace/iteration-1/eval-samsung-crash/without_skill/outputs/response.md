# Expo Go Crashing on Samsung Galaxy — Troubleshooting

Here are the most likely causes and fixes, ordered by probability:

## 1. Expo Go Version Mismatch

Your project uses Expo SDK 54. If the Expo Go app on your Samsung is outdated, it will crash before loading.

**Fix:** Update Expo Go from the Google Play Store to the latest version.

## 2. New Architecture Incompatibility

Your `app.json` has `"newArchEnabled": true`. The new React Native architecture may not be fully stable on all devices.

**Quick test:** Set `"newArchEnabled": false` in `app.json`, restart the dev server, and try again. If this fixes it, one of your dependencies may not support the new architecture yet.

## 3. Cache / Stale Bundle

A corrupted Metro cache can cause crashes on load.

```bash
npx expo start -c
```

If that doesn't help:
```bash
rm -rf node_modules
npm install
npx expo start -c
```

## 4. Samsung-Specific Memory Issues

Samsung's One UI has aggressive battery and memory optimization that can kill apps during initialization.

**Fix:**
- Go to Settings → Apps → Expo Go → Battery → set to "Unrestricted"
- Go to Settings → Device care → Memory → exclude Expo Go from auto-optimization

## 5. Check Crash Logs

If none of the above works, connect via USB and check the actual error:

```bash
# Enable USB debugging on your Samsung first
adb logcat *:E | grep -i "expo\|react\|fatal"
```

This will show the exact crash reason so we can target the fix.

## Quick Summary

| Try This | Why |
|----------|-----|
| Update Expo Go from Play Store | SDK version mismatch |
| Set `newArchEnabled: false` | New arch instability |
| `npx expo start -c` | Stale Metro cache |
| Disable Samsung battery optimization | Samsung kills the process |
| `adb logcat` | Get the real error |
