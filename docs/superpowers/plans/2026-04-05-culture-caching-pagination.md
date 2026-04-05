# Culture Caching & Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent caching (server file + client AsyncStorage), bump culture content to 30 items per category, and paginate 10 at a time with next/prev buttons.

**Architecture:** Server writes generated content to JSON files in `server/cache/` and loads them on startup. Client persists fetched data to AsyncStorage and loads it on mount. The `useCulture` hook gains pagination state. Culture screen renders a pagination bar below the content list.

**Tech Stack:** Express + Node.js fs, React Native AsyncStorage, existing Gemini API

---

## File Structure

| File | Change |
|------|--------|
| `server/index.ts` | File-based cache (read on startup, write on generate), bump prompts to 30, 7-day TTL |
| `hooks/useCulture.ts` | AsyncStorage caching, pagination (page state, return slice + total + controls) |
| `app/(tabs)/culture.tsx` | Render pagination bar, handle page changes, scroll to top |
| `.gitignore` | Add `voxlingo/server/cache/` |

---

### Task 1: Server File-Based Cache + 30 Items

**Files:**
- Modify: `voxlingo/server/index.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Add gitignore entry**

Append to `.gitignore`:

```
voxlingo/server/cache/
```

- [ ] **Step 2: Add fs imports and cache constants at the top of server/index.ts**

Add after the existing imports (line 4) in `voxlingo/server/index.ts`:

```typescript
import fs from 'fs';
import path from 'path';
```

Change `CACHE_TTL` (line 34) from 24 hours to 7 days:

```typescript
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
```

- [ ] **Step 3: Add cache directory setup and file cache helpers inside createApp()**

Add right after `const ai = new GoogleGenAI({ apiKey });` (around line 43):

```typescript
  // --- File-based cache for culture content ---
  const CACHE_DIR = path.join(__dirname, 'cache');
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  function readCacheFile(cacheKey: string): { data: unknown[]; timestamp: number } | null {
    const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeCacheFile(cacheKey: string, data: unknown[]): void {
    const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify({ timestamp: Date.now(), data }, null, 2));
    } catch {
      // Non-critical — in-memory cache still works
    }
  }

  // Load all existing cache files into memory on startup
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const cacheKey = file.replace('.json', '');
      const cached = readCacheFile(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        cultureCache.set(cacheKey, cached);
      }
    }
    if (files.length > 0) console.log(`Loaded ${files.length} culture cache files`);
  } catch {
    // Cache dir may not exist yet
  }
```

**IMPORTANT**: The `cultureCache` Map is currently declared later in the file (around line 575). You MUST move it up before these helpers. Delete the line `const cultureCache = new Map<string, { data: unknown[]; timestamp: number }>();` from its current location and place it right before the `CACHE_DIR` line:

```typescript
  const cultureCache = new Map<string, { data: unknown[]; timestamp: number }>();

  // --- File-based cache for culture content ---
  const CACHE_DIR = path.join(__dirname, 'cache');
```

- [ ] **Step 4: Update culture endpoint to use file cache**

In the culture endpoint handler (around line 594), replace the existing cache check and cache write:

Replace:
```typescript
    const cacheKey = `${code}:${category}`;
    const cached = cultureCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.json(cached.data);
      return;
    }
```

With:
```typescript
    const cacheKey = `${code}-${category}`;
    // Check in-memory cache first
    const memoryCached = cultureCache.get(cacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_TTL) {
      res.json(memoryCached.data);
      return;
    }
    // Check file cache
    const fileCached = readCacheFile(cacheKey);
    if (fileCached && Date.now() - fileCached.timestamp < CACHE_TTL) {
      cultureCache.set(cacheKey, fileCached);
      res.json(fileCached.data);
      return;
    }
```

Replace the cache write line:
```typescript
      cultureCache.set(cacheKey, { data: enriched, timestamp: Date.now() });
```

With:
```typescript
      const cacheEntry = { data: enriched, timestamp: Date.now() };
      cultureCache.set(cacheKey, cacheEntry);
      writeCacheFile(cacheKey, enriched);
