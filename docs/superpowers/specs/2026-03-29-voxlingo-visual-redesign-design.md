# VoxLingo Visual Redesign — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Scope:** Full visual redesign of all 4 screens + design system + shared components

## Design Direction

| Decision | Choice |
|----------|--------|
| Personality | Bold & Modern |
| Color Palette | Electric Blue (deep slate + blue→cyan gradient) |
| Typography | Space Grotesk (display/headings) + system fonts (body) |
| Icons | Lucide Icons (tree-shakeable, ~2KB per icon) |
| Travel Layout | Chat-First + Bottom Mic |
| Navigation | Full-width tab bar with gradient active indicator |
| Animations | Polished & Expressive (waveform, spring physics, skeleton states) |

---

## 1. Design System Foundation

### 1.1 Color Tokens

**Backgrounds:**

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0f172a` | Main screen background |
| `bg-surface` | `#1e293b` | Cards, input fields, elevated surfaces |
| `bg-elevated` | `#334155` | Borders, dividers, tertiary surfaces |
| `bg-overlay` | `rgba(15,23,42,0.85)` | Modal/camera overlays with backdrop blur |

**Accent Gradient:**

| Token | Value | Usage |
|-------|-------|-------|
| `accent-blue` | `#3b82f6` | Primary interactive elements |
| `accent-cyan` | `#06b6d4` | Secondary accent, "To" language |
| `accent-gradient` | `linear-gradient(135deg, #3b82f6, #06b6d4)` | CTA buttons, mic, active tab, translation bubbles |
| `accent-light` | `#22d3ee` | Highlights, hover states |

**Semantic:**

| Token | Hex | Usage |
|-------|-----|-------|
| `error` | `#ef4444` | Stop button, error banners, destructive actions |
| `success` | `#10b981` | Live indicator, meeting timer, Speaker 3 |
| `warning` | `#f59e0b` | Warnings (rate limit, low battery) |

**Text:**

| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#f8fafc` | Headings, translated text, primary labels |
| `text-secondary` | `#cbd5e1` | Source text in chat bubbles, body copy |
| `text-muted` | `#64748b` | Section labels, hints, timestamps |
| `text-subtle` | `#94a3b8` | Placeholders, disabled states |
| `text-dim` | `#475569` | Inactive tab labels, tertiary info |

### 1.2 Typography

| Level | Font | Weight | Size | Usage |
|-------|------|--------|------|-------|
| Display | Space Grotesk | 700 | 28px | App logo "VoxLingo" |
| Heading | Space Grotesk | 600 | 20px | Screen titles, section headers |
| Subheading | System | 600 | 16px | Language pair labels, card titles |
| Body | System | 400 | 15px | Source text, descriptions |
| Translation | System | 600 | 17px | Translated text (slightly larger than body) |
| Caption | System | 400 | 12px | Timestamps, hints, secondary labels |
| Label | System | 600 | 10px | Uppercase section labels (letter-spacing: 1.5px) |

**Display font:** Space Grotesk is a geometric sans-serif. Load via `expo-font` or `@expo-google-fonts/space-grotesk`. Used only for the logo and screen headings — keep the bundle small.

**Body font:** System fonts (San Francisco on iOS, Roboto on Android). Critical for multilingual support — system fonts handle Latin, CJK, Arabic, Cyrillic, Devanagari natively.

### 1.3 Spacing Scale

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 12px |
| `lg` | 16px |
| `xl` | 24px |
| `2xl` | 32px |

### 1.4 Border Radii

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 6px | Small chips, badges |
| `md` | 10px | Header action buttons, inputs |
| `lg` | 14px | Cards, result items |
| `xl` | 20px | Language chips, pills |
| `full` | 50% (circle) | Avatars, mic button |

### 1.5 Shadows (Glow)

Dark backgrounds don't benefit from traditional box-shadow. Use colored glow instead:

