# Adding Delete Word from Word List Feature

## Analysis

Looking at `voxlingo/services/firebase.ts`, the word list uses the Firestore subcollection path `users/{uid}/wordlists/{docId}`. There's already `saveWordToList` and `getWordList` — we need a matching `deleteWordFromList` function that follows the same patterns.

Per the skill's Firebase reference, this project uses:
- `addDoc` for auto-ID documents (which word list entries are)
- `deleteDoc` + `doc` for removing by document ID
- The `getWordList` function already returns items with `id` fields (mapped from `d.id`)

## Solution

### 1. Add `deleteWordFromList` to `voxlingo/services/firebase.ts`

First, add `deleteDoc` to the imports:

```typescript
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,  // Add this
  query,
  orderBy,
  limit,
  doc,
  setDoc,
  enableIndexedDbPersistence,
} from "firebase/firestore";
```

Then add the function alongside the existing word list operations:

```typescript
export async function deleteWordFromList(userId: string, wordId: string): Promise<void> {
  const firestore = getDb();
  await deleteDoc(doc(firestore, "users", userId, "wordlists", wordId));
}
```

### 2. Usage in a React component

```typescript
import { deleteWordFromList, getWordList } from "../services/firebase";
import { getCurrentUser } from "../services/firebase";

// In a word list screen component:
const handleDeleteWord = async (wordId: string) => {
  const user = getCurrentUser();
  if (!user) return;

  try {
    await deleteWordFromList(user.uid, wordId);
    // Refresh the list
    const updated = await getWordList(user.uid);
    setWords(updated);
  } catch (error) {
    console.error("Failed to delete word:", error);
    // Show error to user
  }
};
```

### 3. UI integration (swipe-to-delete)

```tsx
import { Alert } from "react-native";

const confirmDelete = (wordId: string, word: string) => {
  Alert.alert(
    "Delete Word",
    `Remove "${word}" from your word list?`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => handleDeleteWord(wordId) },
    ]
  );
};
```

## Why This Works

- Uses the correct subcollection path: `users/{uid}/wordlists/{wordId}`
- `deleteDoc` is the Firestore SDK's standard deletion method
- The `wordId` comes from the `id` field already returned by `getWordList` (mapped from `d.id`)
- Follows the same `getDb()` singleton pattern as all other Firebase functions
- Works offline — Firestore queues the delete and syncs when reconnected (IndexedDB persistence is enabled)
- Security rules already permit: user can write to their own `users/{uid}/**` subcollections