```

- [ ] **Step 5: Bump prompt counts to 30**

Update the `count` and prompt text for each category in `CULTURE_CATEGORIES`:

- `dos-donts`: count 8 → 30, prompt text "Generate 8" → "Generate 30"
- `gestures`: count 6 → 30, prompt text "Generate 6" → "Generate 30", remove "Cover: greetings..." (let Gemini pick 30 diverse ones)
- `food`: count 8 → 30, prompt text "Generate 8" → "Generate 30", change "Include: 5 must-try dishes, 2 eating etiquette tips, 1 dietary vocabulary entry" → "Include must-try dishes, eating etiquette tips, dietary vocabulary, street food, and regional specialties"
- `tipping`: count 5 → 30, prompt text "Generate 5" → "Generate 30", change "Cover: restaurants, taxis..." → "Cover all tipping scenarios: restaurants, cafes, bars, taxis, hotels, spas, tours, deliveries, hairdressers, and more"
- `sacred-sites`: count 5 → 30, prompt text "Generate 5" → "Generate 30", change "Cover: dress code, shoes..." → "Cover temples, churches, mosques, shrines, cemeteries, monuments, and other sacred or culturally significant sites"
- `numbers`: keep at 10 (no change)

- [ ] **Step 6: Test server restart persistence**

Start server: `cd voxlingo/server && npm run dev`

Hit: `curl http://localhost:3001/destination/JP/culture/food`
Expected: 30 food items returned, file `voxlingo/server/cache/JP-food.json` created.

Restart server (Ctrl+C, `npm run dev`).
Hit same endpoint again.
Expected: Instant response from file cache (no Gemini call). Console shows "Loaded N culture cache files".

- [ ] **Step 7: Commit**

```bash
git add .gitignore voxlingo/server/index.ts
git commit -m "feat: add file-based culture cache, bump to 30 items per category"
```

---

### Task 2: Client AsyncStorage Cache in useCulture

**Files:**
- Modify: `voxlingo/hooks/useCulture.ts`

- [ ] **Step 1: Rewrite useCulture with AsyncStorage + pagination**

Replace the entire contents of `voxlingo/hooks/useCulture.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCultureCategory } from '../services/destination';
import { CultureEntry, CultureCategory } from '../types';

const PAGE_SIZE = 10;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

type CacheEntry = {
  timestamp: number;
  data: CultureEntry[];
};

function storageKey(destination: string, category: CultureCategory): string {
  return `culture:${destination}:${category}`;
}

export function useCulture(destination: string | null, category: CultureCategory | null) {
  const [allEntries, setAllEntries] = useState<CultureEntry[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memCacheRef = useRef(new Map<string, { data: CultureEntry[]; timestamp: number }>());

  // Reset page when destination or category changes
  useEffect(() => {
    setPage(1);
  }, [destination, category]);

  useEffect(() => {
    if (!destination || !category) {
      setAllEntries([]);
      return;
    }

    const key = `${destination}:${category}`;

    // 1. Check in-memory cache (with TTL)
    const memCached = memCacheRef.current.get(key);
    if (memCached && Date.now() - memCached.timestamp < CACHE_TTL) {
      setAllEntries(memCached.data);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      // 2. Check AsyncStorage cache
      try {
        const stored = await AsyncStorage.getItem(storageKey(destination, category));
        if (stored && !cancelled) {
          const parsed: CacheEntry = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            memCacheRef.current.set(key, { data: parsed.data, timestamp: parsed.timestamp });
            setAllEntries(parsed.data);
            return;
          }
        }
      } catch {
        // AsyncStorage read failed — fall through to fetch
      }

      // 3. Fetch from server
      if (cancelled) return;
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchCultureCategory(destination, category, controller.signal);
        if (!controller.signal.aborted) {
          memCacheRef.current.set(key, { data, timestamp: Date.now() });
          setAllEntries(data);
          // Persist to AsyncStorage
          try {
            const entry: CacheEntry = { timestamp: Date.now(), data };
            await AsyncStorage.setItem(storageKey(destination, category), JSON.stringify(entry));
          } catch {
            // Non-critical
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load content');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [destination, category]);

  const totalPages = Math.ceil(allEntries.length / PAGE_SIZE);
  const entries = allEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = allEntries.length;

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  return {
    entries,
    allEntries,
    page,
    totalPages,
    total,
    nextPage,
    prevPage,
    isLoading,
    error,
  };
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add voxlingo/hooks/useCulture.ts
git commit -m "feat: add AsyncStorage cache and pagination to useCulture"
```

---

### Task 3: Pagination UI on Culture Screen

