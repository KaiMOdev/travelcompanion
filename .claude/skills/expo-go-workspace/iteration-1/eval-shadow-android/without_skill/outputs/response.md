# Android Shadow / Elevation Issue

## What is happening

Your project already has a `makeShadow` helper in `voxlingo/theme/spacing.ts` that correctly returns only `{ elevation }` on Android and the full `shadowColor/shadowOffset/shadowOpacity/shadowRadius` set on iOS. That part is fine.

However, there are two distinct problems causing "flat box, no shadow" on Android:

### 1. Android `elevation` does not support colored shadows

On Android, `elevation` renders a shadow using the system's default shadow color (a semi-transparent black). It completely ignores `shadowColor`. Your glow presets (`glowSm`, `glowMd`, etc.) use blue/red/green shadow colors, which only show on iOS. On Android you will only ever get a grey/black drop shadow from `elevation` -- and on a **dark background** like your `bgPrimary: "#0f172a"`, that dark shadow is nearly invisible against the dark surface.

### 2. Most of your card styles have no shadow at all

Looking at your card styles in `settings.tsx`, none of them (`accountCard`, `langCard`, `historyCard`, `wordCard`) use `shadows.*` or `elevation`. They rely only on `borderWidth: 1` and `borderColor: colors.bgElevated` for visual separation. Same for `SkeletonCard`. So those cards will always appear flat on both platforms -- they simply have no shadow defined.

Only the mic button and swap button in `index.tsx` and the end-call button in `meeting.tsx` use the `shadows.*` presets.

## How to fix it

### Option A: Add elevation to card styles (simple, subtle)

Add `elevation` to your card styles. Be aware it will only produce a standard dark shadow, which is hard to see on dark backgrounds:

```tsx
accountCard: {
  ...existingStyles,
  elevation: 4,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
},
```

Or spread `...shadows.glowSm` into the card styles.

### Option B: Fake the shadow with a wrapper view (colored glow on Android)

Android does not support colored shadows natively. To get a colored glow effect, simulate it with a slightly larger colored background view wrapping the card.

### Option C: Use `react-native-shadow-2`

Libraries like `react-native-shadow-2` render real colored shadows on Android using an extra native view. It depends on `react-native-svg` which works in Expo Go:

```
npx expo install react-native-shadow-2 react-native-svg
```

### Option D: Design workaround (recommended for dark themes)

On dark themes, shadows are inherently hard to see. Many dark-themed apps skip shadows entirely and instead use lighter `backgroundColor` on elevated surfaces, subtle bright borders, or slight gradients. Your existing `borderWidth: 1, borderColor: colors.bgElevated` approach is actually standard practice. If you want more depth, bump the surface color slightly lighter or increase border opacity.

## Summary

| Approach | Colored shadow on Android? | Complexity | Expo Go compatible? |
|----------|---------------------------|-----------|---------------------|
| `elevation` | No (dark only) | Trivial | Yes |
| Wrapper view hack | Approximate | Low | Yes |
| `react-native-shadow-2` | Yes | Medium | Yes |
| Design workaround (border/bg) | N/A | Trivial | Yes |

The root cause is that Android's `elevation` API only supports dark shadows and they are nearly invisible on dark backgrounds. Pick the approach that best fits your design goals.