| Token | Value | Usage |
|-------|-------|-------|
| `glow-sm` | `0 0 20px rgba(59,130,246,0.2)` | Swap button, subtle accent |
| `glow-md` | `0 0 30px rgba(59,130,246,0.3)` | Mic button (idle) |
| `glow-lg` | `0 0 40px rgba(59,130,246,0.4), 0 0 80px rgba(6,182,212,0.15)` | Mic button (active/recording) |
| `glow-error` | `0 0 30px rgba(239,68,68,0.3)` | Stop button |
| `glow-success` | `0 0 20px rgba(16,185,129,0.3)` | Active speaker avatar |

### 1.6 Component Primitives

**Buttons:**

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| Primary | `accent-gradient` | `#fff` | none | CTAs: Start Session, Scan Again |
| Secondary | `bg-surface` | `text-primary` | `1px solid bg-elevated` | Export, Share |
| Destructive | `rgba(239,68,68,0.15)` | `error` | none | Stop actions (ghost style) |
| Text | transparent | `accent-blue` | none | Links, tertiary actions |

All buttons use `border-radius: lg (14px)` and `padding: 14px`.

**Language Chips:**

- Inactive: `bg-surface`, `text-primary`, `1px solid bg-elevated`, `border-radius: xl`
- Active: `accent-gradient`, `#fff`, no border

**Surface Cards:**

- Background: `bg-surface`
- Border: `1px solid bg-elevated`
- Border-radius: `lg (14px)`
- Padding: `lg (16px)`

---

## 2. Travel Screen

### 2.1 Layout Structure

```
┌─────────────────────────┐
│ Header: Logo + Settings │
├─────────────────────────┤
│ Language Bar: From ⇄ To │
├─────────────────────────┤
│                         │
│   Chat Bubble Area      │
│   (scrollable)          │
│                         │
├─────────────────────────┤
│ Input Bar: Text + Mic   │
└─────────────────────────┘
```

### 2.2 States

**Idle (empty):**
- Ghost chat icon (Lucide `message-square`, stroke `bg-elevated`) centered
- "Start a conversation" in `text-dim`, "Tap the mic or type a phrase" in `text-dim` lighter
- Bottom bar: text input (rounded pill, `bg-surface`) + mic button (gradient, `glow-md`)

**Recording:**
- Chat area replaced by centered waveform visualization
- 12 vertical bars, 4px wide, heights driven by audio amplitude
- Bar fill: alternating `accent-blue` and `accent-cyan` with gradient transitions
- Spring physics on bar heights (damping: 0.6, stiffness: 200)
- "Listening..." label in `accent-blue`, "Release to translate" in `text-dim`
- Bottom bar transforms: mic → red stop button (square icon, `glow-error`), "Cancel" text left

**Conversation:**
- Language bar compacts to a centered pill chip: "EN → JA"
- Header gains a clear/history button (Lucide `list`)
- Chat bubbles:
  - Source (left-aligned): `bg-surface`, `border-radius: 16px 16px 16px 4px`, `1px solid bg-elevated`
  - Translation (right-aligned): `accent-gradient`, `border-radius: 16px 16px 4px 16px`
  - Source text: `text-secondary`, 14px
  - Translation text: `#fff`, 15px, weight 500
  - Timestamp below each pair: `text-dim`, 10px
  - Audio replay hint below translations: cyan speaker icon + "Tap to replay"

### 2.3 Animations

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Mic glow (idle) | Pulse opacity 0.3→0.5 | 2s loop | ease-in-out |
| Mic glow (recording) | Expand + intensify | 1s loop | ease-in-out |
| Mic → Stop transform | Scale + color morph | 200ms | spring |
| Waveform bars | Height driven by amplitude | continuous | spring (d:0.6, s:200) |
| Chat bubble (source) | translateX(-12px)→0, opacity 0→1 | 300ms | spring |
| Chat bubble (translation) | translateX(12px)→0, opacity 0→1 | 300ms | spring (50ms delay) |
| Language swap | Rotate arrow 180° + cross-fade labels | 300ms | spring |
| Audio replay | Ripple on bubble + icon pulse | 600ms | ease-out |
| Auto-scroll | Smooth scroll to bottom | 200ms | ease-out |

