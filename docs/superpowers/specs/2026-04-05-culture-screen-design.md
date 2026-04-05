# Culture Screen — Design Spec

## Context

The Travel screen currently serves double duty: it's the voice translator AND a cultural reference (phrases, tips). This makes it cluttered when a destination is selected, and the cultural content gets pushed down by translation bubbles. A dedicated Culture tab lets the reference content breathe and opens room for richer cultural guides (gestures, food, tipping, etc.), while the Travel screen stays focused on real-time translation.

## What Changes

### New: Culture tab (middle position)

**Tab bar**: Travel (🎤/🎙️) — **Culture (📚/📖)** — Camera (📷/📸)

**Navigation**: New file `app/(tabs)/culture.tsx`. Tab layout updated in `app/(tabs)/_layout.tsx`.

### Culture screen layout

**Header**: Same blue header as Travel, showing "VoxLingo" + destination badge. No SOS button (stays on Travel). Tapping destination badge opens the shared `DestinationPicker`.

**Category chips**: Horizontal scrollable row of filter chips below the header. One active at a time. Categories:

| Chip | Content | Source |
|------|---------|--------|
| Phrases | Essential phrases with translation + romanization + TTS | Existing — moved from Travel |
| Tips | Cultural tips carousel | Existing — moved from Travel |
| Do's & Don'ts | Detailed etiquette rules | New — Gemini API |
| Gestures | Body language, greetings, personal space | New — Gemini API |
| Food | Must-try dishes, how to eat them, dietary vocab | New — Gemini API |
| Tipping | When/how much, cash vs card, service charges | New — Gemini API |
| Sacred Sites | Dress codes, photo rules, sacred site behavior | New — Gemini API |
| Numbers | Counting 1-10, reading prices, currency info | New — Gemini API |

**Default chip**: "Phrases" selected on first load.

**Content area**: Vertical scrollable list of cards for the selected category. Each card styled consistently — left accent border, category label, title, body text, and a 🔊 TTS button where applicable (phrases, numbers, food).

**Empty state**: When no destination is selected, show a prompt: "Select a destination to explore its culture" with a button to open `DestinationPicker`.

### Travel screen — cleaned up

Remove from Travel screen:
- `PhraseRow` component and its rendering
- `TipCard` component and its rendering

Keep on Travel screen:
- Voice translation (core feature)
- Language pickers + swap
- Translation bubbles (FlatList)
- Conversation mode buttons
- SOS / Emergency card
- Taxi card
- Slow speech toggle

### Shared destination state

Both Travel and Culture screens need the selected destination. The current `useDestination` hook bundles selection + data fetching + persistence into one unit — this is too coupled for a multi-screen app.

**Approach**: Create a **minimal** `DestinationContext` that only handles:
- Selected destination (`string | null`)
- `setDestination(code)` — sets state + persists to AsyncStorage
- `loadSaved()` — restores from AsyncStorage on mount
- Hotel address state (used by Travel only, but lives here for persistence)

Data fetching (phrases, tips, culture entries) moves to **separate hooks** that take `destination` as input:
- `usePhrases(destination)` — used by Culture screen (Phrases chip)
- `useTips(destination)` — used by Culture screen (Tips chip)
- `useCulture(destination, category)` — used by Culture screen (new categories)

This separation means:
- No over-fetching — only the active screen/category triggers requests
- Independent loading/error states per data type
- No re-renders across screens from unrelated state changes

## New Data Types

```typescript
// Add to types/travel.ts

export type CultureCategory =
  | 'phrases' | 'tips' | 'dos-donts' | 'gestures'
  | 'food' | 'tipping' | 'sacred-sites' | 'numbers';

export type CultureEntry = {
  id: string;
  category: CultureCategory;
  title: string;
  body: string;
  countryCode: string;
  speakable?: string;       // text for TTS (native script)
  romanized?: string;       // pronunciation guide
};
```

Existing `Phrase` and `CulturalTip` types remain for the moved content. New categories (do's & don'ts through numbers) use the unified `CultureEntry` type.

## New API Endpoints

### `GET /destination/:code/culture/:category`

Returns `CultureEntry[]` for one of the 6 new categories. Server-side Gemini generation with 24h cache (same pattern as `/phrases` and `/tips`).

**Server-side validation**: Whitelist valid categories. Reject unknown categories with 400:

```typescript
const CULTURE_CATEGORIES = new Set([
  'dos-donts', 'gestures', 'food', 'tipping', 'sacred-sites', 'numbers'
]);

if (!CULTURE_CATEGORIES.has(category)) {
  return res.status(400).json({ error: 'Invalid category' });
}
```

**Response validation**: Before caching, validate each entry has required fields (`id`, `title`, `body`). Reject malformed Gemini responses instead of caching garbage.

**Prompt structure per category:**

