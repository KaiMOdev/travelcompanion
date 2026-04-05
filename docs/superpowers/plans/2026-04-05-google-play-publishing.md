# VoxLingo Google Play Publishing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare VoxLingo for Google Play Store submission using EAS Build + EAS Submit.

**Architecture:** Configure Expo managed workflow for production Android builds via EAS. Create dynamic config (`app.config.ts`) for environment-based settings with production validation, set up EAS build profiles with per-environment variables, fix the reanimated babel issue, and configure API keys via EAS build-time injection.

**Tech Stack:** Expo SDK 54, EAS Build/Submit, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-05-google-play-publishing-design.md`
**GPT Review:** `.reviews/consult_20260405_183413.md`

**Important notes (from GPT review):**
- `EXPO_PUBLIC_*` values are **public config** embedded in the app bundle, not secrets. Use EAS secrets for build-time injection, but understand these values are visible in the built app.
- Server-side API keys (Gemini, OpenAI) must NEVER be in the mobile app — they stay on the backend only.
- Production builds must fail if `EXPO_PUBLIC_SERVER_URL` is not set (no local IP fallback).

---

### Task 1: Fix Babel Config (Remove reanimated plugin)

**Files:**
- Modify: `voxlingo/babel.config.js`

- [ ] **Step 1: Fix babel.config.js**

Remove the `react-native-reanimated/plugin` reference. It's not installed and violates the project's CLAUDE.md constraint ("No react-native-reanimated — crashes Expo Go").

Change `voxlingo/babel.config.js` from:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

To:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
```

- [ ] **Step 2: Verify the app still starts**

Run: `cd voxlingo && npx expo start --no-dev --minify`
Expected: Metro bundler starts without errors. Press `a` to confirm Android bundle resolves.
(Cancel with Ctrl+C after confirming no errors.)

- [ ] **Step 3: Commit**

```bash
git add voxlingo/babel.config.js
git commit -m "fix: remove react-native-reanimated plugin from babel config"
```

---

### Task 2: Update app.json for Android Play Store

**Files:**
- Modify: `voxlingo/app.json`

**Important:** Merge surgically — do NOT replace the entire file. Only add/change what's needed for Play Store.

- [ ] **Step 1: Update app.json**

Apply these specific changes to `voxlingo/app.json`:

1. Change `"name": "voxlingo"` → `"name": "VoxLingo"` (store display name)
2. Keep `"platforms": ["ios", "android", "web"]` as-is (removing platforms can break dev tooling)
3. Add `"package"` and `"versionCode"` to the `android` section
4. Keep `"permissions": ["CAMERA", "RECORD_AUDIO"]` — do NOT add location permissions unless the app actually uses GPS (expo-location). If culture tips use IP-based geolocation only, location permissions are unnecessary and increase Play review scrutiny.
5. Keep existing `ios`, `web`, and `plugins` sections untouched
6. Optionally update splash `backgroundColor` from `#ffffff` to a brand color

The resulting `app.json`:

```json
{
  "expo": {
    "name": "VoxLingo",
    "slug": "voxlingo",
    "version": "1.0.0",
    "scheme": "voxlingo",
    "platforms": ["ios", "android", "web"],
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    },
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Camera access is needed to translate photos of text."
      }
    },
    "android": {
      "package": "com.voxlingo.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1a1a2e"
      },
      "permissions": ["CAMERA", "RECORD_AUDIO"]
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

Key changes from current:
- `name` capitalized to `"VoxLingo"` (store display name)
- Added `android.package`: `"com.voxlingo.app"` (permanent bundle ID — choose carefully, cannot change after first upload)
- Added `android.versionCode`: `1`
- Updated `backgroundColor` to `#1a1a2e` (brand color)
- Preserved `ios`, `web`, `plugins` sections unchanged

- [ ] **Step 2: Run pre-build validation**

Run: `cd voxlingo && npx expo-doctor && npx expo config --type public 2>&1 | head -40`
Expected: expo-doctor passes. Config output shows `android.package` = `com.voxlingo.app` and no errors.

- [ ] **Step 3: Verify assets exist and are valid**

Run: `cd voxlingo && ls -la assets/icon.png assets/adaptive-icon.png assets/splash-icon.png`
Expected: All three files exist. Icon should be 1024x1024 PNG.

