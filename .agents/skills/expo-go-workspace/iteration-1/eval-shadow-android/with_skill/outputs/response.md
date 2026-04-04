# Android Shadow Issue — iOS Shadows Don't Work on Android

This is one of the most common platform differences in React Native. Android does not support iOS-style shadow properties (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`). You need to use `elevation` instead.

## The Fix

Use `Platform.select()` to apply the correct shadow style per platform:

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
```

## Important Android Gotchas

### 1. `backgroundColor` is required
`elevation` **requires** a `backgroundColor` to be set on the same view. Without it, the shadow simply won't render — this is the most common reason elevation "doesn't work."

```typescript
// Won't show shadow on Android — no backgroundColor
{ elevation: 4 }

// Will show shadow
{ elevation: 4, backgroundColor: '#1e293b' }
```

### 2. High `borderRadius` can crash Android
Border radius values above ~2000 (e.g., Tailwind's `rounded-full` = 9999) combined with `elevation` can crash the app on Android. Use a reasonable max like `borderRadius: 999`.

### 3. Elevation doesn't animate with parent opacity
If your card is inside a view that animates opacity, the elevation shadow won't animate along with it. Animate the elevated view directly instead.

### 4. No colored shadows on Android
Android's `elevation` only produces a standard dark grey shadow. It ignores `shadowColor`. On a dark theme like VoxLingo's (`bgPrimary: "#0f172a"`), this dark shadow can be nearly invisible.

**Workarounds for colored/visible shadows on dark themes:**
- Use lighter surface colors on elevated cards
- Add subtle borders (`borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'`)
- Use `react-native-shadow-2` (works in Expo Go, depends on `react-native-svg`)

## Your Project Already Has This

Your project has a `makeShadow` helper in `theme/spacing.ts` that handles this Platform split. Check that it's being used in your card component, and that the card has a `backgroundColor` set.

## Quick Checklist

- [ ] Card has `backgroundColor` set (required for Android elevation)
- [ ] Using `Platform.select()` or `makeShadow` helper for cross-platform shadows
- [ ] `borderRadius` is under 2000 on elevated views
- [ ] If shadow is invisible on dark background, consider border or lighter surface color
