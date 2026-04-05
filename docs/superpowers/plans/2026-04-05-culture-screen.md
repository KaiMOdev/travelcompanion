# Culture Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Culture tab with 8 categories of destination-specific cultural content, freeing the Travel screen to focus on voice translation.

**Architecture:** New Culture tab (middle of 3 tabs) with horizontal category chips filtering a vertical card list. Shared destination via React Context (selection only). Separate data hooks per content type with client-side caching and AbortController for race condition safety. Six new Gemini-powered categories served from a validated server endpoint.

**Tech Stack:** React Native + Expo SDK 54, TypeScript, Express backend, Gemini API (gemini-2.5-flash-lite)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `types/travel.ts` | Add `CultureCategory`, `CultureEntry` types |
| `contexts/DestinationContext.tsx` | **New** — destination selection + AsyncStorage persistence |
| `hooks/usePhrases.ts` | **New** — fetch phrases for a destination |
| `hooks/useTips.ts` | **New** — fetch tips for a destination |
| `hooks/useCulture.ts` | **New** — fetch culture entries by category with client cache + abort |
| `hooks/useDestination.ts` | **Delete** — replaced by context + separate hooks |
| `services/destination.ts` | Add `fetchCultureCategory()` |
| `server/index.ts` | Add `GET /destination/:code/culture/:category` with validation |
| `components/CategoryChips.tsx` | **New** — horizontal filter chip row |
| `components/CultureCard.tsx` | **New** — vertical card for culture entries |
| `app/(tabs)/culture.tsx` | **New** — Culture screen |
| `app/(tabs)/_layout.tsx` | Add Culture tab, wrap with DestinationContext |
| `app/(tabs)/index.tsx` | Remove phrases/tips, consume context |

---

### Task 1: Add Types

**Files:**
- Modify: `voxlingo/types/travel.ts`
- Modify: `voxlingo/types/index.ts`

- [ ] **Step 1: Add CultureCategory and CultureEntry to types/travel.ts**

Add at the end of `voxlingo/types/travel.ts`:

```typescript
export type CultureCategory =
  | 'phrases'
  | 'tips'
  | 'dos-donts'
  | 'gestures'
  | 'food'
  | 'tipping'
  | 'sacred-sites'
  | 'numbers';

export type CultureEntry = {
  id: string;
  category: CultureCategory;
  title: string;
  body: string;
  countryCode: string;
  speakable?: string;
  romanized?: string;
};
```

- [ ] **Step 2: Re-export new types from types/index.ts**

Add `CultureCategory` and `CultureEntry` to the re-export block in `voxlingo/types/index.ts`:

```typescript
export type {
  Destination,
  Phrase,
  CulturalTip,
  CultureCategory,
  CultureEntry,
  MenuItem,
  MenuTranslation,
  SignTranslation,
  GeneralTranslation,
  SmartVisionResponse,
  EmergencyInfo,
} from './travel';
```

- [ ] **Step 3: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add voxlingo/types/travel.ts voxlingo/types/index.ts
git commit -m "feat: add CultureCategory and CultureEntry types"
```

---

### Task 2: Create DestinationContext

**Files:**
- Create: `voxlingo/contexts/DestinationContext.tsx`

- [ ] **Step 1: Create the context file**

Create `voxlingo/contexts/DestinationContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDestination } from '../constants/destinations';

const STORAGE_KEY = 'voxlingo_destination';
const HOTEL_STORAGE_KEY = 'voxlingo_hotel_address';

type DestinationContextValue = {
  destination: string | null;
  setDestination: (code: string) => Promise<void>;
  hotelAddress: string;
  setHotelAddress: (address: string) => void;
  saveHotelAddress: () => Promise<void>;
  getLanguageCode: () => string | undefined;
  isLoaded: boolean;
};

const DestinationContext = createContext<DestinationContextValue | null>(null);