- **dos-donts** (8 items): "Generate 8 do's and don'ts for tourists visiting [country]. Each item should have a clear title starting with 'Do:' or 'Don't:', and a 1-2 sentence body explaining why."
- **gestures** (6 items): "Generate 6 body language / gesture tips for [country]. Cover greetings, hand signals, eye contact, personal space. Title + 1-2 sentence explanation."
- **food** (8 items): "Generate 8 food guide entries for [country]. Include must-try dishes, eating etiquette, and dietary vocabulary. Title + description. Include speakable field with the dish/phrase in native script."
- **tipping** (5 items): "Generate 5 tipping and payment custom entries for [country]. Cover restaurants, taxis, hotels, cash vs card, service charges."
- **sacred-sites** (5 items): "Generate 5 religious/sacred site etiquette entries for [country]. Cover dress code, shoes, photos, behavior, offerings."
- **numbers** (10 items): "Generate entries for numbers 1-10 in [language]. Include speakable (native script) and romanized pronunciation."

All prompts include a strict JSON schema in the prompt to reduce malformed responses.

**Cache**: Flat `Map<string, { data: CultureEntry[]; timestamp: number }>` keyed by `${code}:${category}`.

## New Components

### `CultureScreen` — `app/(tabs)/culture.tsx`

Screen component. Consumes `DestinationContext` for the selected destination. Manages active category state locally. Delegates data fetching to `usePhrases`, `useTips`, or `useCulture` depending on active chip.

### `CategoryChips` — `components/CategoryChips.tsx`

Horizontal `ScrollView` of pressable chips. Props: `categories: { key: CultureCategory; label: string }[]`, `active: CultureCategory`, `onSelect: (cat: CultureCategory) => void`.

### `CultureCard` — `components/CultureCard.tsx`

Vertical card for a single culture entry. Left accent border, category label, title, body. Optional 🔊 button when `speakable` is present. Reuses the existing `speech.ts` service for TTS.

## Hooks

### `useCulture(destination, category)` — `hooks/useCulture.ts`

Fetches culture entries for one category. Features:
- **Client-side cache**: `useRef(Map)` keyed by `${destination}:${category}` — switching chips doesn't re-fetch already-loaded categories
- **AbortController**: Cancels in-flight requests when destination or category changes (prevents race conditions from rapid switching)
- Returns `{ entries, isLoading, error }`

### `usePhrases(destination)` — refactored from `useDestination`

Fetches phrases for the selected destination. Own loading/error state.

### `useTips(destination)` — refactored from `useDestination`

Fetches tips for the selected destination. Own loading/error state.

## Modified Files

| File | Change |
|------|--------|
| `app/(tabs)/_layout.tsx` | Add Culture tab (middle), wrap with `DestinationContext.Provider` |
| `app/(tabs)/index.tsx` | Remove PhraseRow/TipCard rendering, consume `DestinationContext` instead of local `useDestination` |
| `app/(tabs)/culture.tsx` | **New** — Culture screen |
| `components/CategoryChips.tsx` | **New** — chip filter row |
| `components/CultureCard.tsx` | **New** — culture entry card |
| `contexts/DestinationContext.tsx` | **New** — minimal destination selection + persistence context |
| `hooks/useDestination.ts` | **Remove** — logic split into context + separate data hooks |
| `hooks/useCulture.ts` | **New** — fetch culture entries by category with client cache + abort |
| `hooks/usePhrases.ts` | **New** — fetch phrases (extracted from useDestination) |
| `hooks/useTips.ts` | **New** — fetch tips (extracted from useDestination) |
| `services/destination.ts` | Add `fetchCultureCategory(code, category)` |
| `types/travel.ts` | Add `CultureCategory`, `CultureEntry` types |
| `server/index.ts` | Add `GET /destination/:code/culture/:category` endpoint with category whitelist, response validation, Gemini prompts + flat cache |

## Verification

1. **Tab navigation**: All 3 tabs render, Culture is in the middle, icons show correctly
2. **Destination sharing**: Select a destination on Travel, switch to Culture — it should show content for that destination
3. **Category chips**: Each chip loads its content; switching chips shows different content
4. **Client cache**: Switch away from a chip and back — should not re-fetch (instant)
5. **Phrases & Tips**: Moved content renders correctly on Culture screen
6. **New categories**: Each of the 6 new categories returns content from the server
7. **TTS**: 🔊 button speaks the `speakable` text in the destination language
8. **Empty state**: Culture screen without a destination shows the prompt to select one
9. **Travel screen**: Cleaner layout — no phrases/tips, just translation + taxi + SOS
10. **Persistence**: Destination persists across app restarts (AsyncStorage, already works)
11. **Server cache**: Hit the same category twice — second request should be instant (cache hit)
12. **Category validation**: Invalid category in URL returns 400
13. **Rapid switching**: Quick chip taps don't cause stale data to flash (AbortController)
