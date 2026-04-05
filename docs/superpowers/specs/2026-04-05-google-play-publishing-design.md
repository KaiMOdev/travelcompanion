# VoxLingo — Google Play Store Publishing Design

## Context

VoxLingo is a real-time voice translation app built with Expo (SDK 54) and React Native (0.81). The app is functional in development but has no build pipeline, no store configuration, and several issues that must be resolved before publishing. This spec covers everything needed to get VoxLingo onto the Google Play Store. iOS will follow later as a separate effort.

**Current state:**
- Expo managed workflow, no `eas.json` or build profiles
- No bundle identifier (`android.package`) configured
- API keys exposed in `.env` files (committed to git history)
- Babel config references `react-native-reanimated/plugin` (not installed, violates project constraints)
- Backend runs on local IP — user will handle production hosting separately
- No developer accounts created yet

---

## Phase 1: Pre-requisites (Manual / User Action)

These steps require user action outside of code:

1. **Google Play Developer Account** — Sign up at [play.google.com/console](https://play.google.com/console) ($25 one-time fee)
2. **Expo Account** — Sign up at [expo.dev](https://expo.dev) (free tier is fine; paid tier removes build queue waits)
3. **EAS CLI** — Install globally: `npm install -g eas-cli && eas login`
4. **Privacy Policy** — Host a privacy policy at a public URL. Must cover:
   - Data collected: audio recordings (for translation), camera images (for photo translation), device location (for cultural context)
   - How data is processed: sent to Google Gemini API for translation, not stored permanently
   - Third-party services: Google Gemini, Firebase
   - User rights: data deletion, opt-out
5. **Rotate all API keys** — Every key in `.env` and `server/.env` has been exposed in git history and must be regenerated:
   - Google Gemini API key (via Google AI Studio)
   - Google Maps API key (via Google Cloud Console)
   - Firebase credentials (via Firebase Console)
   - OpenAI API key (via OpenAI dashboard)
   - Google OAuth Client ID (via Google Cloud Console)

---

## Phase 2: App Configuration

### 2.1 Convert to Dynamic Config

Create `app.config.ts` to replace static `app.json`. This enables environment-based configuration.

**File:** `voxlingo/app.config.ts`

Key changes:
- Read `EXPO_PUBLIC_*` environment variables dynamically
- Set `android.package` to a chosen bundle ID (e.g., `com.voxlingo.app`)
- Add `android.versionCode: 1` (must increment with each Play Store upload)
- Set `android.adaptiveIcon.backgroundColor` to a brand color
- Keep existing icon/splash/permissions config
- Remove `react-native-reanimated` from babel plugins

### 2.2 Update app.json

Retain `app.json` as the base config (Expo merges `app.config.ts` on top):

```jsonc
{
  "expo": {
    "name": "VoxLingo",
    "slug": "voxlingo",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "voxlingo",
    "platforms": ["android"],  // iOS removed for now
    "android": {
      "package": "com.voxlingo.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1a1a2e"  // Choose brand color
      },
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    }
  }
}
```

**Bundle ID decision:** `com.voxlingo.app` is a placeholder. The user should choose this carefully — it's permanent on the Play Store and cannot be changed after first upload.

### 2.3 Fix Babel Config

**File:** `voxlingo/babel.config.js`

Remove the `react-native-reanimated/plugin` reference. This plugin isn't installed and will cause production build failures. The current config:

```js
plugins: ['react-native-reanimated/plugin']
```

Should be removed entirely (keep only `babel-preset-expo`).

---

## Phase 3: EAS Build Configuration

### 3.1 Initialize EAS

Run `eas init` to link the project to an Expo account.

### 3.2 Create eas.json

**File:** `voxlingo/eas.json`

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
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "autoIncrement": true
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

**Profiles:**
- **development** — debug APK for local device testing with dev client
- **preview** — release APK for internal testers (sideloaded)
- **production** — signed AAB for Google Play (app bundles required by Play Store)

### 3.3 EAS Secrets

Store sensitive environment variables as EAS secrets (not in code):

```bash
eas secret:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "..."
eas secret:create --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "..."
eas secret:create --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "..."
eas secret:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "..."
eas secret:create --name EXPO_PUBLIC_SERVER_URL --value "https://your-production-url.com"
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "..."
```

### 3.4 Google Play Service Account

For automated submission via `eas submit`:

1. Create a Google Cloud project (or use existing Firebase project)
2. Enable the Google Play Android Developer API
3. Create a service account with "Service Account User" role
4. Download the JSON key file → `google-service-account.json`
5. Add `google-service-account.json` to `.gitignore`
6. In Google Play Console, grant the service account access under Settings → API access

---

## Phase 4: Store Listing Assets

### 4.1 Required Assets

| Asset | Spec | Status |
|-------|------|--------|
| App icon | 512x512 PNG, 32-bit, no alpha | Resize from existing 1024x1024 |
| Feature graphic | 1024x500 PNG or JPEG | **Needs creation** |
| Screenshots (phone) | Min 2, max 8. 16:9 or 9:16, min 320px, max 3840px | **Needs creation** |
| Screenshots (tablet) | Optional but recommended, 7" and 10" | Optional |

### 4.2 Store Listing Text

| Field | Max Length | Content |
|-------|-----------|---------|
| App name | 30 chars | VoxLingo |
| Short description | 80 chars | Real-time voice translation and cultural guide for travelers |
| Full description | 4000 chars | See below |
| Category | — | Travel & Local |
| Content rating | — | Complete IARC questionnaire in Play Console |
| Privacy policy URL | — | Link to hosted privacy policy |

**Full description draft:**

> VoxLingo is your AI-powered travel companion that breaks language barriers in real time.
>
> **Voice Translation** — Speak in your language and hear the translation instantly. Supports multiple languages with natural-sounding speech.
>
> **Photo Translation** — Point your camera at signs, menus, or documents and get instant translations overlaid on the image.
>
> **Cultural Guide** — Learn local phrases, tips, and cultural insights for your destination. Understand customs before you arrive.
>
> **Key Features:**
> - Real-time voice-to-voice translation
> - Camera-based text translation
> - Cultural tips and common phrases
> - Works with 50+ languages
> - Offline phrase caching

### 4.3 Content Rating

Complete the IARC rating questionnaire in Google Play Console. VoxLingo should qualify for "Everyone" (no violence, gambling, or mature content). Declare:
- Uses camera (for photo translation)
- Uses microphone (for voice translation)
- Uses location (for cultural recommendations)
- Connects to the internet (required for API calls)

### 4.4 Data Safety Section

Google Play requires a Data Safety declaration:
- **Audio data** — collected and sent to server for translation, not stored permanently
- **Camera/photos** — captured for translation, processed via API, not stored
- **Location** — used to suggest relevant cultural content, approximate location only
- **No personal data sold** to third parties
- **No account required** (unless Firebase auth is mandatory)

---

## Phase 5: Build & Submit Workflow

### 5.1 First Build

```bash
# 1. Login to EAS
eas login

# 2. Initialize project
eas init

# 3. Preview build (test locally first)
eas build --platform android --profile preview

# 4. Download APK and test on device/emulator

# 5. Production build
eas build --platform android --profile production
```

### 5.2 First Submission

```bash
# Submit to Google Play (internal testing track)
eas submit --platform android --profile production
```

Or manually upload the AAB via Google Play Console → Internal testing → Create new release.

### 5.3 Testing Tracks (Recommended Progression)

1. **Internal testing** (up to 100 testers) — immediate availability, no review
2. **Closed testing** (limited users via email list) — reviewed by Google
3. **Open testing** (public opt-in beta) — reviewed by Google
4. **Production** — full public release, reviewed by Google

Recommendation: Start with Internal testing, fix any issues, then go directly to Production.

### 5.4 Google Play Review

Expect 1-7 days for initial review. Common rejection reasons to pre-empt:
- Missing privacy policy
- Requesting unnecessary permissions
- App crashes on launch
- Misleading store listing vs actual functionality

---

## Phase 6: Post-Launch

### 6.1 OTA Updates (EAS Update)

For JavaScript-only changes (no native module changes), use EAS Update to push fixes without going through Play Store review:

```bash
eas update --branch production --message "Fix translation bug"
```

Requires adding `expo-updates` to the project and configuring `runtimeVersion` in app config.

### 6.2 Version Bumps

For native changes or new Play Store uploads:
- Increment `version` in app.json (e.g., `1.0.0` → `1.1.0`)
- `versionCode` auto-increments via `autoIncrement: true` in eas.json

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `voxlingo/app.json` | Modify | Add android package, versionCode, permissions |
| `voxlingo/app.config.ts` | Create | Dynamic env-based configuration |
| `voxlingo/eas.json` | Create | Build profiles and submit config |
| `voxlingo/babel.config.js` | Modify | Remove reanimated plugin |
| `voxlingo/.gitignore` | Modify | Add `google-service-account.json` |
| `voxlingo/.env.example` | Modify | Update with all required env vars |

## Files NOT to Touch

- `voxlingo/server/` — backend hosting handled separately by user
- iOS-related config — deferred to future effort
- Component/screen code — no feature changes in this scope

---

## Verification Plan

1. **Config validation:** `npx expo config --type public` — verify resolved config is correct
2. **Preview build:** `eas build --platform android --profile preview` — builds successfully
3. **APK test:** Install preview APK on Android device, verify all features work
4. **Production build:** `eas build --platform android --profile production` — produces signed AAB
5. **Submit dry run:** Upload AAB to Internal Testing track in Play Console
6. **Store listing review:** Verify all required fields are filled in Play Console
7. **Internal test:** Install via Internal Testing link, verify end-to-end functionality

---

## iOS (Future — Not In Scope)

When ready to add iOS:
1. Sign up for Apple Developer Program ($99/year)
2. Add `ios.bundleIdentifier` to app config
3. Add iOS build profiles to eas.json
4. EAS Build handles code signing automatically (no Mac required for builds)
5. Submit via EAS Submit to App Store Connect
6. Note: TestFlight review is faster than App Store review (~1 day)
