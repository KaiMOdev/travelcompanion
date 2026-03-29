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
import { UserProfile, UserSettings, Translation, WordListItem } from "../types";

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

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const firestore = getDb();
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

export async function saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
  const firestore = getDb();
  await setDoc(doc(firestore, "users", userId, "settings", "prefs"), settings);
}

export async function saveTranslationToHistory(
  userId: string,
  data: { sourceLang: string; targetLang: string; originalText: string; translatedText: string; mode: string }
): Promise<void> {
  const firestore = getDb();
  await addDoc(collection(firestore, "users", userId, "translations"), {
    ...data,
    timestamp: Date.now(),
    cached: false,
  });
}

export async function getTranslationHistory(userId: string, maxResults = 50): Promise<Translation[]> {
  const firestore = getDb();
  const q = query(
    collection(firestore, "users", userId, "translations"),
    orderBy("timestamp", "desc"),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Translation[];
}

export async function saveWordToList(
  userId: string,
  data: { word: string; translation: string; sourceLang: string; targetLang: string }
): Promise<void> {
  const firestore = getDb();
  await addDoc(collection(firestore, "users", userId, "wordlists"), {
    ...data,
    savedAt: Date.now(),
  });
}

export async function getWordList(userId: string, maxResults = 100): Promise<WordListItem[]> {
  const firestore = getDb();
  const q = query(
    collection(firestore, "users", userId, "wordlists"),
    orderBy("savedAt", "desc"),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as WordListItem[];
}
