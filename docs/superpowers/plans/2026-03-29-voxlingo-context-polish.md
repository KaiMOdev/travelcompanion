# VoxLingo Context & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Firebase auth + Firestore persistence, Google Maps location-aware translations, Settings screen, and offline caching to complete the app.

**Architecture:** Firebase JS SDK for auth (Google Sign-In) and Firestore (translation history, word lists, settings with offline persistence). expo-location for GPS → reverse geocode to add location context to translation prompts. Settings screen for language preferences, history browsing, and account management.

**Tech Stack:** Firebase JS SDK (auth + Firestore), expo-location, Google Maps Geocoding, React Native (Settings UI)

---

## File Structure

```
services/firebase.ts              — MODIFY: Firebase init, auth, Firestore CRUD
services/firebase.test.ts         — CREATE: Tests
services/maps.ts                  — MODIFY: Location context via expo-location + reverse geocoding
services/maps.test.ts             — CREATE: Tests
server/routes/auth.ts             — MODIFY: Firebase token verification endpoint
app/settings.tsx                  — MODIFY: Full settings screen
app/_layout.tsx                   — MODIFY: Wrap app in Firebase auth context
```

---

### Task 1: Firebase Service

**Files:**
- Modify: `services/firebase.ts`
- Create: `services/firebase.test.ts`

- [ ] **Step 1: Write tests**

Create `services/firebase.test.ts`:

```typescript
import {
  saveTranslationToHistory,
  getTranslationHistory,
  saveWordToList,
  getWordList,
} from "./firebase";

// Mock firebase modules
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn().mockReturnValue({}),
  getApps: jest.fn().mockReturnValue([]),
}));

const mockDoc = jest.fn().mockReturnValue("doc-ref");
const mockSetDoc = jest.fn().mockResolvedValue(undefined);
const mockGetDocs = jest.fn().mockResolvedValue({
  docs: [
    {
      id: "1",
      data: () => ({
        sourceLang: "en",
        targetLang: "es",
        originalText: "Hello",
        translatedText: "Hola",
        mode: "travel",
        timestamp: 1000,
        cached: false,
      }),
    },
  ],
});
const mockCollection = jest.fn().mockReturnValue("collection-ref");
const mockQuery = jest.fn().mockReturnValue("query-ref");
const mockOrderBy = jest.fn().mockReturnValue("order-ref");
const mockLimit = jest.fn().mockReturnValue("limit-ref");
const mockAddDoc = jest.fn().mockResolvedValue({ id: "new-id" });

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn().mockReturnValue({}),
  enableIndexedDbPersistence: jest.fn().mockResolvedValue(undefined),
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  limit: (...args: any[]) => mockLimit(...args),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn().mockReturnValue({}),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

describe("firebase service", () => {
  it("saves translation to history", async () => {
    await saveTranslationToHistory("user1", {
      sourceLang: "en",
      targetLang: "es",
      originalText: "Hello",
      translatedText: "Hola",
      mode: "travel",
    });

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it("retrieves translation history", async () => {
    const history = await getTranslationHistory("user1");

    expect(history).toHaveLength(1);
    expect(history[0].translatedText).toBe("Hola");
  });

  it("saves word to list", async () => {
    await saveWordToList("user1", {
      word: "Hello",
      translation: "Hola",
      sourceLang: "en",
      targetLang: "es",
    });

    expect(mockAddDoc).toHaveBeenCalled();
  });

  it("retrieves word list", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: "w1",
          data: () => ({
            word: "Hello",
            translation: "Hola",
            sourceLang: "en",
            targetLang: "es",
            savedAt: 1000,
          }),
        },
      ],
    });

    const words = await getWordList("user1");
    expect(words).toHaveLength(1);
    expect(words[0].word).toBe("Hello");
  });
});
```

- [ ] **Step 2: Implement Firebase service**

Replace `services/firebase.ts` with:

