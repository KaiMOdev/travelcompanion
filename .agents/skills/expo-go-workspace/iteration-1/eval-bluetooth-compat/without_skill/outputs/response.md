# Bluetooth in Expo Go

**No, Bluetooth scanning will not work in Expo Go.**

Expo Go comes with a fixed set of native modules (the Expo SDK), and Bluetooth Low Energy (BLE) is not among them. The most popular library for BLE in React Native is `react-native-ble-plx`, which requires native code that isn't bundled in Expo Go.

## What You Need Instead

You'll need to switch to a **development build** using `expo-dev-client`. This creates a custom version of Expo Go that includes whatever native modules your project needs.

### Steps:

1. Install the dev client package:
   ```bash
   npx expo install expo-dev-client
   ```

2. Install a BLE library:
   ```bash
   npm install react-native-ble-plx
   ```

3. Create development builds:
   ```bash
   eas build --profile development --platform android
   eas build --profile development --platform ios
   ```

4. Run your app with the dev client instead of Expo Go:
   ```bash
   npx expo start --dev-client
   ```

The development workflow (hot reload, QR code scanning, etc.) stays the same — you just use your custom build instead of the Expo Go app from the store.

## Permissions

You'll also need to add Bluetooth permissions:
- **Android:** `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION` in `app.json`
- **iOS:** `NSBluetoothAlwaysUsageDescription` in `infoPlist`
