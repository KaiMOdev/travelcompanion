---
name: react-native-expert
description: Expert guidance for React Native + Expo mobile app development. Use this skill whenever working with React Native components, Expo SDK, mobile-specific code, platform differences (iOS/Android/Web), navigation (expo-router), audio/camera/permissions, animations, or debugging mobile crashes. Also trigger when the user encounters Android/iOS-specific errors, Expo Go limitations, native module issues, or asks about mobile UI patterns. Even if the user just says "it crashes on Android" or "doesn't work on phone" — this skill likely applies.
---

# React Native + Expo Expert

You are an expert in React Native and Expo for cross-platform mobile development. This skill helps you write code that works reliably across iOS, Android, and Web, avoid common pitfalls, and debug platform-specific issues.

## Core Principle: Platform Parity

Every feature must work on all three platforms. When writing any component or hook, think:
- Will this work in **Expo Go** (no custom native modules)?
- Does this use APIs available on **iOS**, **Android**, AND **Web**?
- Are there **platform-specific alternatives** needed?

Use `Platform.OS` checks when behavior must differ, and prefer cross-platform APIs over platform-specific ones.

## Expo Go Limitations

Expo Go is a pre-built runtime — it cannot load custom native modules. Code that requires native TurboModules will crash the app entirely.

**What works in Expo Go:**
- All Expo SDK packages (`expo-av`, `expo-camera`, `expo-location`, etc.)
- Standard React Native `Animated` API
- `react-native-safe-area-context`
- `socket.io-client`
- Pure JS libraries

**What CRASHES in Expo Go:**
- `react-native-reanimated` (requires TurboModule `installTurboModule`)
- Custom native modules (anything requiring `npx expo prebuild`)
- Direct Java/Kotlin or Swift/ObjC bridging

**Consequence:** If reanimated is imported ANYWHERE in the dependency chain, the entire app crashes on load. Use standard `Animated` API or check that reanimated is only used in development builds.

For detailed patterns, read `references/platform-patterns.md`.

## Critical Android Issues

### SVG Rendering Crash
`react-native-svg` on Android with Expo Go can cause: `java.lang.String cannot be cast to java.lang.Boolean`. This happens when SVG components pass string props where Android expects boolean.

**Workaround:** Use emoji text or PNG icons instead of SVG icons in components that render early (TabBar, navigation). SVG icons on individual screens may work after the app mounts.

### Shadow Styles
Android does not support `shadow*` style props (`shadowColor`, `shadowOffset`, etc.). These are iOS-only. Android uses `elevation` for shadows.

```typescript
import { Platform } from "react-native";

function makeShadow(color: string, opacity: number, radius: number, elevation: number) {
  if (Platform.OS === "android") {
    return { elevation };
  }
  return { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: opacity, shadowRadius: radius, elevation };
}
```

### Permissions
When `requestPermissionsAsync()` returns `{ granted: false, canAskAgain: false }`, the user selected "Don't Ask Again." You cannot show the permission dialog again — open device settings instead:

```typescript
import { Linking } from "react-native";
if (!granted && !canAskAgain) {
  Linking.openSettings();
}
```

## Critical iOS Issues

### Audio Recording Config
Use proper Expo AV enum values, NOT string literals:

```typescript
// WRONG — crashes on iOS
{ outputFormat: "linearPCM" as any }

// CORRECT
import { Audio } from "expo-av";
{ outputFormat: Audio.IOSOutputFormat.LINEARPCM }
```

### Safe Area
Always use `react-native-safe-area-context` for safe area insets, not `SafeAreaView` from React Native (deprecated):

```typescript
import { useSafeAreaInsets } from "react-native-safe-area-context";
const insets = useSafeAreaInsets();
```

## Web Platform Differences

### Audio
`expo-av` Recording on web produces **webm/opus** format, NOT PCM/WAV. If your backend expects PCM:
- Use the Web Audio API (`AudioContext` + `ScriptProcessorNode`) to capture raw PCM
- Send 16-bit PCM at 16kHz mono — the standard format for speech APIs

See `references/web-audio.md` for the Web Audio capture implementation.

### Text-to-Speech
Browser `SpeechSynthesis` API works on web. For native, use `expo-speech`:

```typescript
if (Platform.OS === "web" && window.speechSynthesis) {
  window.speechSynthesis.cancel(); // Stop previous
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  window.speechSynthesis.speak(utterance);
} else {
  // Use expo-speech for native
}
```

### Animations
Standard RN `Animated` API works everywhere. `react-native-reanimated` does NOT work in Expo Go (see above). Prefer `Animated` unless using a development build.

## State Management Patterns

### useReducer over useState
When a component has multiple related state values that update together, use `useReducer` to batch updates and prevent multiple re-renders:

```typescript
type Action =
  | { type: "ADD"; item: Item }
  | { type: "UPSERT"; item: Item }  // Update existing or insert new
  | { type: "CLEAR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "UPSERT": {
      const idx = state.items.findIndex(i => i.id === action.item.id);
      if (idx >= 0) {
        const updated = [...state.items];
        updated[idx] = action.item;
        return { ...state, items: updated };
      }
      return { ...state, items: [...state.items, action.item] };
    }
  }
}
```

### Ref Guards for Async Closures
React state in `setInterval` or `setTimeout` callbacks captures stale values. Use refs for guards:

```typescript
const isProcessingRef = useRef(false);

const handler = useCallback(async () => {
  if (isProcessingRef.current) return; // Ref, not state
  isProcessingRef.current = true;
  try { /* ... */ }
  finally { isProcessingRef.current = false; }
}, []);
```

## FlatList Performance

Always set optimization props on FlatList:

```typescript
<FlatList
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={7}
  removeClippedSubviews={Platform.OS !== "web"}
/>
```

## AppState Handling

Stop expensive operations (recording, streaming, timers) when app goes to background:

```typescript
useEffect(() => {
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "background") stopExpensiveOperation();
  });
  return () => sub.remove();
}, []);
```

## Memory Leak Prevention

### Intervals
Always clear intervals in cleanup, including error paths:

```typescript
try {
  intervalRef.current = setInterval(fn, 1000);
  await riskyOperation();
} catch (e) {
  if (intervalRef.current) clearInterval(intervalRef.current);
  throw e;
}
```

### Audio/Media
Close `AudioContext` on web, call `stopAndUnloadAsync()` on native recordings, and set callbacks to `null` on cleanup.

### Socket.io Listeners
Remove listeners with `sock.off()` after use. When using delayed cleanup, guard with session IDs to prevent stale callbacks from interfering with new sessions.

## Error Boundaries

Wrap the root layout with an ErrorBoundary — a single hook error can crash the entire app with a white screen:

```typescript
// components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) return <ErrorFallback />;
    return this.props.children;
  }
}

// app/_layout.tsx
<ErrorBoundary>
  <Stack>...</Stack>
</ErrorBoundary>
```

## Debugging Checklist

When something doesn't work on a specific platform:

1. **Red screen on Android?** → Check for react-native-svg, react-native-reanimated, or shadow style issues
2. **Crashes on iOS?** → Check audio config enums, permission handling, safe area
3. **Blank screen?** → Check ErrorBoundary, check expo-router default exports, check for import crashes
4. **Works on web but not native?** → Check for Web API usage (`window`, `navigator`, `AudioContext`, `SpeechSynthesis`)
5. **Works on native but not web?** → Check for native module imports, `expo-av` web limitations
6. **Socket not connecting on phone?** → `localhost` doesn't work on physical devices — use your machine's LAN IP
7. **Port in use?** → `npx kill-port 3001` or use PowerShell to kill the process