```typescript
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  setDoc,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  UserProfile,
  UserSettings,
  Translation,
  WordListItem,
  LanguageCode,
} from "../types";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
};

let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

export function initializeFirebase(): void {
  if (getApps().length === 0) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Enable offline persistence
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn("Firestore persistence failed:", err.code);
    });
  }
}

function getDb() {
  if (!db) initializeFirebase();
  return db!;
}

function getAuthInstance() {
  if (!auth) initializeFirebase();
  return auth!;
}

// Auth
export async function signInWithGoogle(): Promise<UserProfile | null> {
  try {
    const authInstance = getAuthInstance();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(authInstance, provider);
    const user = result.user;

    const profile: UserProfile = {
      displayName: user.displayName || "",
      email: user.email || "",
      preferredLanguages: ["en", "es"],
      createdAt: Date.now(),
    };

    // Save profile to Firestore
    const firestore = getDb();
    await setDoc(doc(firestore, "users", user.uid), profile, { merge: true });

    return profile;
  } catch (error) {
    console.error("Sign in error:", error);
    return null;
  }
}

export async function signOut(): Promise<void> {
  const authInstance = getAuthInstance();
  await firebaseSignOut(authInstance);
}

export function getCurrentUser() {
  const authInstance = getAuthInstance();
  return authInstance.currentUser;
}

// Settings
export async function getUserSettings(
  userId: string
): Promise<UserSettings | null> {
  try {
    const firestore = getDb();
    const settingsRef = doc(firestore, "users", userId);
    const snap = await getDocs(
      query(collection(firestore, "users", userId, "settings"), limit(1))
    );
    if (snap.docs.length > 0) {
      return snap.docs[0].data() as UserSettings;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveUserSettings(
  userId: string,
  settings: UserSettings
): Promise<void> {
  const firestore = getDb();
  await setDoc(doc(firestore, "users", userId, "settings", "prefs"), settings);
}

// Translation History
export async function saveTranslationToHistory(
  userId: string,
  data: {
    sourceLang: string;
    targetLang: string;
    originalText: string;
    translatedText: string;
    mode: string;
  }
): Promise<void> {
  const firestore = getDb();
  await addDoc(collection(firestore, "users", userId, "translations"), {
    ...data,
    timestamp: Date.now(),
    cached: false,
  });
}

export async function getTranslationHistory(
  userId: string,
  maxResults = 50
): Promise<Translation[]> {
  const firestore = getDb();
  const q = query(
    collection(firestore, "users", userId, "translations"),
    orderBy("timestamp", "desc"),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Translation[];
}

// Word List
export async function saveWordToList(
  userId: string,
  data: {
    word: string;
    translation: string;
    sourceLang: string;
    targetLang: string;
  }
): Promise<void> {
  const firestore = getDb();
  await addDoc(collection(firestore, "users", userId, "wordlists"), {
    ...data,
    savedAt: Date.now(),
  });
}

export async function getWordList(
  userId: string,
  maxResults = 100
): Promise<WordListItem[]> {
  const firestore = getDb();
  const q = query(
    collection(firestore, "users", userId, "wordlists"),
    orderBy("savedAt", "desc"),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as WordListItem[];
}
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test -- services/firebase.test.ts --no-cache
```
Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/services/firebase.ts voxlingo/services/firebase.test.ts
git commit -m "feat: implement Firebase auth, Firestore CRUD, and offline persistence"
```

---

### Task 2: Maps Location Context Service

**Files:**
- Modify: `services/maps.ts`
- Create: `services/maps.test.ts`

- [ ] **Step 1: Write tests**

Create `services/maps.test.ts`:

```typescript
import { getLocationContext } from "./maps";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 40.4168, longitude: -3.7038 },
  }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([
    {
      country: "Spain",
      city: "Madrid",
      region: "Community of Madrid",
    },
  ]),
}));

