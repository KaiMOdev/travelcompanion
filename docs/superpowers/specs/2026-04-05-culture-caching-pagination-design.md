# Culture Caching & Pagination — Design Spec

## Context

Culture content is generated via Gemini on each request and cached only in memory (server) and useRef (client). Both caches are lost on restart. Content volume is low (5-10 items). This enhancement adds persistent caching on both sides, bumps content to 30 items per category, and adds pagination (10 at a time).

## What Changes

### 1. Server: file-based persistent cache

Currently: in-memory `Map` lost on server restart.

New: Write generated content to `voxlingo/server/cache/` as JSON files. On startup, load all cache files into memory. On new generation, write to disk + update memory.

**Cache file naming**: `{countryCode}-{category}.json` (e.g., `JP-food.json`)

**Cache file format**:
```json
{
  "timestamp": 1712345678000,
  "data": [{ "id": "JP-food-1", "title": "...", ... }]
}
```

**TTL**: 7 days (content doesn't change fast enough to justify 24h). Check file `timestamp` field. If expired, regenerate and overwrite.

**Startup**: Read all `.json` files from cache dir into the existing `cultureCache` Map.

**Gitignore**: Add `voxlingo/server/cache/` to `.gitignore`.

### 2. Client: AsyncStorage persistent cache

Currently: `useRef(Map)` lost on app restart.

New: After fetching from server, persist to AsyncStorage. On next mount, load from AsyncStorage first (instant render), then check freshness.

**Storage key**: `culture:${countryCode}:${category}`

**Storage format**: JSON string of `{ timestamp: number, data: CultureEntry[] }`

**Freshness**: If cached data exists and is < 7 days old, use it without hitting server. If stale or missing, fetch from server and update AsyncStorage.

**Flow**:
1. Hook mounts → check AsyncStorage
2. If fresh cache exists → set entries immediately (no loading spinner)
3. If no cache or stale → fetch from server → save to AsyncStorage → set entries

### 3. Bump to 30 items per category

Update all 6 Gemini prompts in `server/index.ts` to request 30 items instead of current counts (5-10).

**Categories and new counts**:
| Category | Old | New |
|----------|-----|-----|
| dos-donts | 8 | 30 |
| gestures | 6 | 30 |
| food | 8 | 30 |
| tipping | 5 | 30 |
| sacred-sites | 5 | 30 |
| numbers | 10 | 10 (keep — only 10 digits) |

Note: Numbers stays at 10 (there are only 10 basic numbers).

### 4. Pagination on Culture screen

Show 10 items at a time with navigation.

**UI**: At the bottom of the list, a pagination bar:
- "Previous" button (disabled on page 1)
- Page indicator: "1-10 of 30"
- "Next" button (disabled on last page)

**State**: `page` number in `useCulture` hook. Entries sliced as `data.slice((page-1)*10, page*10)`. Page resets to 1 when category or destination changes.

**Scroll**: When page changes, scroll to top of list.

### 5. Unchanged

- Phrases endpoint (`/destination/:code/phrases`) — stays as-is (10 items, API-generated)
- Tips endpoint (`/destination/:code/tips`) — stays as-is (5 items, API-generated)
- Phrases/tips display on Culture screen — no pagination needed for these small lists

## Modified Files

| File | Change |
|------|--------|
| `server/index.ts` | File-based cache (read on startup, write on generate), bump prompt counts to 30, 7-day TTL |
| `hooks/useCulture.ts` | AsyncStorage caching, pagination state (page, pageSize), return paginated slice + total + page controls |
| `app/(tabs)/culture.tsx` | Render pagination bar below content list, handle page changes, scroll to top |
| `.gitignore` | Add `voxlingo/server/cache/` |

## Verification

1. **Server cache persistence**: Generate content, restart server, hit same endpoint — should return cached data instantly (no Gemini call)
2. **Client cache persistence**: Fetch a category, reload the app, switch to Culture — should show data instantly from AsyncStorage
3. **30 items**: Each category returns 30 items (except numbers: 10)
4. **Pagination**: First load shows items 1-10, "Next" shows 11-20, "Next" shows 21-30, "Next" disabled
5. **Page reset**: Switch category or destination — page resets to 1
6. **TTL**: Data older than 7 days triggers re-generation
7. **Cache dir**: `server/cache/` created automatically, gitignored
