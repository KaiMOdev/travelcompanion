# Common Issues & Troubleshooting — Expo Go

## Table of Contents
1. [Connection & Network Issues](#connection--network-issues)
2. [Metro Bundler Problems](#metro-bundler-problems)
3. [Module Resolution Failures](#module-resolution-failures)
4. [Asset Loading Problems](#asset-loading-problems)
5. [Version Mismatches](#version-mismatches)
6. [Expo Go vs Dev Client Decision Points](#expo-go-vs-dev-client-decision-points)
7. [Performance Debugging](#performance-debugging)
8. [Environment & Tooling](#environment--tooling)

---

## Connection & Network Issues

### "Network request failed" / "Could not connect to development server"

**Check in order:**
1. Device and computer on same Wi-Fi network?
2. Firewall blocking port 8081? (Windows Defender, corporate firewalls)
3. VPN active? Disconnect or use tunnel mode
4. Multiple network interfaces confusing Metro? Set `REACT_NATIVE_PACKAGER_HOSTNAME`

```bash
# Force Metro to use a specific IP
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.100   # Windows
export REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.100 # macOS/Linux

npx expo start
```

**Tunnel mode** bypasses all local network issues:
```bash
npx expo start --tunnel
# First time installs @expo/ngrok automatically
```

**Android emulator specifically:**
```bash
# Emulator can't reach localhost — forward the ports
adb reverse tcp:8081 tcp:8081   # Metro
adb reverse tcp:3001 tcp:3001   # Your backend server
```

### "This is taking much longer than it should"
**Cause:** Expo Go can reach the server but the JS bundle is huge or the connection is slow.
**Fixes:**
- Clear cache: `npx expo start -c`
- Check bundle size: `npx expo-atlas`
- Use LAN mode (default) instead of tunnel for faster transfers
- On very slow connections, try `npx expo export` to pre-build the bundle

### Socket.io / WebSocket Connection Failures
Relevant to VoxLingo — the app uses socket.io for real-time audio streaming.

**Common causes:**
- Server URL hardcoded to `localhost` — won't work from a physical device
- CORS not configured for the device's origin
- Expo Go's URL scheme confuses origin detection

**Fix:** Use your machine's LAN IP for the server URL, not localhost:
```typescript
// Use environment-aware server URL
const SERVER_URL = __DEV__
  ? 'http://192.168.1.100:3001'  // Your machine's LAN IP
  : 'https://production-server.com';
```

---

## Metro Bundler Problems

### Metro Crashes or Hangs
```bash
# Nuclear option — clear everything
npx expo start -c                    # Clear Metro cache
rm -rf node_modules && npm install   # Fresh node_modules
npx expo install --fix               # Fix version mismatches
```

### "Unable to resolve module"
**Cause:** Usually a caching issue after installing a new package.
**Fix:** Restart Metro with cache clear: `npx expo start -c`

If that doesn't work:
1. Delete `node_modules` and reinstall
2. Check the import path — typos are common
3. Verify the package is installed: `npm ls <package-name>`
4. Some packages need Metro config changes for non-standard exports

### Slow Bundling
**Causes & fixes:**
- First bundle after cache clear is always slow — wait for it
- Large number of files? Check for accidentally imported directories
- Antivirus scanning node_modules? Exclude the project directory
- Windows-specific: Enable "Developer Mode" in Windows Settings for faster file operations

---

## Module Resolution Failures

### "Invariant Violation: Native module cannot be null"
**Cause:** Trying to use a native module that isn't included in Expo Go.
**Fix:** Either:
1. Switch to an Expo SDK equivalent (e.g., `expo-camera` instead of `react-native-camera`)
2. Create a development build with `expo-dev-client`

### "ViewManagerResolver returned null" or similar
**Cause:** A native view component isn't available in Expo Go.
**Same fix as above** — check if there's an Expo SDK alternative.

### Checking Expo Go Compatibility
Before installing a library, check if it works with Expo Go:
1. Is it a pure JS library? (Always works)
2. Is it an Expo SDK package? (Always works in Expo Go)
3. Does it have native code? Check the library's docs for Expo compatibility
4. Use `npx expo-doctor` to check for incompatibilities after installing

---

## Asset Loading Problems

### Images Not Showing
```typescript
// Local images — use require()
<Image source={require('../assets/icon.png')} />

// Remote images — MUST specify dimensions
<Image
  source={{ uri: 'https://example.com/photo.jpg' }}
  style={{ width: 200, height: 200 }}  // Required for remote images!
/>
```

**Common mistakes:**
- Remote images without explicit width/height render as 0x0
- Using `file://` paths that don't exist on the device
- Forgetting to add assets to the `assets` array in `app.json`

### Fonts Not Loading
```typescript
import { useFonts, SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';

const [fontsLoaded] = useFonts({ SpaceGrotesk_600SemiBold });

if (!fontsLoaded) return null; // or splash screen
```

**Android font gotcha:** The font name used in `fontFamily` must exactly match the key you passed to `useFonts`. On iOS, the font's internal metadata name is used instead. Using the object key from `useFonts` works cross-platform.

### Audio/Video Assets (expo-av)
```typescript
// Local audio
const { sound } = await Audio.Sound.createAsync(
  require('../assets/notification.mp3')
);

// Remote audio — works but needs network
const { sound } = await Audio.Sound.createAsync(
  { uri: 'https://example.com/audio.mp3' }
);
```

**iOS silent mode:** Audio won't play in silent mode by default. Configure the audio mode:
```typescript
await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
```

---

## Version Mismatches

### "This project is not compatible with this version of Expo Go"
This is the most common Expo Go error. It means the SDK version in your project doesn't match the Expo Go app on the device.

**Diagnosis:**
```bash
# Check your SDK version
npx expo --version
cat node_modules/expo/package.json | grep version

# Check which Expo Go version is needed
npx expo start  # The terminal shows the required Expo Go version
```

**Fixes:**
1. Update Expo Go on the device (App Store / Play Store)
2. Or downgrade your project SDK: `npx expo install expo@<version>`
3. Or use `npx expo start` which serves an OTA-compatible version

### Dependency Version Conflicts
```bash
# Check for issues
npx expo-doctor

# Auto-fix Expo package versions
npx expo install --fix

# Check for peer dependency issues
npm ls 2>&1 | grep "ERESOLVE\|peer dep"
```

**Common conflict:** React Native version vs Expo SDK version. Always let Expo manage the React Native version — don't manually install a different one.

---

## Expo Go vs Dev Client Decision Points

You should switch from Expo Go to a development build when:

| Signal | Action |
|--------|--------|
| Need `react-native-ble-plx` or other BLE library | Dev build |
| Need in-app purchases (`react-native-iap`) | Dev build |
| Need custom native module (Swift/Kotlin) | Dev build |
| Need background audio or background location | Dev build (usually) |
| Library README says "requires linking" or "pod install" | Dev build |
| `npx expo-doctor` says "not compatible with Expo Go" | Dev build |
| Everything uses Expo SDK packages + pure JS | Stay on Expo Go |

**Switching is easy:**
```bash
npx expo install expo-dev-client
eas build --profile development --platform all
# Then use: npx expo start --dev-client
```

The development experience (hot reload, QR code, etc.) stays the same.

---

## Performance Debugging

### Identifying Frame Drops
```bash
# Press j in the Expo CLI terminal to open Chrome DevTools
# Enable "Highlight updates when components render" in React Profiler
```

**Common causes of jank on Android:**
- Large lists without `FlatList` virtualization
- Heavy `useEffect` computations on mount
- Unoptimized images (use `expo-image` instead of `Image`)
- Animated components not using `useNativeDriver: true`

### React Compiler (Best Single Optimization)
Enable in `babel.config.js`:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['babel-plugin-react-compiler'],  // Add this
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};
```

### Profiling Startup Time
```bash
# Analyze bundle size
npx expo-atlas

# Check what's importing what
npx expo export --dump-sourcemap
```

---

## Environment & Tooling

### Windows-Specific Issues
- **Long path names:** Enable long paths in Windows or keep project near drive root (`C:\Projects\` not `C:\Users\longname\Documents\deep\nested\`)
- **File watching:** Metro's file watcher can be slow on Windows. Enable Developer Mode in Windows Settings
- **Line endings:** Git may convert LF to CRLF causing issues. Set `git config core.autocrlf input`
- **PowerShell vs Git Bash:** Expo CLI works in both, but some scripts assume bash. Git Bash is more reliable

### macOS-Specific Issues
- **Xcode CLI tools:** Required even for Expo Go development: `xcode-select --install`
- **Watchman:** Improves file watching: `brew install watchman`
- **Port conflicts:** macOS AirPlay Receiver uses port 5000. Check with `lsof -i :8081`

### Useful Debug Commands
```bash
# Full health check
npx expo-doctor

# Check what Expo Go version your project needs
npx expo start --help

# Reset all caches
npx expo start -c && rm -rf /tmp/metro-*

# Check installed vs expected versions
npx expo install --check
```
