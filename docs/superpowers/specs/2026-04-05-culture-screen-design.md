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
| Temple | Dress codes, photo rules, sacred site behavior | New — Gemini API |
| Numbers | Counting 1-10, reading prices, currency info | New — Gemini API |

**Default chip**: "Phrases" selected on first load.

**Content area**: Vertical scrollable list of cards for the selected category. Each card styled consistently — left accent border, category label, title, body text, and a 🔊 TTS button where applicable (phrases, numbers).

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

Both Travel and Culture screens need the selected destination. The current `useDestination` hook lives in Travel's local state. It needs to become shared — either via React Context or by lifting to the tab layout.

**Approach**: Create a `DestinationContext` provider wrapping the tab navigator in `app/(tabs)/_layout.tsx`. Both screens consume it. The hook's existing logic (AsyncStorage persistence, fetch phrases/tips) stays the same, just moves into the context.

## New Data Types

```typescript
// Add to types/travel.ts

export type CultureCategory =
  | 'phrases' | 'tips' | 'dos-donts' | 'gestures'
  | 'food' | 'tipping' | 'temple' | 'numbers';

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

**Prompt structure per category:**

- **dos-donts** (8 items): "Generate 8 do's and don'ts for tourists visiting [country]. Each item should have a clear title starting with 'Do:' or 'Don't:', and a 1-2 sentence body explaining why."
- **gestures** (6 items): "Generate 6 body language / gesture tips for [country]. Cover greetings, hand signals, eye contact, personal space. Title + 1-2 sentence explanation."
- **food** (8 items): "Generate 8 food guide entries for [country]. Include must-try dishes, eating etiquette, and dietary vocabulary. Title + description. Include speakable field with the dish/phrase in native script."
- **tipping** (5 items): "Generate 5 tipping and payment custom entries for [country]. Cover restaurants, taxis, hotels, cash vs card, service charges."
- **temple** (5 items): "Generate 5 religious/sacred site etiquette entries for [country]. Cover dress code, shoes, photos, behavior, offerings."
- **numbers** (10 items): "Generate entries for numbers 1-10 in [language]. Include speakable (native script) and romanized pronunciation."

Each uses the same cache map pattern (`cultureCache: Map<string, Map<string, {...}>>`).

## New Components

### `CultureScreen` — `app/(tabs)/culture.tsx`

Screen component. Consumes `DestinationContext`. Renders header, chip row, and content list. Manages active category state locally.

### `CategoryChips` — `components/CategoryChips.tsx`

Horizontal `ScrollView` of pressable chips. Props: `categories: { key: CultureCategory; label: string }[]`, `active: CultureCategory`, `onSelect: (cat: CultureCategory) => void`.

### `CultureCard` — `components/CultureCard.tsx`

Vertical card for a single culture entry. Left accent border, category label, title, body. Optional 🔊 button when `speakable` is present. Reuses the existing `speech.ts` service for TTS.

## Modified Files

| File | Change |
|------|--------|
| `app/(tabs)/_layout.tsx` | Add Culture tab (middle), wrap with `DestinationContext.Provider` |
| `app/(tabs)/index.tsx` | Remove PhraseRow/TipCard rendering, consume `DestinationContext` instead of local `useDestination` |
| `app/(tabs)/culture.tsx` | **New** — Culture screen |
| `components/CategoryChips.tsx` | **New** — chip filter row |
| `components/CultureCard.tsx` | **New** — culture entry card |
| `hooks/useDestination.ts` | Refactor into `DestinationContext` — same logic, context wrapper |
| `hooks/useCulture.ts` | **New** — fetch culture entries by category, manage loading/cache |
| `services/destination.ts` | Add `fetchCultureCategory(code, category)` |
| `types/travel.ts` | Add `CultureCategory`, `CultureEntry` types |
| `server/index.ts` | Add `GET /destination/:code/culture/:category` endpoint with Gemini prompts + cache |

## Verification

1. **Tab navigation**: All 3 tabs render, Culture is in the middle, icons show correctly
2. **Destination sharing**: Select a destination on Travel, switch to Culture — it should show content for that destination
3. **Category chips**: Each chip loads its content; switching chips shows different content
4. **Phrases & Tips**: Moved content renders identically to how it looked on Travel
5. **New categories**: Each of the 6 new categories returns content from the server
6. **TTS**: 🔊 button speaks the `speakable` text in the destination language
7. **Empty state**: Culture screen without a destination shows the prompt to select one
8. **Travel screen**: Cleaner layout — no phrases/tips, just translation + taxi + SOS
9. **Persistence**: Destination persists across app restarts (AsyncStorage, already works)
10. **Server cache**: Hit the same category twice — second request should be instant (cache hit)