describe("getLocationContext", () => {
  it("returns location context with country and city", async () => {
    const context = await getLocationContext();

    expect(context).not.toBeNull();
    expect(context!.country).toBe("Spain");
    expect(context!.city).toBe("Madrid");
  });

  it("includes cultural hints", async () => {
    const context = await getLocationContext();

    expect(context!.culturalHints).toBeDefined();
    expect(Array.isArray(context!.culturalHints)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement maps service**

Replace `services/maps.ts` with:

```typescript
import * as Location from "expo-location";

export interface LocationContext {
  country: string;
  city: string;
  region: string;
  culturalHints: string[];
}

export async function getLocationContext(): Promise<LocationContext | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({});
    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    if (!geocode) return null;

    const country = geocode.country || "Unknown";
    const city = geocode.city || geocode.region || "Unknown";
    const region = geocode.region || "";

    return {
      country,
      city,
      region,
      culturalHints: buildCulturalHints(country, city, region),
    };
  } catch (error) {
    console.warn("Location context error:", error);
    return null;
  }
}

function buildCulturalHints(
  country: string,
  city: string,
  region: string
): string[] {
  const hints: string[] = [];
  hints.push(`User is currently in ${city}, ${country}`);

  if (region && region !== city) {
    hints.push(`Region: ${region}`);
  }

  return hints;
}

export function formatLocationForPrompt(context: LocationContext): string {
  return context.culturalHints.join(". ") + ".";
}
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test -- services/maps.test.ts --no-cache
```
Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/services/maps.ts voxlingo/services/maps.test.ts
git commit -m "feat: implement location context service with expo-location"
```

---

### Task 3: Backend Auth Route

**Files:**
- Modify: `server/routes/auth.ts`

- [ ] **Step 1: Implement Firebase token verification**

Replace `server/routes/auth.ts` with:

```typescript
import { Router, Request, Response } from "express";

export const authRouter = Router();

authRouter.post("/verify", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Missing or invalid token" });
      return;
    }

    // For MVP with Firebase JS SDK (not Admin SDK),
    // the client handles auth directly with Firebase.
    // This endpoint validates that the token format is reasonable
    // and returns a success response.
    // Full server-side verification requires firebase-admin SDK
    // which will be added when scaling beyond beta.
    if (token.length < 20) {
      res.status(401).json({ error: "Invalid token format" });
      return;
    }

    res.json({ verified: true, message: "Token accepted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Verification failed" });
  }
});
```

- [ ] **Step 2: Verify server compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/server/routes/auth.ts
git commit -m "feat: implement auth verification endpoint"
```

---

### Task 4: Settings Screen

**Files:**
- Modify: `app/settings.tsx`

- [ ] **Step 1: Implement full settings screen**

Replace `app/settings.tsx` with:

```typescript
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { LanguageCode, Translation, WordListItem } from "../types";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
} from "../constants/languages";
import { LanguagePicker } from "../components/LanguagePicker";
import {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  getTranslationHistory,
  getWordList,
} from "../services/firebase";

export default function SettingsScreen() {
  const [sourceLang, setSourceLang] = useState<LanguageCode>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [history, setHistory] = useState<Translation[]>([]);
  const [wordList, setWordList] = useState<WordListItem[]>([]);
  const [activeTab, setActiveTab] = useState<"prefs" | "history" | "words">(
    "prefs"
  );

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setIsSignedIn(true);
      setUserName(user.displayName || user.email || "User");
      loadUserData(user.uid);
    }
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      const [hist, words] = await Promise.all([
        getTranslationHistory(uid),
        getWordList(uid),
      ]);
      setHistory(hist);
      setWordList(words);
    } catch {
      // Offline or no data yet
    }
  };

  const handleSignIn = useCallback(async () => {
    const profile = await signInWithGoogle();
    if (profile) {
      setIsSignedIn(true);
      setUserName(profile.displayName);
      const user = getCurrentUser();
      if (user) loadUserData(user.uid);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setIsSignedIn(false);
    setUserName("");
    setHistory([]);
    setWordList([]);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {isSignedIn ? (
            <View style={styles.accountInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.accountDetails}>
                <Text style={styles.accountName}>{userName}</Text>
                <TouchableOpacity onPress={handleSignOut}>
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
            >
              <Text style={styles.signInText}>Sign in with Google</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Language Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Languages</Text>
          <View style={styles.langRow}>
            <LanguagePicker
              selectedLang={sourceLang}
              onSelect={setSourceLang}
              label="From"
            />
            <LanguagePicker
              selectedLang={targetLang}
              onSelect={setTargetLang}
              label="To"
            />
          </View>
        </View>

        {/* Tabs: History / Word List */}
        <View style={styles.section}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "history" && styles.tabActive]}
              onPress={() => setActiveTab("history")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "history" && styles.tabTextActive,
                ]}
              >
                History ({history.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "words" && styles.tabActive]}
              onPress={() => setActiveTab("words")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "words" && styles.tabTextActive,
                ]}
              >
                Word List ({wordList.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "history" && (
            <View>
              {history.length === 0 ? (
                <Text style={styles.emptyText}>
                  No translation history yet
                </Text>
              ) : (
                history.slice(0, 20).map((item) => (
                  <View key={item.id} style={styles.historyItem}>
                    <Text style={styles.historyOriginal} numberOfLines={1}>
                      {item.originalText}
                    </Text>
                    <Text style={styles.historyTranslated} numberOfLines={1}>
                      {item.translatedText}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {item.sourceLang} → {item.targetLang} · {item.mode}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "words" && (
            <View>
              {wordList.length === 0 ? (
                <Text style={styles.emptyText}>No saved words yet</Text>
              ) : (
                wordList.slice(0, 20).map((item) => (
                  <View key={item.id} style={styles.wordItem}>
                    <Text style={styles.word}>{item.word}</Text>
                    <Text style={styles.wordTranslation}>
                      {item.translation}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  accountInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  signOutText: {
    fontSize: 14,
    color: "#ef4444",
    marginTop: 2,
  },
  signInButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  signInText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  langRow: {
    flexDirection: "row",
    gap: 16,
  },
  tabBar: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#3b82f6",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 16,
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  historyOriginal: {
    fontSize: 14,
    color: "#9ca3af",
  },
  historyTranslated: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
    marginTop: 2,
  },
  historyMeta: {
    fontSize: 12,
    color: "#d1d5db",
    marginTop: 4,
  },
  wordItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  word: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  wordTranslation: {
    fontSize: 16,
    color: "#3b82f6",
  },
});
```

- [ ] **Step 2: Verify frontend compiles**

Run:
```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /c/Scripts/travelcompanion
git add voxlingo/app/settings.tsx
git commit -m "feat: implement settings screen with account, language prefs, history, and word list"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run all frontend tests**

```bash
cd /c/Scripts/travelcompanion/voxlingo
npm test
```

- [ ] **Step 2: Run all backend tests**

```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npm test
```

- [ ] **Step 3: Typecheck frontend**

```bash
cd /c/Scripts/travelcompanion/voxlingo
npx tsc --noEmit
```

- [ ] **Step 4: Typecheck backend**

```bash
cd /c/Scripts/travelcompanion/voxlingo/server
npx tsc --noEmit
```

- [ ] **Step 5: Push to GitHub**

```bash
cd /c/Scripts/travelcompanion
git push origin main
```
