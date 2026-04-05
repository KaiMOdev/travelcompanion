# Bluetooth Support in Expo Go

**Short answer: No, Bluetooth scanning will not work in Expo Go.** You would need to switch to a development build.

## Why It Won't Work

Bluetooth Low Energy (BLE) functionality requires the `react-native-ble-plx` or `react-native-ble-manager` library, both of which contain custom native code (native modules written in Swift/Kotlin) that is **not included in the Expo Go runtime**. Expo Go ships with a fixed set of native modules (the Expo SDK), and Bluetooth is not among them.

This is a hard boundary -- there is no pure-JS workaround for Bluetooth hardware access.

## What You Would Need To Do

To add Bluetooth support, you need to create a **development build** using `expo-dev-client`. This creates a custom version of Expo Go that includes your specific native dependencies, while keeping the same development workflow (hot reload, QR code scanning, etc.).

Steps:

```bash
# 1. Install the dev client package
npx expo install expo-dev-client

# 2. Install a BLE library
npx expo install react-native-ble-plx

# 3. Add required permissions to app.json (see below)

# 4. Create a development build via EAS
eas build --profile development --platform android
eas build --profile development --platform ios

# 5. Start the dev server in dev-client mode
npx expo start --dev-client
```

Required `app.json` permission additions:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSBluetoothAlwaysUsageDescription": "This app uses Bluetooth to scan for nearby devices"
      }
    },
    "android": {
      "permissions": [
        "BLUETOOTH_SCAN",
        "BLUETOOTH_CONNECT",
        "ACCESS_FINE_LOCATION"
      ]
    }
  }
}
```

## Impact on Your Current Setup

VoxLingo currently runs in Expo Go because all its dependencies (expo-camera, expo-av, expo-location, firebase JS SDK, socket.io-client) are compatible with the managed workflow. Adding Bluetooth would be the first dependency that forces you out of Expo Go and into development builds.

The day-to-day workflow stays nearly identical with `expo-dev-client` -- hot reload, QR code scanning, and the developer menu all still work. The main difference is you need to run `eas build` to create the custom app binary, and rebuild whenever you add or update native dependencies.

## Recommendation

Before committing, consider whether Bluetooth scanning is essential to VoxLingo's core translation functionality. If it is a nice-to-have, you may want to defer it to keep the simpler Expo Go workflow. If it is required, switching to a dev build is straightforward.