**Files:**
- Modify: `voxlingo/app/(tabs)/culture.tsx`

- [ ] **Step 1: Update the useCulture destructuring**

In `voxlingo/app/(tabs)/culture.tsx`, replace line 53-56:

```typescript
  const { entries, isLoading: cultureLoading, error: cultureError } = useCulture(
    destination,
    cultureCategory,
  );
```

With:

```typescript
  const {
    entries,
    page,
    totalPages,
    total,
    nextPage,
    prevPage,
    isLoading: cultureLoading,
    error: cultureError,
  } = useCulture(destination, cultureCategory);
```

- [ ] **Step 2: Add a FlatList ref for scroll-to-top**

Add after the `const [showPicker, setShowPicker] = useState(false);` line:

```typescript
  const cultureListRef = useRef<FlatList<CultureEntry>>(null);
```

Add `useRef` to the React import at the top if not already there:

```typescript
import React, { useState, useRef } from 'react';
```

Also add `FlatList` type import — it's already imported from `react-native`.

- [ ] **Step 3: Add page change handlers that scroll to top**

Add after the `handleSpeak` function:

```typescript
  const handleNextPage = () => {
    nextPage();
    cultureListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handlePrevPage = () => {
    prevPage();
    cultureListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };
```

- [ ] **Step 4: Add pagination bar to the culture FlatList**

Replace the culture FlatList block (lines 167-175):

```typescript
      {!isLoading && !activeError && CULTURE_API_CATEGORIES.has(activeCategory) && (
        <FlatList
          data={entries}
          keyExtractor={(item: CultureEntry) => item.id}
          renderItem={({ item }) => (
            <CultureCard entry={item} onSpeak={item.speakable ? handleSpeak : undefined} />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
```

With:

```typescript
      {!isLoading && !activeError && CULTURE_API_CATEGORIES.has(activeCategory) && (
        <FlatList
          ref={cultureListRef}
          data={entries}
          keyExtractor={(item: CultureEntry) => item.id}
          renderItem={({ item }) => (
            <CultureCard entry={item} onSpeak={item.speakable ? handleSpeak : undefined} />
          )}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
                  onPress={handlePrevPage}
                  disabled={page <= 1}
                >
                  <Text style={[styles.pageButtonText, page <= 1 && styles.pageButtonTextDisabled]}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                  {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total}
                </Text>
                <TouchableOpacity
                  style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
                  onPress={handleNextPage}
                  disabled={page >= totalPages}
                >
                  <Text style={[styles.pageButtonText, page >= totalPages && styles.pageButtonTextDisabled]}>Next</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
```

- [ ] **Step 5: Add pagination styles**

Add to the `StyleSheet.create({})` block:

```typescript
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  pageButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  pageButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  pageButtonText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  pageButtonTextDisabled: {
    color: colors.textMuted,
  },
  pageInfo: {
    ...typography.label,
    color: colors.textSecondary,
  },
```

- [ ] **Step 6: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 7: Commit**

```bash
git add "voxlingo/app/(tabs)/culture.tsx"
git commit -m "feat: add pagination UI to culture screen"
```

---

### Task 4: Manual Verification

- [ ] **Step 1: Start server and app**

Server: `cd voxlingo/server && npm run dev`
App: `cd voxlingo && npx expo start`

- [ ] **Step 2: Test 30 items with pagination**

Select a destination. Go to Culture tab. Tap "Food" chip. Should show 10 items with a pagination bar at the bottom: "1–10 of 30" with Previous (disabled) and Next buttons.

- [ ] **Step 3: Test next/prev navigation**

Tap "Next" — shows items 11–20, scrolls to top. Tap "Next" — shows items 21–30, Next disabled. Tap "Previous" — back to 11–20.

- [ ] **Step 4: Test page reset on category switch**

On page 2 of Food, tap "Gestures" chip. Should show page 1 of Gestures.

- [ ] **Step 5: Test server cache persistence**

Check `voxlingo/server/cache/` — should have JSON files. Restart server. Hit the same category — should be instant (no Gemini call).

- [ ] **Step 6: Test client cache persistence**

Reload the app. Switch to Culture, tap the same category. Should show data instantly without a loading spinner (loaded from AsyncStorage).

- [ ] **Step 7: Test numbers category**

Tap "Numbers" — should show 10 items, no pagination bar (only 10 items = 1 page).