- [ ] **Step 4: Commit**

```bash
git add voxlingo/app.json
git commit -m "feat: configure app.json for Google Play Store submission"
```

---

### Task 3: Create Dynamic Config (app.config.ts)

**Files:**
- Create: `voxlingo/app.config.ts`

**Important:** Production builds MUST fail if `EXPO_PUBLIC_SERVER_URL` is missing. No local IP fallback for production.

- [ ] **Step 1: Create app.config.ts**

Create `voxlingo/app.config.ts`:

```ts
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = process.env.APP_ENV ?? "development";
  const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL;

  if (appEnv === "production" && !serverUrl) {
    throw new Error(
      "EXPO_PUBLIC_SERVER_URL is required for production builds. " +
      "Set it via EAS secrets or environment variables."
    );
  }

  return {
    ...config,
    name: "VoxLingo",
    slug: "voxlingo",
    extra: {
      ...config.extra,
      appEnv,
      serverUrl: serverUrl ?? "http://localhost:3001",
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    },
  };
};
```

Notes:
- `APP_ENV` is set per build profile in `eas.json` (Task 4)
- Production builds throw if `EXPO_PUBLIC_SERVER_URL` is missing — prevents shipping a dead app
- Development fallback uses `localhost:3001` (not a local network IP)
- All `EXPO_PUBLIC_*` values are **public config** embedded in the app bundle — they are NOT secrets
- `...config.extra` preserves any extra fields added by `eas init` (like `eas.projectId`)

- [ ] **Step 2: Validate merged config**

Run: `cd voxlingo && npx expo config --type public 2>&1 | head -40`
Expected: Output shows merged config with both `app.json` fields and `extra` block. No errors.

- [ ] **Step 3: Commit**

```bash
git add voxlingo/app.config.ts
git commit -m "feat: add dynamic app.config.ts with production validation"
```

---

### Task 4: Create EAS Build Configuration

**Files:**
- Create: `voxlingo/eas.json`

- [ ] **Step 1: Create eas.json**

Create `voxlingo/eas.json`:

```json
{
  "cli": {
    "version": ">= 15.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "APP_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "APP_ENV": "preview"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "autoIncrement": true,
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

Key improvements (from GPT review):
- Each profile sets `APP_ENV` so `app.config.ts` can validate per environment
- Production profile uses `app-bundle` (AAB required by Play Store)
- Preview profile builds APK for sideload testing (not uploaded to Play)

- [ ] **Step 2: Commit**

```bash
git add voxlingo/eas.json
git commit -m "feat: add EAS build profiles with per-environment config"
```

---

### Task 5: Update .gitignore and .env.example

**Files:**
- Modify: `voxlingo/.gitignore`
- Modify: `voxlingo/.env.example`

- [ ] **Step 1: Add service account key to .gitignore**

Append to `voxlingo/.gitignore`:

```
# Google Play service account key (never commit)
google-service-account.json
```

- [ ] **Step 2: Update .env.example — app public config only**

Replace `voxlingo/.env.example` with app-side public config only. Server-side secrets (Gemini, OpenAI) belong in `server/.env` only and must NEVER be in the mobile app:

```
# === APP PUBLIC CONFIG (embedded in app bundle — NOT secret) ===

# Firebase (get from https://console.firebase.google.com)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id

