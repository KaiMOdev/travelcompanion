---
name: expo-go
description: Expert guidance for Expo Go development on Android and iOS — dev server setup, platform-specific behavior, debugging, native module compatibility, and deployment workflows. Use this skill whenever working with Expo Go, running `expo start`, troubleshooting device connectivity, dealing with platform differences between Android and iOS, checking if a library works in Expo Go (managed workflow), handling build errors, or configuring app.json for either platform. Also trigger when the user mentions "it works on iOS but not Android" (or vice versa), hot reload issues, dev client vs Expo Go questions, Metro bundler problems, or any expo-related CLI commands. Even if the user just says "the app won't load on my phone" or "Android is crashing," check this skill — it likely applies.
---

# Expo Go Development — Android & iOS

You are an expert in Expo Go development across both Android and iOS. This skill gives you deep knowledge of how Expo Go works on each platform, what's compatible, common pitfalls, and the workflows that keep development smooth.

## When Expo Go vs Dev Client

Understanding this boundary is critical — it determines what advice to give.

**Expo Go** is the pre-built app from the App Store / Play Store. It includes a fixed set of native modules (the Expo SDK). If a project only uses Expo SDK packages and pure-JS libraries, Expo Go works. The moment custom native code or an unsupported native module is needed, you must switch to a **development build** (`expo-dev-client`).

| Scenario | Use Expo Go | Use Dev Build |
|----------|:-----------:|:-------------:|
| Expo SDK packages only (expo-camera, expo-av, etc.) | Yes | Also works |
| Pure JS libraries (socket.io-client, date-fns) | Yes | Also works |
| Libraries with native code not in Expo SDK | No | Yes |
| Custom native modules (Swift/Kotlin) | No | Yes |
| Push notifications via expo-notifications | Yes | Also works |
| In-app purchases | No | Yes |
| Bluetooth (react-native-ble) | No | Yes |

For this project (VoxLingo), Expo Go is the right choice — all dependencies (expo-camera, expo-av, expo-location, firebase JS SDK, socket.io-client) are compatible.

## Development Workflow

### Starting the Dev Server

```bash
# Standard start — shows QR code for both platforms
npx expo start

# Platform-specific shortcuts
npx expo start --android    # Opens on connected Android device/emulator
npx expo start --ios        # Opens on iOS Simulator (macOS only)

# Clear Metro cache (fixes stale bundle issues)
npx expo start -c

# Tunnel mode (when device and computer are on different networks)
npx expo start --tunnel
```

### Connecting a Device

**Same Wi-Fi network** is the default requirement. Both the dev machine and mobile device must be on the same local network.

**Android:**
1. Install "Expo Go" from Play Store
2. Scan QR code from terminal with Expo Go app's built-in scanner
3. Or type the `exp://` URL manually

**iOS:**
1. Install "Expo Go" from App Store
2. Scan QR code with the **native Camera app** (not inside Expo Go)
3. Tap the banner that appears to open in Expo Go

**When same-network doesn't work** (corporate Wi-Fi, firewalls, VPN):
- Use `--tunnel` mode (installs `@expo/ngrok` automatically)
- Or connect Android via USB and use `adb reverse tcp:8081 tcp:8081`

### Hot Reload & Fast Refresh

Fast Refresh is on by default. It preserves React state across edits. Key points:
- **Works on both platforms** identically for JS/TS changes
- **Does NOT apply** to app.json changes — restart the server
- **Does NOT apply** to native config changes — rebuild required
- Shake device to open developer menu (or press `m` in terminal)
- Press `j` in terminal to open React DevTools

## Platform Differences

This is where most bugs hide. Read the relevant reference file for deep dives:

- `references/android.md` — Android-specific behavior, shadow/elevation, permissions, keyboard handling
- `references/ios.md` — iOS-specific behavior, safe areas, permissions, App Transport Security

Read only the reference file relevant to the current issue — don't load both unless the task spans both platforms.

### Quick Reference: Common Platform Divergences

| Feature | Android | iOS |
|---------|---------|-----|
| **Shadows** | `elevation` property only | `shadowColor/Offset/Opacity/Radius` |
| **Keyboard** | Pushes view up by default | Covers content by default |
| **Fonts** | Name must match filename exactly | Name comes from font metadata |
| **Status bar** | Translucent by default in Expo | Opaque by default |
| **Permissions** | Requested at runtime + declared in manifest | Requested at runtime via dialog |
| **Back button** | Hardware back button exists | No hardware back; use navigation |
| **Scroll bounce** | No overscroll bounce | Natural bounce effect |
| **Text rendering** | Slightly different line heights | Slightly different line heights |
| **Linking** | Intent-based deep links | Universal Links |
| **Audio focus** | Must manage AudioFocus | AVAudioSession categories |

### Writing Cross-Platform Code

Use `Platform.OS` for small divergences, `Platform.select()` for style objects:

```typescript
import { Platform } from 'react-native';

// Conditional logic
if (Platform.OS === 'android') {
  // Android-specific behavior
}

// Style selection
const styles = StyleSheet.create({
  card: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
```

For larger platform differences, use platform-specific files:
- `Component.ios.tsx` and `Component.android.tsx`
- Metro resolves the correct file automatically

## Common Issues & Debugging

See `references/common-issues.md` for a comprehensive troubleshooting guide covering:
- "Network request failed" errors
- Metro bundler crashes and cache issues
- Module resolution failures
- Asset loading problems
- Permission denial patterns
- Expo Go version mismatches

### Quick Debug Checklist

When something breaks in Expo Go:
1. **Check the terminal** — Metro logs are your first clue
2. **Shake device** → "Open React DevTools" for component inspection
3. **Clear cache** — `npx expo start -c` fixes ~40% of mysterious issues
4. **Check Expo SDK version compatibility** — the Expo Go app version must match the SDK version in package.json
5. **Check `app.json`** — many runtime errors trace back to misconfiguration
6. **Try the other platform** — if it works on one but not the other, it's a platform-specific issue (check the reference files)

## App Configuration (app.json)

Key fields that affect Expo Go behavior:

```json
{
  "expo": {
    "name": "App display name",
    "slug": "url-safe-identifier",
    "version": "1.0.0",
    "orientation": "portrait",
    "newArchEnabled": true,
    "plugins": [],
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "...",
        "NSMicrophoneUsageDescription": "..."
      }
    },
    "android": {
      "adaptiveIcon": { "foregroundImage": "...", "backgroundColor": "..." },
      "permissions": ["CAMERA", "RECORD_AUDIO", "ACCESS_FINE_LOCATION"]
    }
  }
}
```

**Important:** Changes to `app.json` require a full restart of the dev server (`Ctrl+C` then `npx expo start`). Fast Refresh does not pick up config changes.

## Expo SDK Version Management

Expo Go on the user's phone ships with a specific SDK version. Mismatches cause the dreaded "This project is not compatible with this version of Expo Go" error.

```bash
# Check current SDK version
npx expo --version

# Upgrade to latest SDK
npx expo install --fix   # Fixes dependency version mismatches
npx expo-doctor          # Diagnoses version conflicts
```

When upgrading SDK versions, always run `npx expo install --fix` afterward to align all Expo packages.

## EAS Build (When You Outgrow Expo Go)

If a library isn't compatible with Expo Go, the path forward is:

```bash
# Install dev client
npx expo install expo-dev-client

# Create a development build
eas build --profile development --platform android
eas build --profile development --platform ios

# Run with dev client instead of Expo Go
npx expo start --dev-client
```

This creates a custom version of Expo Go that includes your specific native dependencies. The development workflow (hot reload, QR code, etc.) stays the same.
