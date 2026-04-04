# Adding Delete Word from Word List Feature

## Analysis

Looking at the Firebase service in `voxlingo/services/firebase.ts`, there are `saveWordToList` and `getWordList` functions that operate on a Firestore collection. I need to add a delete function.

## Solution

### Add delete function to `firebase.ts`

Add `deleteDoc` to the imports and create a new function:

```typescript
import {
  // ... existing imports
  deleteDoc,
} from "firebase/firestore";

export async function deleteWordFromList(userId: string, wordId: string): Promise<void> {
  const firestore = getDb();
  await deleteDoc(doc(firestore, "users", userId, "wordlists", wordId));
}
```

### Usage

```typescript
const handleDelete = async (wordId: string) => {
  await deleteWordFromList(userId, wordId);
  // Refresh list after deletion
};
```

The `wordId` comes from the `id` field that `getWordList` returns (from `d.id`).