export function DestinationProvider({ children }: { children: React.ReactNode }) {
  const [destination, setDestinationState] = useState<string | null>(null);
  const [hotelAddress, setHotelAddressState] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const setDestination = useCallback(async (countryCode: string) => {
    setDestinationState(countryCode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, countryCode);
    } catch {
      // Non-critical
    }
  }, []);

  const setHotelAddress = useCallback((address: string) => {
    setHotelAddressState(address);
  }, []);

  const saveHotelAddress = useCallback(async () => {
    try {
      await AsyncStorage.setItem(HOTEL_STORAGE_KEY, hotelAddress);
    } catch {
      // Non-critical
    }
  }, [hotelAddress]);

  const getLanguageCode = useCallback((): string | undefined => {
    if (!destination) return undefined;
    return getDestination(destination)?.primaryLanguage;
  }, [destination]);

  useEffect(() => {
    (async () => {
      try {
        const [saved, savedHotel] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(HOTEL_STORAGE_KEY),
        ]);
        if (savedHotel) setHotelAddressState(savedHotel);
        if (saved) setDestinationState(saved);
      } catch {
        // No saved data
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  return (
    <DestinationContext.Provider
      value={{
        destination,
        setDestination,
        hotelAddress,
        setHotelAddress,
        saveHotelAddress,
        getLanguageCode,
        isLoaded,
      }}
    >
      {children}
    </DestinationContext.Provider>
  );
}

export function useDestinationContext(): DestinationContextValue {
  const ctx = useContext(DestinationContext);
  if (!ctx) throw new Error('useDestinationContext must be used within DestinationProvider');
  return ctx;
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add voxlingo/contexts/DestinationContext.tsx
git commit -m "feat: add DestinationContext for shared destination state"
```

---

### Task 3: Create Separate Data Hooks

**Files:**
- Create: `voxlingo/hooks/usePhrases.ts`
- Create: `voxlingo/hooks/useTips.ts`
- Modify: `voxlingo/services/destination.ts`
- Create: `voxlingo/hooks/useCulture.ts`

- [ ] **Step 1: Add fetchCultureCategory to services/destination.ts**

Add to `voxlingo/services/destination.ts`:

```typescript
import { API_URL } from './api';
import { Phrase, CulturalTip, CultureEntry, CultureCategory } from '../types';

export async function fetchPhrases(countryCode: string): Promise<Phrase[]> {
  const response = await fetch(`${API_URL}/destination/${countryCode}/phrases`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch phrases');
  }
  return response.json();
}

export async function fetchTips(countryCode: string): Promise<CulturalTip[]> {
  const response = await fetch(`${API_URL}/destination/${countryCode}/tips`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch tips');
  }
  return response.json();
}

export async function fetchCultureCategory(
  countryCode: string,
  category: CultureCategory,
  signal?: AbortSignal,
): Promise<CultureEntry[]> {
  const response = await fetch(
    `${API_URL}/destination/${countryCode}/culture/${category}`,
    { signal },
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch culture content');
  }
  return response.json();
}
```

- [ ] **Step 2: Create usePhrases hook**

Create `voxlingo/hooks/usePhrases.ts`:

```typescript
import { useState, useEffect, useRef } from 'react';
import { fetchPhrases } from '../services/destination';
import { Phrase } from '../types';

export function usePhrases(destination: string | null) {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, Phrase[]>());

  useEffect(() => {
    if (!destination) {
      setPhrases([]);
      return;
    }

    const cached = cacheRef.current.get(destination);
    if (cached) {
      setPhrases(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchPhrases(destination)
      .then((data) => {
        if (!cancelled) {
          cacheRef.current.set(destination, data);
          setPhrases(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load phrases');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [destination]);

  return { phrases, isLoading, error };
}
```

- [ ] **Step 3: Create useTips hook**

Create `voxlingo/hooks/useTips.ts`:

```typescript
import { useState, useEffect, useRef } from 'react';
import { fetchTips } from '../services/destination';
import { CulturalTip } from '../types';

export function useTips(destination: string | null) {
  const [tips, setTips] = useState<CulturalTip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, CulturalTip[]>());

  useEffect(() => {
    if (!destination) {
      setTips([]);
      return;
    }

    const cached = cacheRef.current.get(destination);
    if (cached) {
      setTips(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchTips(destination)
      .then((data) => {
        if (!cancelled) {
          cacheRef.current.set(destination, data);
          setTips(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tips');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [destination]);

  return { tips, isLoading, error };
}
```

- [ ] **Step 4: Create useCulture hook**

Create `voxlingo/hooks/useCulture.ts`:

```typescript
import { useState, useEffect, useRef } from 'react';
import { fetchCultureCategory } from '../services/destination';
import { CultureEntry, CultureCategory } from '../types';

export function useCulture(destination: string | null, category: CultureCategory | null) {
  const [entries, setEntries] = useState<CultureEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, CultureEntry[]>());

  useEffect(() => {
    if (!destination || !category) {
      setEntries([]);
      return;
    }

    const key = `${destination}:${category}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setEntries(cached);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchCultureCategory(destination, category, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          cacheRef.current.set(key, data);
          setEntries(data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load content');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [destination, category]);

  return { entries, isLoading, error };
}
```

- [ ] **Step 5: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add voxlingo/services/destination.ts voxlingo/hooks/usePhrases.ts voxlingo/hooks/useTips.ts voxlingo/hooks/useCulture.ts
git commit -m "feat: add separate data hooks with client caching and abort"
```

---

### Task 4: Server Endpoint

**Files:**
- Modify: `voxlingo/server/index.ts`

- [ ] **Step 1: Add the culture endpoint**

Add the following before `return app;` (line 476) in `voxlingo/server/index.ts`:

```typescript
  // --- Culture content endpoint ---

  const CULTURE_CATEGORIES: Record<string, { count: number; prompt: (lang: string, country: string) => string }> = {
    'dos-donts': {
      count: 8,
      prompt: (lang, country) => `Generate 8 do's and don'ts for tourists visiting ${country} (${lang}-speaking).

For each item, provide:
- id: unique string (e.g. "1", "2")
- category: "dos-donts"
- title: starts with "Do:" or "Don't:" (3-8 words)
- body: 1-2 sentences explaining why
- countryCode: will be set server-side
- speakable: null

Focus on practical, non-obvious advice. Avoid stereotypes.

Return JSON array ONLY: [{ "id": "1", "title": "...", "body": "...", "speakable": null, "romanized": null }]`,
    },
    'gestures': {
      count: 6,
      prompt: (lang, country) => `Generate 6 body language and gesture tips for tourists visiting ${country} (${lang}-speaking).

Cover: greetings (handshake/bow/etc), hand signals, eye contact, personal space, pointing, beckoning.

For each item:
- id: unique string
- category: "gestures"
- title: 3-6 words
- body: 1-2 sentences explaining the gesture and when to use/avoid it
- speakable: null
- romanized: null

Return JSON array ONLY: [{ "id": "1", "title": "...", "body": "...", "speakable": null, "romanized": null }]`,
    },
    'food': {
      count: 8,
      prompt: (lang, country) => `Generate 8 food guide entries for tourists visiting ${country} (${lang}-speaking).

Include: 5 must-try dishes, 2 eating etiquette tips, 1 dietary vocabulary entry.

For each item:
- id: unique string
- category: "food"
- title: dish name or tip title (3-8 words)
- body: 1-2 sentences describing the dish or explaining the etiquette
- speakable: the dish/phrase name in ${lang} native script (null for etiquette tips)
- romanized: pronunciation in Latin characters (null if ${lang} uses Latin script, null for etiquette tips)

Return JSON array ONLY: [{ "id": "1", "title": "...", "body": "...", "speakable": "...", "romanized": "..." }]`,
    },
    'tipping': {
      count: 5,
      prompt: (lang, country) => `Generate 5 tipping and payment custom entries for tourists visiting ${country}.

Cover: restaurants, taxis, hotels/porters, cash vs card norms, service charges or tax.

For each item:
- id: unique string
- category: "tipping"
- title: 3-6 words
- body: 1-2 sentences with specific amounts/percentages when relevant
- speakable: null
- romanized: null

Return JSON array ONLY: [{ "id": "1", "title": "...", "body": "...", "speakable": null, "romanized": null }]`,
    },
    'sacred-sites': {
      count: 5,
      prompt: (lang, country) => `Generate 5 religious and sacred site etiquette entries for tourists visiting ${country}.

Cover: dress code, shoes on/off rules, photography rules, expected behavior, offerings or donations.

For each item:
- id: unique string
- category: "sacred-sites"
- title: 3-6 words
- body: 1-2 sentences of actionable advice
- speakable: null
- romanized: null

Return JSON array ONLY: [{ "id": "1", "title": "...", "body": "...", "speakable": null, "romanized": null }]`,
    },
    'numbers': {
      count: 10,
      prompt: (lang, country) => `Generate entries for numbers 1 through 10 in ${lang} as spoken in ${country}.

For each number:
- id: the number as string ("1", "2", etc.)
- category: "numbers"
- title: "1 — One", "2 — Two", etc. (number + English word)
- body: brief usage note (e.g., "Used when counting items at a market")
- speakable: the number word in ${lang} native script
- romanized: pronunciation in Latin characters (null if ${lang} uses Latin script)

Return JSON array ONLY: [{ "id": "1", "title": "1 — One", "body": "...", "speakable": "...", "romanized": "..." }]`,
    },
  };

  const cultureCache = new Map<string, { data: unknown[]; timestamp: number }>();

  app.get('/destination/:code/culture/:category', async (req: Request, res: Response) => {
    const code = req.params.code.toUpperCase();
    const category = req.params.category;
    const langName = COUNTRY_LANGS[code];

    if (!langName) {
      res.status(400).json({ error: 'Invalid country code' });
      return;
    }

    const categoryDef = CULTURE_CATEGORIES[category];
    if (!categoryDef) {
      res.status(400).json({ error: 'Invalid category' });
      return;
    }

    const cacheKey = `${code}:${category}`;
    const cached = cultureCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.json(cached.data);
      return;
    }

    const prompt = categoryDef.prompt(langName, `a ${langName}-speaking country (${code})`);

    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = result.text ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        res.status(500).json({ error: 'Failed to parse culture response' });
        return;
      }

      const entries = JSON.parse(jsonMatch[0]);

      // Validate entries have required fields
      const valid = entries.filter(
        (e: Record<string, unknown>) =>
          typeof e.id === 'string' && typeof e.title === 'string' && typeof e.body === 'string'
      );

      if (valid.length === 0) {
        res.status(500).json({ error: 'No valid entries in Gemini response' });
        return;
      }

      // Set countryCode, category, and unique IDs on each entry
      const enriched = valid.map((e: Record<string, unknown>, i: number) => ({
        ...e,
        id: `${code}-${category}-${i + 1}`,
        countryCode: code,
        category,
      }));

      cultureCache.set(cacheKey, { data: enriched, timestamp: Date.now() });
      res.json(enriched);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate culture content';
      res.status(500).json({ error: message });
    }
  });
```

- [ ] **Step 2: Test the endpoint manually**

Run the server: `cd voxlingo/server && npm run dev`

Then in another terminal:
```bash
curl http://localhost:3001/destination/JP/culture/food
```
Expected: JSON array of 8 food entries with `id`, `title`, `body`, `speakable`, `countryCode: "JP"`, `category: "food"`

Test invalid category:
```bash
curl http://localhost:3001/destination/JP/culture/invalid
```
Expected: `{"error":"Invalid category"}`

- [ ] **Step 3: Commit**

```bash
git add voxlingo/server/index.ts
git commit -m "feat: add /destination/:code/culture/:category endpoint with validation"
```

---

### Task 5: CategoryChips Component

**Files:**
- Create: `voxlingo/components/CategoryChips.tsx`

- [ ] **Step 1: Create the component**

Create `voxlingo/components/CategoryChips.tsx`:

```typescript
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { CultureCategory } from '../types';
import { colors, spacing, radius, typography } from '../constants/theme';

type ChipDef = {
  key: CultureCategory;
  label: string;
};

type Props = {
  categories: ChipDef[];
  active: CultureCategory;
  onSelect: (category: CultureCategory) => void;
};

export function CategoryChips({ categories, active, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((cat) => {
        const isActive = cat.key === active;
        return (
          <TouchableOpacity
            key={cat.key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(cat.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add voxlingo/components/CategoryChips.tsx
git commit -m "feat: add CategoryChips component"
```

---

### Task 6: CultureCard Component

**Files:**
- Create: `voxlingo/components/CultureCard.tsx`

- [ ] **Step 1: Create the component**

Create `voxlingo/components/CultureCard.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CultureEntry } from '../types';
import { colors, spacing, radius, typography, shadow } from '../constants/theme';

type Props = {
  entry: CultureEntry;
  onSpeak?: (text: string) => void;
};

export function CultureCard({ entry, onSpeak }: Props) {
  const hasSpeakable = !!entry.speakable && !!onSpeak;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.content}>
          <Text style={styles.title}>{entry.title}</Text>
          <Text style={styles.body}>{entry.body}</Text>
          {entry.speakable && (
            <Text style={styles.speakable}>{entry.speakable}</Text>
          )}
          {entry.romanized && (
            <Text style={styles.romanized}>{entry.romanized}</Text>
          )}
        </View>
        {hasSpeakable && (
          <TouchableOpacity
            style={styles.speakButton}
            onPress={() => onSpeak!(entry.speakable!)}
            activeOpacity={0.7}
          >
            <Text style={styles.speakIcon}>🔊</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadow('sm'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  speakable: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  romanized: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  speakButton: {
    padding: spacing.sm,
  },
  speakIcon: {
    fontSize: 20,
  },
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add voxlingo/components/CultureCard.tsx
git commit -m "feat: add CultureCard component"
```

---

### Task 7: Culture Screen

**Files:**
- Create: `voxlingo/app/(tabs)/culture.tsx`

- [ ] **Step 1: Create the screen**

Create `voxlingo/app/(tabs)/culture.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDestinationContext } from '../../contexts/DestinationContext';
import { usePhrases } from '../../hooks/usePhrases';
import { useTips } from '../../hooks/useTips';
import { useCulture } from '../../hooks/useCulture';
import { CategoryChips } from '../../components/CategoryChips';
import { CultureCard } from '../../components/CultureCard';
import { PhraseCard } from '../../components/PhraseCard';
import { TipCard } from '../../components/TipCard';
import { DestinationPicker } from '../../components/DestinationPicker';
import { CultureCategory, CultureEntry, Phrase, CulturalTip } from '../../types';
import { colors, spacing, radius, typography, shadow } from '../../constants/theme';
import { speak } from '../../services/speech';
import { getDestination } from '../../constants/destinations';

const CATEGORIES: { key: CultureCategory; label: string }[] = [
  { key: 'phrases', label: 'Phrases' },
  { key: 'tips', label: 'Tips' },
  { key: 'dos-donts', label: "Do's & Don'ts" },
  { key: 'gestures', label: 'Gestures' },
  { key: 'food', label: 'Food' },
  { key: 'tipping', label: 'Tipping' },
  { key: 'sacred-sites', label: 'Sacred Sites' },
  { key: 'numbers', label: 'Numbers' },
];

// Categories that use the new /culture/ endpoint
const CULTURE_API_CATEGORIES = new Set<CultureCategory>([
  'dos-donts', 'gestures', 'food', 'tipping', 'sacred-sites', 'numbers',
]);

export default function CultureScreen() {
  const { destination, setDestination, getLanguageCode, isLoaded } = useDestinationContext();
  const [activeCategory, setActiveCategory] = useState<CultureCategory>('phrases');
  const [showPicker, setShowPicker] = useState(false);

  const cultureCategory = CULTURE_API_CATEGORIES.has(activeCategory) ? activeCategory : null;
  const { phrases, isLoading: phrasesLoading, error: phrasesError } = usePhrases(
    activeCategory === 'phrases' ? destination : null
  );
  const { tips, isLoading: tipsLoading, error: tipsError } = useTips(
    activeCategory === 'tips' ? destination : null
  );
  const { entries, isLoading: cultureLoading, error: cultureError } = useCulture(
    destination,
    cultureCategory,
  );

  const langCode = getLanguageCode();

  const handleSpeak = (text: string) => {
    if (langCode) speak(text, langCode);
  };

  const activeError = activeCategory === 'phrases' ? phrasesError
    : activeCategory === 'tips' ? tipsError
    : cultureError;

  // Wait for AsyncStorage to load saved destination before rendering
  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!destination) {
    return (
      <View style={styles.container}>
        <View style={styles.headerBlock}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>VoxLingo</Text>
              <Text style={styles.headerSub}>Culture Guide</Text>
            </View>
          </SafeAreaView>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>Explore local culture</Text>
          <Text style={styles.emptyText}>Select a destination to see phrases, tips, etiquette, and more</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => setShowPicker(true)}>
            <Text style={styles.emptyButtonText}>Choose destination</Text>
          </TouchableOpacity>
        </View>
        <DestinationPicker
          visible={showPicker}
          selectedCode={null}
          onSelect={(code) => setDestination(code)}
          onClose={() => setShowPicker(false)}
        />
      </View>
    );
  }

  const isLoading = activeCategory === 'phrases' ? phrasesLoading
    : activeCategory === 'tips' ? tipsLoading
    : cultureLoading;

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>VoxLingo</Text>
            </View>
            <TouchableOpacity onPress={() => setShowPicker(true)}>
              <Text style={styles.destinationBadge}>
                {getDestination(destination)?.countryName || destination}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <CategoryChips
        categories={CATEGORIES}
        active={activeCategory}
        onSelect={setActiveCategory}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {activeError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{activeError}</Text>
        </View>
      )}

      {!isLoading && !activeError && activeCategory === 'phrases' && (
        <FlatList
          data={phrases}
          keyExtractor={(item: Phrase) => item.id}
          renderItem={({ item }) => (
            <View style={styles.phraseCardWrapper}>
              <PhraseCard phrase={item} onSpeak={handleSpeak} />
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {!isLoading && !activeError && activeCategory === 'tips' && (
        <View style={styles.tipsContainer}>
          <TipCard tips={tips} />
        </View>
      )}

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

      <DestinationPicker
        visible={showPicker}
        selectedCode={destination}
        onSelect={(code) => setDestination(code)}
        onClose={() => setShowPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBlock: {
    backgroundColor: colors.headerBg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: colors.headerSubtext,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  destinationBadge: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  emptyButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  errorContainer: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  phraseCardWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tipsContainer: {
    flex: 1,
    paddingTop: spacing.md,
  },
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add voxlingo/app/(tabs)/culture.tsx
git commit -m "feat: add Culture screen with category chips and content"
```

---

### Task 8: Wire Up Tab Layout

**Files:**
- Modify: `voxlingo/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add DestinationProvider and Culture tab**

Replace the entire contents of `voxlingo/app/(tabs)/_layout.tsx` with:

```typescript
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { DestinationProvider } from '../../contexts/DestinationContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <DestinationProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 1,
            height: 56 + bottomPadding,
            paddingBottom: bottomPadding,
            paddingTop: 6,
          },
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Travel',
            tabBarIcon: ({ focused }) => (
              <Text style={styles.tabIcon}>{focused ? '🎙️' : '🎤'}</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="culture"
          options={{
            title: 'Culture',
            tabBarIcon: ({ focused }) => (
              <Text style={styles.tabIcon}>{focused ? '📖' : '📚'}</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="camera"
          options={{
            title: 'Camera',
            tabBarIcon: ({ focused }) => (
              <Text style={styles.tabIcon}>{focused ? '📸' : '📷'}</Text>
            ),
          }}
        />
      </Tabs>
    </DestinationProvider>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabIcon: {
    fontSize: 20,
  },
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add voxlingo/app/(tabs)/_layout.tsx
git commit -m "feat: add Culture tab and wrap layout with DestinationProvider"
```

---

### Task 9: Update Travel Screen

**Files:**
- Modify: `voxlingo/app/(tabs)/index.tsx`
- Delete: `voxlingo/hooks/useDestination.ts`

- [ ] **Step 1: Replace useDestination with useDestinationContext in Travel screen**

In `voxlingo/app/(tabs)/index.tsx`, make these changes:

Replace the imports:
```typescript
// Remove this import:
import { useDestination } from '../../hooks/useDestination';

// Add this import:
import { useDestinationContext } from '../../contexts/DestinationContext';
```

Remove these imports (no longer used on Travel screen):
```typescript
// Remove:
import { PhraseRow } from '../../components/PhraseRow';
import { TipCard } from '../../components/TipCard';
```

Replace the `useDestination` call (line 38-39) with:
```typescript
  const { destination, setDestination, hotelAddress, setHotelAddress, saveHotelAddress, getLanguageCode, isLoaded } =
    useDestinationContext();
```

Note: `isLoaded` is available if needed for future enhancements, but the Travel screen doesn't gate on it since it has a valid empty state (the "Where are you traveling?" prompt) that works fine during the brief load.

Remove the `loadSaved` call — context handles it now. Remove lines 48-50:
```typescript
  // Remove:
  useEffect(() => {
    loadSaved();
  }, []);
```

Remove the `destLoading` and `destError` variables since they came from the old hook. Remove `phrases` and `tips` references.

In the `ErrorBanner`, change `destError` to `null` (no destination-level errors on Travel anymore):
```typescript
<ErrorBanner message={error} onDismiss={clearError} />
```

Remove the PhraseRow/TipCard section (lines 191-199). Replace the `travelContent` block content with just the hotel and taxi sections:
```typescript
        {destination && translations.length === 0 && (
          <ScrollView style={styles.travelContent} showsVerticalScrollIndicator={false}>
            <View style={styles.hotelSection}>
              <Text style={styles.hotelLabel}>Your hotel / accommodation</Text>
              <TextInput
                style={styles.hotelInput}
                placeholder="Enter address to show taxi drivers"
                placeholderTextColor={colors.textMuted}
                value={hotelAddress}
                onChangeText={setHotelAddress}
                onBlur={saveHotelAddress}
                multiline
              />
            </View>
            <TouchableOpacity style={styles.taxiButton} onPress={() => setShowTaxi(true)}>
              <Text style={styles.taxiButtonText}>Show location to taxi driver</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
```

- [ ] **Step 2: Verify no other files import useDestination**

Run: `grep -r "useDestination" voxlingo/ --include="*.ts" --include="*.tsx" -l`
Expected: Only `voxlingo/hooks/useDestination.ts` itself (no other consumers). If other files still import it, update them to use `useDestinationContext` first.

- [ ] **Step 3: Delete the old useDestination hook**

Delete `voxlingo/hooks/useDestination.ts`.

- [ ] **Step 4: Run typecheck**

Run: `cd voxlingo && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add voxlingo/app/(tabs)/index.tsx
git rm voxlingo/hooks/useDestination.ts
git commit -m "refactor: Travel screen uses DestinationContext, remove phrases/tips"
```

---

### Task 10: Manual Verification

- [ ] **Step 1: Start the server**

Run: `cd voxlingo/server && npm run dev`

- [ ] **Step 2: Start Expo**

Run: `cd voxlingo && npx expo start`

- [ ] **Step 3: Verify tab navigation**

Open the app. Confirm 3 tabs: Travel (🎤) — Culture (📚) — Camera (📷). Culture is in the middle.

- [ ] **Step 4: Verify Culture screen empty state**

Tap Culture tab with no destination set. Should show "Explore local culture" with a "Choose destination" button.

- [ ] **Step 5: Verify destination sharing**

Select Japan on Travel screen. Switch to Culture tab. Should show "Japan" in the header badge.

- [ ] **Step 6: Verify phrases on Culture screen**

On Culture screen with Japan selected, "Phrases" chip should be active and show phrase cards.

- [ ] **Step 7: Verify tips on Culture screen**

Tap "Tips" chip. Should show the tip carousel.

- [ ] **Step 8: Verify new categories**

Tap through each chip: Do's & Don'ts, Gestures, Food, Tipping, Sacred Sites, Numbers. Each should load cards from the server.

- [ ] **Step 9: Verify client cache**

Switch from Food to Gestures, then back to Food. Second load should be instant (no loading spinner).

- [ ] **Step 10: Verify TTS**

On Food or Numbers, tap the 🔊 button on a card with speakable content. Should speak in the destination language.

- [ ] **Step 11: Verify Travel screen is clean**

Switch to Travel tab. Should show language pickers, hotel input, taxi button — no phrases or tips.

- [ ] **Step 12: Verify SOS stays on Travel**

SOS button should only appear on Travel screen, not Culture.