---

## 3. Camera Screen

### 3.1 Layout Structure

```
┌─────────────────────────┐
│ Camera Viewfinder       │
│ (full bleed, dark)      │
│                         │
│   ┌─────────────────┐   │
│   │ Scan Frame      │   │
│   │ (corner guides) │   │
│   └─────────────────┘   │
│                         │
├─────────────────────────┤
│ Mode Toggle: Photo|Live │
│ Controls: Lang + Shutter│
└─────────────────────────┘
```

Base background: `#000` (camera screen is fully dark to complement viewfinder).

### 3.2 States

**Photo Mode (viewfinder):**
- Full camera preview, dark gradient overlay at top for header
- Scan frame: 4 corner brackets in gradient (top: `accent-blue`, bottom: `accent-cyan`)
- Corner brackets pulse subtly (opacity 0.7→1.0, 1.5s loop)
- "Point camera at text to translate" hint centered below frame
- Bottom controls: Photo/Live Scan segmented toggle + language chip + white shutter button (classic ring style)

**Live Scan (active):**
- Green "LIVE" badge (top-right): green dot + "LIVE" text, `rgba(16,185,129,0.15)` background
- Translation overlays appear directly over detected text:
  - Frosted glass card: `bg-overlay` with `backdrop-filter: blur(12px)`
  - `1px solid rgba(59,130,246,0.3)` border
  - Shows: detected language label (cyan) → original text (muted) → divider → translated text (white, bold)
- Red stop button replaces shutter
- Cards fade in (200ms), reposition smoothly, stale cards fade out after 3s

**Photo Result:**
- Back arrow + "Scan Result" header
- Captured image preview with rounded corners + language badge overlay
- Scrollable translation result cards:
  - Original text: `text-subtle`, 12px
  - Translation: `text-primary`, 16px, weight 600
  - Context hint: `text-muted`, 11px, italic (e.g., "A popular Japanese noodle soup dish")
- Share + Save header actions (Lucide `upload` and `save`)
- "Scan Again" gradient CTA at bottom

### 3.3 Animations

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Corner brackets | Opacity pulse 0.7→1.0 | 1.5s loop | ease-in-out |
| Text detection | Brackets snap to text bounds | 200ms | spring |
| Live overlay card | Fade in + slight scale 0.97→1.0 | 200ms | ease-out |
| Stale card removal | Fade out | 300ms | ease-in |
| Photo capture | White flash overlay | 100ms | linear fade |
| Results panel | Slide up from bottom | 300ms | spring |
| Mode toggle pill | Slide between positions | 200ms | ease |

---

## 4. Meeting Screen

### 4.1 Layout Structure

```
┌─────────────────────────┐
│ Header: Title + Timer   │
│ Target Language (compact)│
├─────────────────────────┤
│                         │
│   Subtitle List         │
│   (scrollable)          │
│                         │
├─────────────────────────┤
│ Export | Stop | Share    │
└─────────────────────────┘
```

### 4.2 States

**Pre-Session:**
- "Translate to" language picker (full-width dropdown card)
- Empty state: group icon (Lucide `users`, `bg-elevated` stroke) centered
- "Ready to translate" heading, "Start a session..." subtext
- "Start Session" gradient CTA with glow

**Live Session:**
- Green LIVE badge with pulsing dot + timer counting up (e.g., "12:34")
- Compact target language line: globe icon + "Translating to English"
- Subtitle list with speaker entries:
  - Avatar: 36px circle, gradient fill from speaker color palette
  - Speaker label: speaker color, 11px, weight 600
  - Active speaker: avatar gets `glow-success` ring + mini waveform bars (3 bars, speaker color)
  - Original text: `text-muted`, 12px
  - Translation: `text-primary`, 14px, weight 500
  - Timestamp: `text-dim`, 10px
  - Light divider (`1px solid bg-surface`) between entries