# Google Maps (get from https://console.cloud.google.com — restrict to Android apps)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Google OAuth (get from https://console.cloud.google.com)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Backend server URL (REQUIRED for production builds)
EXPO_PUBLIC_SERVER_URL=http://localhost:3001
```

- [ ] **Step 3: Commit**

```bash
git add voxlingo/.gitignore voxlingo/.env.example
git commit -m "chore: update gitignore and env example for Play Store publishing"
```

---

### Task 6: EAS Initialization and Secrets Setup (Manual / Interactive)

This task requires user interaction — it cannot be fully automated.

- [ ] **Step 1: Install EAS CLI**

Run: `npm install -g eas-cli`
Expected: EAS CLI installs globally.

- [ ] **Step 2: Login to Expo**

Run: `cd voxlingo && eas login`
Expected: Prompts for Expo account credentials. Login succeeds.

- [ ] **Step 3: Initialize EAS project**

Run: `cd voxlingo && eas init`
Expected: Links the project to the Expo account. May add `extra.eas.projectId` to config. Verify the diff afterwards — `app.config.ts` uses `...config.extra` to preserve this.

- [ ] **Step 4: Configure EAS build-time variables**

These values are injected at build time. Note: `EXPO_PUBLIC_*` values become **public** in the built app — they are config, not secrets.

Run each command, replacing `"..."` with actual (rotated) values:

```bash
cd voxlingo
eas secret:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "..."
eas secret:create --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "..."
eas secret:create --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "..."
eas secret:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "..."
eas secret:create --name EXPO_PUBLIC_SERVER_URL --value "https://your-production-url.com"
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "..."
```

- [ ] **Step 5: Restrict Google Maps API key**

In Google Cloud Console:
1. Go to APIs & Services → Credentials
2. Select the Maps API key
3. Under "Application restrictions", select "Android apps"
4. Add package name `com.voxlingo.app` + SHA-1 certificate fingerprint
5. Under "API restrictions", enable only the APIs you use

- [ ] **Step 6: Verify secrets**

Run: `cd voxlingo && eas secret:list`
Expected: All 6 secrets listed.

---

### Task 7: Pre-Build Validation & Preview Build

- [ ] **Step 1: Run pre-build checks**

```bash
cd voxlingo
npx expo-doctor
npx expo install --check
npx expo config --type public
```

Expected: All pass. Fix any issues before proceeding.

- [ ] **Step 2: Run preview build**

Run: `cd voxlingo && eas build --platform android --profile preview`
Expected: Build queues on EAS servers. Wait for completion (5-15 minutes). Build succeeds and produces an APK download URL.

- [ ] **Step 3: Test the APK**

Download the APK from the URL provided by EAS. Install on an Android device or emulator:

```bash
adb install path/to/downloaded.apk
```

Test checklist:
- [ ] App launches without crashing
- [ ] Voice translation screen loads
- [ ] Camera screen opens and permission prompt appears (real device only)
- [ ] Culture tab loads content
- [ ] Permission denial doesn't crash the app
- [ ] App recovers from background/foreground transitions
- [ ] Check device logs: `adb logcat | grep -i "voxlingo\|crash\|error"`

- [ ] **Step 4: Fix any issues found**

If the build fails or the app crashes, debug and fix before proceeding. Common issues:
- Missing native module → check `app.json` plugins
- Babel errors → verify reanimated plugin was removed
- API calls fail → expected if backend not hosted yet; verify the app handles errors gracefully (no crash)

---

### Task 8: Production Release Gates & Build

**HARD GATES — do not proceed until all are met:**

- [ ] Production backend is live at an HTTPS URL
- [ ] `EXPO_PUBLIC_SERVER_URL` EAS secret points to that URL
- [ ] All exposed API keys have been rotated
- [ ] Google Maps API key is restricted to Android + package name
- [ ] Privacy policy is hosted at a public URL
- [ ] Preview APK testing passed (Task 7)
- [ ] Store listing claims match actual implemented features

- [ ] **Step 1: Run production build**

Run: `cd voxlingo && eas build --platform android --profile production`
Expected: Build queues on EAS servers. Produces a signed AAB (Android App Bundle) download URL. `versionCode` auto-increments.

- [ ] **Step 2: Verify AAB**

Download the AAB. Optionally test with bundletool:

```bash
java -jar bundletool.jar build-apks --bundle=app.aab --output=app.apks --mode=universal
java -jar bundletool.jar install-apks --apks=app.apks
```

Or proceed directly to Play Console upload (AAB is validated on upload).

---

### Task 9: Google Play Console Setup (Manual)

This task is entirely in the Google Play Console web UI.

- [ ] **Step 1: Create app in Play Console**

Go to Google Play Console → Create app:
- App name: `VoxLingo`
- Default language: English (US)
- App type: App
- Free or paid: Free
- Declarations: Accept all

- [ ] **Step 2: Complete store listing**

Fill in:
- Short description (80 chars): `Real-time voice translation and cultural guide for travelers`
- Full description: Use the draft from the spec (verify all claims match implemented features)
- App icon: Upload 512x512 PNG (resize from existing `assets/icon.png`, ensure no alpha channel)
- Feature graphic: Upload 1024x500 PNG (needs to be created)
- Screenshots: Upload at least 2 phone screenshots (capture from preview APK)
- Category: Travel & Local
- Privacy policy URL: Link to hosted privacy policy

- [ ] **Step 3: Complete content rating**

Go to Policy → App content → Content rating:
- Start IARC questionnaire
- Answer: no violence, no gambling, no mature content
- Declare: uses camera, microphone, internet
- Only declare location if the app actually requests GPS permission
- Expected rating: likely Everyone (confirmed after questionnaire)

- [ ] **Step 4: Complete data safety**

Go to Policy → App content → Data safety. Review each category carefully against Google's definitions:

- **Audio data** — collected for translation, processed ephemerally via backend API, encrypted in transit, not stored permanently, not shared with third parties
- **Camera/photos** — collected for photo translation, processed ephemerally, encrypted in transit, not stored, not shared
- **Location** (only if app uses GPS) — approximate, used for cultural recommendations, not shared
- No personal data sold
- Confirm whether account creation is required (check Firebase auth flow)
- Declare data is encrypted in transit (HTTPS)

- [ ] **Step 5: Complete remaining App Content declarations**

- App access: no restricted access
- Ads: no ads
- Target audience: general (not directed at children)
- News app: not a news app

- [ ] **Step 6: Set up internal testing track**

Go to Testing → Internal testing → Create new release:
- Upload the AAB from Task 8
- Add tester email addresses
- Roll out to internal testing

Note: Internal testing is usually the fastest distribution path but policy declarations are still required.

- [ ] **Step 7: Test via internal track**

Install the app via the internal testing link on a real device. Full test:
- [ ] Fresh install works
- [ ] All main features functional
- [ ] Permission prompts appear at the right time
- [ ] Permission denial is handled gracefully
- [ ] App works on mobile network (not just Wi-Fi)
- [ ] Backend API calls succeed via HTTPS

---

### Task 10: Submit to Production

- [ ] **Step 1: Promote to production**

Option A — via EAS Submit:
```bash
cd voxlingo && eas submit --platform android --profile production
```

Option B — via Play Console:
Go to Production → Create new release → Upload AAB → Review and roll out.

- [ ] **Step 2: Wait for review**

Google reviews take 1-7 days for first submission. Monitor the Play Console for status updates. Common rejection reasons:
- Missing or inadequate privacy policy
- Requesting unnecessary permissions
- App crashes on launch
- Misleading store listing vs actual functionality
- Incomplete data safety declarations

Address any rejection feedback promptly and resubmit.

- [ ] **Step 3: Commit any final config changes**

```bash
git add -A
git commit -m "chore: finalize Google Play Store configuration"
```

---

## Verification Checklist

- [ ] Babel config has no reanimated plugin
- [ ] `app.json` has `android.package`, `versionCode`, minimal permissions
- [ ] `app.config.ts` throws on missing `EXPO_PUBLIC_SERVER_URL` in production
- [ ] `eas.json` has dev/preview/production profiles with `APP_ENV` per profile
- [ ] `.gitignore` includes `google-service-account.json`
- [ ] EAS build-time variables configured for all `EXPO_PUBLIC_*` vars
- [ ] Google Maps API key restricted to Android + package name
- [ ] No server-side API keys (Gemini, OpenAI) in mobile app
- [ ] Privacy policy hosted and accurate
- [ ] All exposed API keys rotated
- [ ] `npx expo-doctor` passes
- [ ] Preview APK installs and runs without crashes
- [ ] Production backend live at HTTPS URL
- [ ] Production AAB builds successfully
- [ ] Play Console store listing complete (all declarations filled)
- [ ] Internal testing track works on real device
- [ ] Store listing claims match actual features
- [ ] App submitted for production review

---

## iOS (Future — Not In Scope)

When ready to add iOS:
1. Sign up for Apple Developer Program ($99/year)
2. Add `ios.bundleIdentifier` to app config
3. Add iOS build profiles to eas.json
4. EAS Build handles code signing automatically (no Mac required for builds)
5. Submit via EAS Submit to App Store Connect
6. Note: TestFlight review is faster than App Store review (~1 day)
