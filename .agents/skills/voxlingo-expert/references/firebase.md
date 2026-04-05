# Firebase Reference

## Table of Contents
1. [Authentication](#authentication)
2. [Firestore Schema](#firestore-schema)
3. [Firestore Operations](#firestore-operations)
4. [Offline Persistence](#offline-persistence)
5. [Security Rules](#security-rules)
6. [Common Errors](#common-errors)

---

## Authentication

### Initialization
Firebase must be initialized before any operation. The project uses a singleton pattern:

```typescript
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

function initializeFirebase(): void {
  if (getApps().length === 0) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    enableIndexedDbPersistence(db).catch(console.warn);
  }
}
```

**Key rule**: Always check `getApps().length === 0` before calling `initializeApp()` to avoid duplicate app errors.

### Google Sign-In Flow
```typescript
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
const user = result.user;
// user.uid, user.displayName, user.email available
```

After sign-in, the project creates/merges a user profile document in Firestore.

### Environment Variables (Client)
All Firebase client config uses `EXPO_PUBLIC_` prefix:
```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_DATABASE_URL
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
```

These are safe to include in mobile builds — Firebase security comes from Security Rules, not key secrecy.

---

## Firestore Schema

```
users/{uid}
  ├── displayName: string
  ├── email: string
  ├── preferredLanguages: string[]    (e.g., ["en", "es"])
  ├── createdAt: number               (timestamp ms)
  │
  ├── settings/prefs                   (single doc)
  │   ├── defaultSourceLang: string
  │   ├── defaultTargetLang: string
  │   └── autoDetect: boolean
  │
  ├── translations/{auto-id}
  │   ├── sourceLang: string
  │   ├── targetLang: string
  │   ├── originalText: string
  │   ├── translatedText: string
  │   ├── mode: string                ("travel" | "camera" | "meeting")
  │   ├── timestamp: number
  │   └── cached: boolean
  │
  ├── wordlists/{auto-id}
  │   ├── word: string
  │   ├── translation: string
  │   ├── sourceLang: string
  │   ├── targetLang: string
  │   └── savedAt: number
  │
  └── transcripts/{auto-id}
      ├── title: string
      ├── date: string
      ├── duration: number
      ├── speakers: string[]
      ├── entries: array
      └── exportedAs: string
```

**Important**: All user data uses subcollections under `users/{uid}/`. This enables per-user security rules.

---

## Firestore Operations

### Writing Data
```typescript
import { addDoc, setDoc, doc, collection } from "firebase/firestore";

// Auto-generated ID (translations, wordlists)
await addDoc(collection(db, "users", userId, "translations"), { ...data, timestamp: Date.now() });

// Known ID with merge (user profile, settings)
await setDoc(doc(db, "users", userId), profileData, { merge: true });
await setDoc(doc(db, "users", userId, "settings", "prefs"), settings);
```

### Reading Data
```typescript
import { query, collection, orderBy, limit, getDocs } from "firebase/firestore";

const q = query(
  collection(db, "users", userId, "translations"),
  orderBy("timestamp", "desc"),
  limit(50)
);
const snap = await getDocs(q);
const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
```

### Key Patterns
- Use `addDoc` for auto-ID documents (translations, word list entries)
- Use `setDoc` with `{ merge: true }` for profile updates (preserves existing fields)
- Always `orderBy` + `limit` when fetching collections — never fetch unbounded
- Use `getDocs` (one-time fetch) not `onSnapshot` (real-time) unless live updates are needed

---

## Offline Persistence

Firestore IndexedDB persistence is enabled at initialization:
```typescript
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    // Multiple tabs open — only one can have persistence
  } else if (err.code === "unimplemented") {
    // Browser doesn't support IndexedDB
  }
});
```

When offline:
- Reads return cached data
- Writes queue locally and sync when reconnected
- `getDocs` may return stale data — use `getDocsFromServer` if freshness matters

---

## Security Rules

Recommended rules for this schema (apply in Firebase Console):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

This ensures users can only access their own data. Always test rules with the Firebase Emulator.

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `auth/popup-closed-by-user` | User closed sign-in popup | Handle gracefully, don't retry automatically |
| `auth/network-request-failed` | No internet connection | Show offline message |
| `auth/too-many-requests` | Rate limited (100/IP/hour) | Implement backoff, show user message |
| `permission-denied` | Security rules blocking access | Check rules, verify user is authenticated |
| `not-found` | Document doesn't exist | Check collection path, handle null |
| `failed-precondition` | Persistence with multiple tabs | Warn user, degrade gracefully |
| `unavailable` | Firestore service down | Retry with backoff |
| Duplicate app initialization | `initializeApp()` called twice | Guard with `getApps().length === 0` |
| Missing index | Complex query needs composite index | Follow the URL in the error message to create the index |

### Firebase Auth Quotas
- 100 sign-ins per IP per hour (Google default)
- 10 password resets per IP per hour
- Configurable in Firebase Console under Authentication > Settings

### Firestore Quotas
- 1 write per document per second (sustained)
- 10,000 writes per second per database (burst)
- 1 MiB max document size