- Bottom bar: Export (secondary) | Stop (red circle, 52px) | Share (secondary)

**Session Ended:**
- Summary card:
  - "Session Complete" label + duration
  - Stats row: Speakers count (blue) | Utterances count (cyan) | Languages count (green)
  - Vertical dividers between stats
- Compact transcript (smaller avatars: 24px, translation-only text, source language + timestamp)
- Export + Share buttons (secondary, side by side) + "New Session" gradient CTA

**Speaker Color Palette** (6 colors, assigned sequentially):

| Speaker | Gradient |
|---------|----------|
| S1 | `#3b82f6 → #2563eb` (blue) |
| S2 | `#8b5cf6 → #7c3aed` (violet) |
| S3 | `#10b981 → #059669` (emerald) |
| S4 | `#f59e0b → #d97706` (amber) |
| S5 | `#f43f5e → #e11d48` (rose) |
| S6 | `#14b8a6 → #0d9488` (teal) |

### 4.3 Animations

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Live dot | Opacity pulse 0.6→1.0 | 2s loop | ease-in-out |
| Active speaker glow | Glow expand/contract | 1.5s loop | ease-in-out |
| Active speaker waveform | Bar heights cycle | continuous | spring |
| New utterance | translateY(16px)→0, opacity 0→1 | 250ms | spring |
| Session end transition | Subtitles fade, summary slides up | 400ms | spring |
| Auto-scroll | Smooth scroll to latest | 200ms | ease-out |

---

## 5. Settings Screen

### 5.1 Layout Structure

```
┌─────────────────────────┐
│ Header: ← Settings      │
├─────────────────────────┤
│ Account Card            │
│ (avatar + name + email) │
├─────────────────────────┤
│ Default Languages       │
│ (From / To grouped)     │
├─────────────────────────┤
│ History | Word List tab  │
├─────────────────────────┤
│ Item list (scrollable)  │
├─────────────────────────┤
│ Sign Out                │
└─────────────────────────┘
```

### 5.2 Components

**Account Card:**
- Gradient avatar (44px circle) with user initials
- Name: `text-primary`, 15px, weight 600
- Email: `text-muted`, 12px
- Chevron right for navigation

**Default Language Pickers:**
- Section label: `Label` style ("DEFAULT LANGUAGES")
- Grouped card with two rows: From / To
- Each row: label left (`text-subtle`), value + chevron right
- "To" value in `accent-cyan`
- Divider between rows: `bg-primary` (creates inset effect)

**History / Word List Toggle:**
- Segmented control matching camera's Photo/Live Scan toggle
- Active segment: `accent-gradient`, white text
- Inactive: no background, `text-dim`

**History Items:**
- Surface card with:
  - Source text: `text-primary`, 13px, weight 500
  - Mode badge (right): colored dot + mode name in `text-dim`
    - Travel = blue dot, Camera = cyan dot, Meeting = violet dot
  - Translation: `accent-cyan`, 12px
  - Timestamp: `text-dim`, 10px

**Word List Items** (same card style):
- Word: `text-primary`, 13px, weight 500
- Translation: `accent-cyan`, 12px
- Delete swipe action: red background with trash icon

**Sign Out:** Red text link (`error` color), centered, bottom of scroll

---

## 6. Tab Bar

### 6.1 Structure

Full-width bottom bar on `bg-primary` background, `1px solid bg-surface` top border.

Three tabs: Travel (Lucide `mic`), Camera (Lucide `camera`), Meeting (Lucide `users`).

### 6.2 Active State

- Icon wrapped in gradient pill: `accent-gradient`, `border-radius: 14px`, `padding: 6px 16px`
- Icon stroke: `#fff`
- Label: `text-primary`, 10px, weight 600

### 6.3 Inactive State

- Icon stroke: `text-dim` (`#475569`)
- Label: `text-dim`, 10px, weight 400

### 6.4 Animation

- Active pill slides to selected tab with layout animation (200ms, spring)
- Icon cross-fades between white and muted

---

## 7. Shared Components

### 7.1 Language Picker Modal

- Bottom sheet style, slides up from bottom
- `bg-surface` background, `border-radius: xl (20px)` top corners
- Header: "Select Language" title + close button (X in circle)
- Search bar: `bg-primary`, Lucide `search` icon, `border-radius: md`
- Language list: scrollable, each row shows name + native script
- Selected item: blue tint background `rgba(59,130,246,0.1)` + blue checkmark
- Tap outside or X to dismiss

### 7.2 Error Banner

- `rgba(239,68,68,0.1)` background, `1px solid rgba(239,68,68,0.2)` border
- `border-radius: lg (14px)`
- Left: error icon in red ghost circle
- Center: error message (`#fca5a5`) + action text (`#f87171`)
- Right: retry icon (Lucide `refresh-cw`)
- Dismisses after 5s or on tap

### 7.3 Translating Indicator

- Ghost gradient bubble: `rgba(59,130,246,0.3) → rgba(6,182,212,0.3)`
- `1px solid rgba(59,130,246,0.2)` border
- Three dots bouncing sequentially (scale 0.8→1.2, staggered 150ms)
- "Translating..." caption below

### 7.4 Skeleton Loading

- Used for: history items, word list items, scan results
- Shimmer animation: gradient slides left-to-right (1.5s loop)
- Colors: `bg-elevated` → lighter → `bg-elevated`
- Matches layout of target component (same height, rounded corners)

### 7.5 Permission Request

- Centered layout: icon in circle → title → description → gradient CTA
- Used for: microphone (Travel/Meeting), camera (Camera), location (optional)
- Icon: relevant Lucide icon in `accent-blue`

---

## 8. Implementation Notes

### 8.1 New Dependencies

| Package | Purpose | Size Impact |
|---------|---------|-------------|
| `lucide-react-native` | Icon library | Tree-shakeable, ~2KB/icon |
| `@expo-google-fonts/space-grotesk` | Display font | ~50KB |
| `react-native-reanimated` | Spring physics, layout animations | ~65KB (new dependency) |

### 8.2 File Structure (New/Modified)

```
voxlingo/
├── theme/
│   ├── colors.ts          # Color tokens
│   ├── typography.ts      # Font sizes, weights, families
│   ├── spacing.ts         # Spacing scale
│   └── index.ts           # Re-exports all tokens
├── components/
│   ├── AudioWaveform.tsx   # Redesign: gradient bars, spring physics
│   ├── TranslationBubble.tsx  # Redesign: gradient right bubbles
│   ├── LanguagePicker.tsx  # Redesign: bottom sheet + search
│   ├── SubtitleOverlay.tsx # Redesign: gradient avatars, glow
│   ├── TabBar.tsx          # NEW: custom tab bar with gradient pill
│   ├── SkeletonCard.tsx    # NEW: shimmer loading cards
│   ├── ErrorBanner.tsx     # NEW: dismissible error bar
│   ├── TranslatingIndicator.tsx  # NEW: bouncing dots
│   └── PermissionRequest.tsx     # NEW: centered permission CTA
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx     # Update: custom TabBar component
│   │   ├── index.tsx       # Redesign: chat-first layout
│   │   ├── camera.tsx      # Redesign: corner guides, overlays
│   │   └── meeting.tsx     # Redesign: speaker colors, summary
│   └── settings.tsx        # Redesign: grouped cards, mode badges
```

### 8.3 Migration Strategy

This is a visual-only redesign. No changes to:
- Services (gemini.ts, vision.ts, firebase.ts, maps.ts, transcript.ts)
- Hooks (useAudioStream, useTranslation, useMeetingStream, useLanguageDetect)
- Server/backend
- Types or constants (except adding theme tokens)

Approach: Create the `theme/` module first, then update screens one at a time. Each screen can be redesigned independently since they share no visual state.
