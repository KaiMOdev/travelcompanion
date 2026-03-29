# VoxLingo Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all 4 VoxLingo screens with a Bold & Modern dark theme (Electric Blue palette), Lucide icons, Space Grotesk display font, and polished animations.

**Architecture:** Create a centralized theme module (`voxlingo/theme/`), install new dependencies (lucide-react-native, react-native-reanimated, @expo-google-fonts/space-grotesk), then update each screen and component individually. No changes to services, hooks, or backend — this is purely visual.

**Tech Stack:** React Native (Expo), TypeScript, react-native-reanimated, lucide-react-native, @expo-google-fonts/space-grotesk

**Design Spec:** `docs/superpowers/specs/2026-03-29-voxlingo-visual-redesign-design.md`

---

## File Structure

```
voxlingo/
├── theme/
│   ├── colors.ts              # NEW: Color token constants
│   ├── typography.ts          # NEW: Font family, size, weight presets
│   ├── spacing.ts             # NEW: Spacing scale + border radii + shadows
│   └── index.ts               # NEW: Re-exports all theme tokens
├── components/
│   ├── AudioWaveform.tsx       # REWRITE: 12-bar gradient waveform with reanimated
│   ├── TranslationBubble.tsx   # REWRITE: Gradient bubbles, timestamps, replay hint
│   ├── LanguagePicker.tsx      # REWRITE: Dark bottom sheet with search
│   ├── SubtitleOverlay.tsx     # REWRITE: Gradient avatars, speaker colors
│   ├── TabBar.tsx              # NEW: Custom tab bar with gradient active pill
│   ├── ErrorBanner.tsx         # NEW: Dismissible error banner
│   └── SkeletonCard.tsx        # NEW: Shimmer loading placeholder
├── app/
│   ├── _layout.tsx             # MODIFY: Load Space Grotesk font, dark status bar
│   ├── (tabs)/
│   │   ├── _layout.tsx         # REWRITE: Wire custom TabBar, Lucide icons
│   │   ├── index.tsx           # REWRITE: Chat-first layout, dark theme
│   │   ├── camera.tsx          # REWRITE: Corner guides, frosted overlays
│   │   └── meeting.tsx         # REWRITE: Gradient avatars, live badge, summary
│   └── settings.tsx            # REWRITE: Dark cards, gradient avatar, mode badges
```

---

### Task 1: Install Dependencies

**Files:**
- Modify: `voxlingo/package.json`

- [ ] **Step 1: Install new packages**

```bash
cd voxlingo && npx expo install react-native-reanimated lucide-react-native react-native-svg @expo-google-fonts/space-grotesk expo-font
```

Note: `react-native-svg` is required by `lucide-react-native`. `expo-font` may already be installed transitively — the command will handle duplicates.

- [ ] **Step 2: Add reanimated babel plugin**

In `voxlingo/babel.config.js`, add the reanimated plugin. The file should look like:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

The reanimated plugin **must** be last in the plugins array.

- [ ] **Step 3: Verify installation**

```bash
cd voxlingo && npx tsc --noEmit
```

Expected: No errors related to new packages (existing errors may remain).

- [ ] **Step 4: Commit**

```bash
cd voxlingo && git add package.json package-lock.json babel.config.js && git commit -m "chore: install lucide-react-native, react-native-reanimated, space-grotesk font"
```

---

### Task 2: Create Theme Module

**Files:**
- Create: `voxlingo/theme/colors.ts`
- Create: `voxlingo/theme/typography.ts`
- Create: `voxlingo/theme/spacing.ts`
- Create: `voxlingo/theme/index.ts`

- [ ] **Step 1: Create colors.ts**

```typescript
// voxlingo/theme/colors.ts

export const colors = {
  // Backgrounds
  bgPrimary: "#0f172a",
  bgSurface: "#1e293b",
  bgElevated: "#334155",
  bgOverlay: "rgba(15, 23, 42, 0.85)",

  // Accent
  accentBlue: "#3b82f6",
  accentCyan: "#06b6d4",
  accentLight: "#22d3ee",

  // Semantic
  error: "#ef4444",
  success: "#10b981",
  warning: "#f59e0b",

  // Text
  textPrimary: "#f8fafc",
  textSecondary: "#cbd5e1",
  textMuted: "#64748b",
  textSubtle: "#94a3b8",
  textDim: "#475569",

  // Error text variants
  errorLight: "#fca5a5",
  errorAction: "#f87171",

  // Specific
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
} as const;

// Speaker colors for meeting mode (gradient start values)
export const speakerColors = [
  { start: "#3b82f6", end: "#2563eb" },   // blue
  { start: "#8b5cf6", end: "#7c3aed" },   // violet
  { start: "#10b981", end: "#059669" },   // emerald
  { start: "#f59e0b", end: "#d97706" },   // amber
  { start: "#f43f5e", end: "#e11d48" },   // rose
  { start: "#14b8a6", end: "#0d9488" },   // teal
] as const;
```

- [ ] **Step 2: Create typography.ts**

```typescript
// voxlingo/theme/typography.ts
import { Platform } from "react-native";

export const fontFamily = {
  display: "SpaceGrotesk_700Bold",
  displayMedium: "SpaceGrotesk_600SemiBold",
  system: Platform.select({ ios: "System", android: "Roboto", default: "System" }),
} as const;

export const fontSize = {
  display: 28,
  heading: 20,
  subheading: 16,
  body: 15,
  translation: 17,
  caption: 12,
  label: 10,
} as const;

export const fontWeight = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const letterSpacing = {
  label: 1.5,
  display: -0.5,
};
```

- [ ] **Step 3: Create spacing.ts**

```typescript
// voxlingo/theme/spacing.ts

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const shadows = {
  glowSm: {
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  glowMd: {
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6,
  },
  glowLg: {
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  glowError: {
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6,
  },
  glowSuccess: {
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;
```

- [ ] **Step 4: Create index.ts**

```typescript
// voxlingo/theme/index.ts
export { colors, speakerColors } from "./colors";
export { fontFamily, fontSize, fontWeight, letterSpacing } from "./typography";
export { spacing, borderRadius, shadows } from "./spacing";
```

- [ ] **Step 5: Verify typecheck**

```bash
cd voxlingo && npx tsc --noEmit
```

Expected: No new errors from theme module.

- [ ] **Step 6: Commit**

```bash
git add voxlingo/theme/ && git commit -m "feat: add design system theme module (colors, typography, spacing)"
```

---

### Task 3: Root Layout — Font Loading + Dark Status Bar

**Files:**
- Modify: `voxlingo/app/_layout.tsx`

- [ ] **Step 1: Rewrite _layout.tsx with font loading**

```typescript
// voxlingo/app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import {
  useFonts,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { colors } from "../theme";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.accentBlue} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.bgPrimary },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            title: "Settings",
            headerTitleStyle: { color: colors.textPrimary },
          }}
        />
      </Stack>
    </>
  );
}
```

- [ ] **Step 2: Verify app still loads**

```bash
cd voxlingo && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add voxlingo/app/_layout.tsx && git commit -m "feat: load Space Grotesk font, apply dark theme to root layout"
```

---

### Task 4: Custom Tab Bar Component

**Files:**
- Create: `voxlingo/components/TabBar.tsx`
- Modify: `voxlingo/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create TabBar.tsx**

```typescript
// voxlingo/components/TabBar.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Mic, Camera, Users } from "lucide-react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, spacing, borderRadius } from "../theme";

const TAB_ICONS = {
  index: Mic,
  camera: Camera,
  meeting: Users,
} as const;

const TAB_LABELS = {
  index: "Travel",
  camera: "Camera",
  meeting: "Meeting",
} as const;

export function TabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const routeName = route.name as keyof typeof TAB_ICONS;
        const Icon = TAB_ICONS[routeName];
        const label = TAB_LABELS[routeName];

        if (!Icon || !label) return null;

        const handlePress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tab}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
              <Icon
                size={20}
                color={isFocused ? colors.white : colors.textDim}
                strokeWidth={2}
              />
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.bgSurface,
    paddingBottom: 24,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  iconWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  iconWrapActive: {
    backgroundColor: colors.accentBlue,
  },
  label: {
    fontSize: 10,
    color: colors.textDim,
    fontWeight: "400",
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
```

- [ ] **Step 2: Rewrite tabs _layout.tsx**

```typescript
// voxlingo/app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { TabBar } from "../../components/TabBar";
import { colors } from "../../theme";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bgPrimary },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="camera" />
      <Tabs.Screen name="meeting" />
    </Tabs>
  );
}
```

- [ ] **Step 3: Verify typecheck**

```bash
cd voxlingo && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add voxlingo/components/TabBar.tsx voxlingo/app/\(tabs\)/_layout.tsx && git commit -m "feat: custom dark tab bar with gradient active pill and Lucide icons"
```

---

### Task 5: ErrorBanner + SkeletonCard Components

**Files:**
- Create: `voxlingo/components/ErrorBanner.tsx`
- Create: `voxlingo/components/SkeletonCard.tsx`

- [ ] **Step 1: Create ErrorBanner.tsx**

```typescript
// voxlingo/components/ErrorBanner.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { XCircle, RefreshCw } from "lucide-react-native";
import { colors, spacing, borderRadius } from "../theme";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onDismiss || onRetry}
      activeOpacity={0.8}
    >
      <View style={styles.iconCircle}>
        <XCircle size={14} color={colors.error} strokeWidth={2} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.message}>{message}</Text>
        {onRetry && <Text style={styles.action}>Tap to retry</Text>}
      </View>
      {onRetry && (
        <RefreshCw size={14} color={colors.error} strokeWidth={2} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    gap: spacing.md,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  message: {
    color: colors.errorLight,
    fontSize: 13,
    fontWeight: "500",
  },
  action: {
    color: colors.errorAction,
    fontSize: 11,
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Create SkeletonCard.tsx**

```typescript
// voxlingo/components/SkeletonCard.tsx
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { colors, spacing, borderRadius } from "../theme";

export function SkeletonCard() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + shimmer.value * 0.3,
  }));

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.lineWide, animatedStyle]} />
      <Animated.View style={[styles.lineNarrow, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.bgElevated,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  lineWide: {
    height: 12,
    width: "60%",
    backgroundColor: colors.bgElevated,
    borderRadius: spacing.xs,
  },
  lineNarrow: {
    height: 10,
    width: "45%",
    backgroundColor: colors.bgElevated,
    borderRadius: spacing.xs,
  },
});
```

- [ ] **Step 3: Verify typecheck**

```bash
cd voxlingo && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add voxlingo/components/ErrorBanner.tsx voxlingo/components/SkeletonCard.tsx && git commit -m "feat: add ErrorBanner and SkeletonCard shared components"
```

---

### Task 6: Redesign AudioWaveform Component

**Files:**
- Modify: `voxlingo/components/AudioWaveform.tsx`

- [ ] **Step 1: Rewrite AudioWaveform.tsx**

```typescript
// voxlingo/components/AudioWaveform.tsx
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { colors, spacing } from "../theme";

interface AudioWaveformProps {
  isActive: boolean;
}

const BAR_COUNT = 12;

function WaveBar({ index, isActive }: { index: number; isActive: boolean }) {
  const scale = useSharedValue(0.3);

  useEffect(() => {
    if (isActive) {
      const minHeight = 0.2 + Math.random() * 0.2;
      const maxHeight = 0.5 + Math.random() * 0.5;
      const duration = 200 + Math.random() * 300;

      scale.value = withRepeat(
        withDelay(
          index * 50,
          withSequence(
            withTiming(maxHeight, { duration, easing: Easing.out(Easing.ease) }),
            withTiming(minHeight, { duration, easing: Easing.in(Easing.ease) }),
          ),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withTiming(0.3, { duration: 200 });
    }
  }, [isActive, index, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  const isEven = index % 2 === 0;

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: isActive ? (isEven ? colors.accentBlue : colors.accentCyan) : colors.bgElevated },
        animatedStyle,
      ]}
    />
  );
}

export function AudioWaveform({ isActive }: AudioWaveformProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <WaveBar key={i} index={i} isActive={isActive} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 80,
    gap: spacing.xs,
  },
  bar: {
    width: 4,
    height: 80,
    borderRadius: 2,
  },
});
```

- [ ] **Step 2: Verify typecheck**

```bash
cd voxlingo && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add voxlingo/components/AudioWaveform.tsx && git commit -m "feat: redesign AudioWaveform with 12 gradient bars and reanimated spring physics"
```

---

### Task 7: Redesign TranslationBubble Component

**Files:**
- Modify: `voxlingo/components/TranslationBubble.tsx`

- [ ] **Step 1: Rewrite TranslationBubble.tsx**

```typescript
// voxlingo/components/TranslationBubble.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Volume2 } from "lucide-react-native";
import { colors, spacing, borderRadius } from "../theme";

interface TranslationBubbleProps {
  text: string;
  isSource: boolean;
  timestamp?: string;
  onReplay?: () => void;
}

export function TranslationBubble({
  text,
  isSource,
  timestamp,
  onReplay,
}: TranslationBubbleProps) {
  return (
    <View style={[styles.wrapper, isSource ? styles.wrapperSource : styles.wrapperTarget]}>
      <View style={[styles.bubble, isSource ? styles.source : styles.target]}>
        <Text style={[styles.text, isSource ? styles.sourceText : styles.targetText]}>
          {text}
        </Text>
      </View>
      <View style={styles.meta}>
        {timestamp && (
          <Text style={styles.timestamp}>{timestamp}</Text>
        )}
        {!isSource && onReplay && (
          <TouchableOpacity style={styles.replayHint} onPress={onReplay}>
            <Volume2 size={10} color={colors.accentCyan} strokeWidth={2} />
            <Text style={styles.replayText}>Tap to replay</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing.xs,
  },
  wrapperSource: {
    alignItems: "flex-start",
  },
  wrapperTarget: {
    alignItems: "flex-end",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  source: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.bgElevated,
  },
  target: {
    backgroundColor: colors.accentBlue,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  text: {
    lineHeight: 20,
  },
  sourceText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  targetText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.white,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 3,
    paddingHorizontal: spacing.xs,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textDim,
  },
  replayHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  replayText: {
    fontSize: 10,
    color: colors.textDim,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add voxlingo/components/TranslationBubble.tsx && git commit -m "feat: redesign TranslationBubble with gradient target, timestamps, replay hint"
```

---

### Task 8: Redesign LanguagePicker Component

**Files:**
- Modify: `voxlingo/components/LanguagePicker.tsx`

- [ ] **Step 1: Rewrite LanguagePicker.tsx**

```typescript
// voxlingo/components/LanguagePicker.tsx
import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
} from "react-native";
import { ChevronDown, X, Search, Check } from "lucide-react-native";
import { LanguageCode } from "../types";
import { SUPPORTED_LANGUAGES, Language } from "../constants/languages";
import { colors, spacing, borderRadius, fontSize } from "../theme";

interface LanguagePickerProps {
  selectedLang: LanguageCode;
  onSelect: (lang: LanguageCode) => void;
  label?: string;
}

export function LanguagePicker({
  selectedLang,
  onSelect,
  label,
}: LanguagePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLanguage = SUPPORTED_LANGUAGES.find(
    (l) => l.code === selectedLang,
  );

  const filtered = useMemo(() => {
    if (!search) return SUPPORTED_LANGUAGES;
    const q = search.toLowerCase();
    return SUPPORTED_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q),
    );
  }, [search]);

  const handleSelect = (lang: Language) => {
    onSelect(lang.code);
    setModalVisible(false);
    setSearch("");
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>
          {selectedLanguage?.name || selectedLang}
        </Text>
        <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setModalVisible(false); setSearch(""); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setModalVisible(false); setSearch(""); }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => { setModalVisible(false); setSearch(""); }}
              >
                <X size={14} color={colors.textSubtle} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search size={14} color={colors.textDim} strokeWidth={2} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search languages..."
                  placeholderTextColor={colors.textDim}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Language List */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = item.code === selectedLang;
                return (
                  <TouchableOpacity
                    style={[styles.langItem, isSelected && styles.langItemSelected]}
                    onPress={() => handleSelect(item)}
                  >
                    <View>
                      <Text style={styles.langName}>{item.name}</Text>
                      <Text style={styles.langNative}>{item.nativeName}</Text>
                    </View>
                    {isSelected && (
                      <Check size={16} color={colors.accentBlue} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.bgElevated,
    minWidth: 130,
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.bgOverlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: "70%",
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgPrimary,
  },
  modalTitle: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    padding: spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgPrimary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.bgElevated,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },
  langItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  langItemSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  langName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  langNative: {
    fontSize: fontSize.caption,
    color: colors.textDim,
    marginTop: 1,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add voxlingo/components/LanguagePicker.tsx && git commit -m "feat: redesign LanguagePicker as dark bottom sheet with search"
```

---

### Task 9: Redesign SubtitleOverlay Component

**Files:**
- Modify: `voxlingo/components/SubtitleOverlay.tsx`

- [ ] **Step 1: Rewrite SubtitleOverlay.tsx**

```typescript
// voxlingo/components/SubtitleOverlay.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, fontSize } from "../theme";

interface SubtitleOverlayProps {
  speaker: string;
  originalText: string;
  translatedText: string;
  speakerColor: string;
  timestamp?: string;
  isActive?: boolean;
}

export function SubtitleOverlay({
  speaker,
  originalText,
  translatedText,
  speakerColor,
  timestamp,
  isActive,
}: SubtitleOverlayProps) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: speakerColor },
          isActive && { ...styles.activeGlow, shadowColor: speakerColor },
        ]}
      >
        <Text style={styles.avatarText}>
          {speaker.substring(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={styles.textContainer}>
        <View style={styles.speakerRow}>
          <Text style={[styles.speakerName, { color: speakerColor }]}>
            {speaker}
          </Text>
          {timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
        </View>
        <Text style={styles.original}>{originalText}</Text>
        <Text style={styles.translated}>{translatedText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSurface,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  activeGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  textContainer: {
    flex: 1,
  },
  speakerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 3,
  },
  speakerName: {
    fontSize: 11,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 10,
    color: colors.textDim,
  },
  original: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  translated: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
});
```

Note: The `color` prop is renamed to `speakerColor` to be more explicit. Callers (meeting.tsx) will need to pass `speakerColor` instead of `color`.

- [ ] **Step 2: Commit**

```bash
git add voxlingo/components/SubtitleOverlay.tsx && git commit -m "feat: redesign SubtitleOverlay with dark theme, gradient avatars, speaker colors"
```

---

### Task 10: Redesign Travel Screen

**Files:**
- Modify: `voxlingo/app/(tabs)/index.tsx`

- [ ] **Step 1: Rewrite index.tsx (Travel Screen)**

```typescript
// voxlingo/app/(tabs)/index.tsx
import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Audio } from "expo-av";
import { ArrowLeftRight, Settings, List } from "lucide-react-native";
import { LanguageCode, Translation } from "../../types";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
  getLanguageName,
} from "../../constants/languages";
import { LanguagePicker } from "../../components/LanguagePicker";
import { TranslationBubble } from "../../components/TranslationBubble";
import { AudioWaveform } from "../../components/AudioWaveform";
import { ErrorBanner } from "../../components/ErrorBanner";
import { useAudioStream } from "../../hooks/useAudioStream";
import { useTranslation } from "../../hooks/useTranslation";
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  fontFamily,
  fontSize,
  letterSpacing,
} from "../../theme";

export default function TravelScreen() {
  const [sourceLang, setSourceLang] = useState<LanguageCode>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const flatListRef = useRef<FlatList>(null);

  const {
    translations,
    isTranslating,
    addTranslation,
    clearTranslations,
    setTranslating,
  } = useTranslation(sourceLang, targetLang);

  const { isRecording, error, startRecording, stopRecording } = useAudioStream({
    onTranslatedAudio: async (audioBase64: string) => {
      try {
        const { sound } = await Audio.Sound.createAsync({
          uri: `data:audio/pcm;base64,${audioBase64}`,
        });
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if ("didJustFinish" in status && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } catch (e) {
        console.warn("Audio playback error:", e);
      }
    },
    onTranslatedText: (text: string) => {
      const translation: Translation = {
        id: Date.now().toString(),
        sourceLang,
        targetLang,
        originalText: "",
        translatedText: text,
        mode: "travel",
        timestamp: Date.now(),
        cached: false,
      };
      addTranslation(translation);
      setTranslating(false);
    },
    onInputText: (text: string) => {
      const translation: Translation = {
        id: `input-${Date.now()}`,
        sourceLang,
        targetLang,
        originalText: text,
        translatedText: "",
        mode: "travel",
        timestamp: Date.now(),
        cached: false,
      };
      addTranslation(translation);
    },
    onError: (err: Error) => {
      console.error("Translation error:", err);
      setTranslating(false);
    },
  });

  const handleSwapLanguages = useCallback(() => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  }, [sourceLang, targetLang]);

  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
      setTranslating(false);
    } else {
      setTranslating(true);
      await startRecording(sourceLang, targetLang);
    }
  }, [isRecording, sourceLang, targetLang, startRecording, stopRecording, setTranslating]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const hasConversation = translations.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>VoxLingo</Text>
        <View style={styles.headerActions}>
          {hasConversation && (
            <TouchableOpacity style={styles.headerButton} onPress={clearTranslations}>
              <List size={16} color={colors.textSubtle} strokeWidth={2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerButton}>
            <Settings size={16} color={colors.textSubtle} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Bar */}
      {!isRecording && (
        <View style={styles.languageBar}>
          {hasConversation ? (
            <View style={styles.compactLangChip}>
              <Text style={styles.compactLangFrom}>
                {getLanguageName(sourceLang).substring(0, 2).toUpperCase()}
              </Text>
              <Text style={styles.compactLangArrow}>→</Text>
              <Text style={styles.compactLangTo}>
                {getLanguageName(targetLang).substring(0, 2).toUpperCase()}
              </Text>
            </View>
          ) : (
            <>
              <LanguagePicker selectedLang={sourceLang} onSelect={setSourceLang} label="From" />
              <TouchableOpacity style={styles.swapButton} onPress={handleSwapLanguages}>
                <ArrowLeftRight size={16} color={colors.white} strokeWidth={2.5} />
              </TouchableOpacity>
              <LanguagePicker selectedLang={targetLang} onSelect={setTargetLang} label="To" />
            </>
          )}
        </View>
      )}

      {/* Chat / Waveform Area */}
      {isRecording ? (
        <View style={styles.recordingArea}>
          <AudioWaveform isActive={true} />
          <Text style={styles.listeningLabel}>Listening...</Text>
          <Text style={styles.releaseHint}>Release to translate</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          style={styles.chatContainer}
          contentContainerStyle={translations.length === 0 ? styles.chatEmpty : undefined}
          data={translations}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          renderItem={({ item }) => (
            <View>
              {item.originalText !== "" && (
                <TranslationBubble
                  text={item.originalText}
                  isSource={true}
                  timestamp={formatTime(item.timestamp)}
                />
              )}
              {item.translatedText !== "" && (
                <TranslationBubble
                  text={item.translatedText}
                  isSource={false}
                  timestamp={formatTime(item.timestamp)}
                />
              )}
            </View>
          )}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>💬</Text>
              </View>
              <Text style={styles.emptyTitle}>Start a conversation</Text>
              <Text style={styles.emptySubtitle}>Tap the mic or type a phrase</Text>
            </View>
          }
        />
      )}

      {/* Error */}
      {error && <ErrorBanner message={error} />}

      {/* Bottom Input Bar */}
      <View style={styles.bottomBar}>
        {isRecording ? (
          <View style={styles.recordingControls}>
            <TouchableOpacity onPress={() => { stopRecording(); setTranslating(false); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.micButton, styles.micButtonStop]}
              onPress={handleMicPress}
            >
              <View style={styles.stopSquare} />
            </TouchableOpacity>
            <View style={{ width: 48 }} />
          </View>
        ) : (
          <View style={styles.inputRow}>
            <View style={styles.textInputWrap}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a phrase..."
                placeholderTextColor={colors.textDim}
              />
            </View>
            <TouchableOpacity
              style={[styles.micButton, styles.micButtonIdle]}
              onPress={handleMicPress}
              activeOpacity={0.7}
            >
              <Text style={styles.micEmoji}>🎤</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  logo: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.heading,
    color: colors.accentBlue,
    letterSpacing: letterSpacing.display,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.bgElevated,
  },
  languageBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accentBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    ...shadows.glowSm,
  },
  compactLangChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.bgElevated,
    gap: spacing.sm,
  },
  compactLangFrom: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  compactLangArrow: {
    fontSize: 10,
    color: colors.accentBlue,
  },
  compactLangTo: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentCyan,
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  chatEmpty: {
    flex: 1,
  },
  recordingArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },
  listeningLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accentBlue,
    marginTop: spacing.lg,
  },
  releaseHint: {
    fontSize: fontSize.caption,
    color: colors.textDim,
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.bgElevated,
    marginBottom: spacing.lg,
  },
  emptyIconText: {
    fontSize: 28,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textDim,
  },
  emptySubtitle: {
    fontSize: fontSize.caption,
    color: colors.bgElevated,
    marginTop: spacing.xs,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.bgSurface,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  textInputWrap: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.bgElevated,
  },
  textInput: {
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonIdle: {
    backgroundColor: colors.accentBlue,
    ...shadows.glowMd,
  },
  micButtonStop: {
    backgroundColor: colors.error,
    width: 60,
    height: 60,
    ...shadows.glowError,
  },
  micEmoji: {
    fontSize: 22,
  },
  stopSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  recordingControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  cancelText: {
    fontSize: 13,
    color: colors.textMuted,
    padding: spacing.sm,
  },
});
```

- [ ] **Step 2: Verify typecheck**

```bash
cd voxlingo && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add voxlingo/app/\(tabs\)/index.tsx && git commit -m "feat: redesign Travel screen with chat-first dark layout, gradient mic, text input"
```

---

### Task 11: Redesign Camera Screen

**Files:**
- Modify: `voxlingo/app/(tabs)/camera.tsx`

- [ ] **Step 1: Rewrite camera.tsx**

```typescript
// voxlingo/app/(tabs)/camera.tsx
import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera as CameraIcon, ArrowLeft, Upload, Save } from "lucide-react-native";
import { LanguageCode, VisionTranslationResult } from "../../types";
import { DEFAULT_TARGET_LANG } from "../../constants/languages";
import { LanguagePicker } from "../../components/LanguagePicker";
import { ErrorBanner } from "../../components/ErrorBanner";
import { translateImage } from "../../services/vision";
import { colors, spacing, borderRadius, fontSize } from "../../theme";

type ScanMode = "photo" | "livescan";

interface ScanResult {
  id: string;
  imageUri: string | null;
  result: VisionTranslationResult;
  timestamp: number;
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [targetLang, setTargetLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const [scanMode, setScanMode] = useState<ScanMode>("photo");
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const liveScanInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (liveScanInterval.current) {
        clearInterval(liveScanInterval.current);
        liveScanInterval.current = null;
      }
    };
  }, []);

  const captureAndTranslate = useCallback(async () => {
    if (!cameraRef.current || isProcessingRef.current) return;
    try {
      isProcessingRef.current = true;
      setIsProcessing(true);
      setError(null);
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      if (!photo?.base64) {
        setError("Failed to capture photo");
        setIsProcessing(false);
        return;
      }
      const result = await translateImage(photo.base64, targetLang);
      setScans((prev) => [{ id: Date.now().toString(), imageUri: photo.uri, result, timestamp: Date.now() }, ...prev]);
    } catch (err: any) {
      setError(err.message || "Translation failed");
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [targetLang]);

  const toggleLiveScan = useCallback(() => {
    if (liveScanInterval.current) {
      clearInterval(liveScanInterval.current);
      liveScanInterval.current = null;
      setScanMode("photo");
    } else {
      setScanMode("livescan");
      liveScanInterval.current = setInterval(() => { captureAndTranslate(); }, 2000);
    }
  }, [captureAndTranslate]);

  // Permission: loading
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.accentBlue} />
      </SafeAreaView>
    );
  }

  // Permission: not granted
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <CameraIcon size={24} color={colors.accentBlue} strokeWidth={2} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionSubtext}>
            VoxLingo needs camera access to translate text from photos
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Camera Viewfinder */}
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {/* Top overlay */}
          <View style={styles.cameraTopBar}>
            <Text style={styles.logo}>VoxLingo</Text>
            {scanMode === "livescan" && liveScanInterval.current && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>

          {/* Scan frame guides */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          {/* Live translation overlay */}
          {scans.length > 0 && scanMode === "livescan" && (
            <View style={styles.translationOverlay}>
              <View style={styles.overlayLangRow}>
                <View style={styles.overlayDot} />
                <Text style={styles.overlayLang}>
                  Detected — {scans[0].result.detectedLanguage}
                </Text>
              </View>
              <Text style={styles.overlayOriginal}>{scans[0].result.originalText}</Text>
              <View style={styles.overlayDivider} />
              <Text style={styles.overlayTranslated}>{scans[0].result.translatedText}</Text>
            </View>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={styles.processingText}>Translating...</Text>
            </View>
          )}

          {/* Hint */}
          {!isProcessing && scans.length === 0 && (
            <Text style={styles.hintText}>Point camera at text to translate</Text>
          )}
        </CameraView>
      </View>

      {/* Error */}
      {error && <ErrorBanner message={error} onRetry={captureAndTranslate} onDismiss={() => setError(null)} />}

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {/* Mode toggle */}
        <View style={styles.modeToggleWrap}>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, scanMode === "photo" && styles.modeBtnActive]}
              onPress={() => {
                if (liveScanInterval.current) { clearInterval(liveScanInterval.current); liveScanInterval.current = null; }
                setScanMode("photo");
              }}
            >
              <Text style={[styles.modeBtnText, scanMode === "photo" && styles.modeBtnTextActive]}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, scanMode === "livescan" && styles.modeBtnActive]}
              onPress={toggleLiveScan}
            >
              <Text style={[styles.modeBtnText, scanMode === "livescan" && styles.modeBtnTextActive]}>Live Scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shutter row */}
        <View style={styles.shutterRow}>
          <View style={styles.langChip}>
            <Text style={styles.langChipFrom}>JA</Text>
            <Text style={styles.langChipArrow}> → </Text>
            <Text style={styles.langChipTo}>EN</Text>
          </View>
          {scanMode === "photo" ? (
            <TouchableOpacity
              style={styles.shutterButton}
              onPress={captureAndTranslate}
              disabled={isProcessing}
            >
              <View style={[styles.shutterInner, isProcessing && styles.shutterDisabled]} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={toggleLiveScan}>
              <View style={styles.stopSquare} />
            </TouchableOpacity>
          )}
          <View style={{ width: 64 }} />
        </View>
      </View>

      {/* Recent scans */}
      {scans.length > 0 && scanMode === "photo" && (
        <View style={styles.scansContainer}>
          <View style={styles.scansHeader}>
            <Text style={styles.scansTitle}>Recent Scans</Text>
            <TouchableOpacity onPress={() => setScans([])}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={scans}
            keyExtractor={(item) => item.id}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            renderItem={({ item }) => (
              <View style={styles.scanItem}>
                {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.scanThumb} />}
                <View style={styles.scanTextWrap}>
                  <Text style={styles.scanOriginal} numberOfLines={1}>{item.result.originalText}</Text>
                  <Text style={styles.scanTranslated} numberOfLines={1}>{item.result.translatedText}</Text>
                </View>
              </View>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  cameraContainer: { flex: 1, position: "relative" },
  camera: { flex: 1 },
  cameraTopBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: spacing.lg, paddingTop: spacing.xl,
    background: "transparent",
  },
  logo: { fontSize: 18, fontWeight: "700", color: colors.accentBlue },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: "rgba(16, 185, 129, 0.2)", paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  liveText: { color: colors.success, fontSize: 11, fontWeight: "600" },
  scanFrame: {
    position: "absolute", top: "30%", left: "10%", right: "10%", height: 160,
  },
  corner: { position: "absolute", width: 24, height: 24 },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderColor: colors.accentBlue, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderColor: colors.accentBlue, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: colors.accentCyan, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderColor: colors.accentCyan, borderBottomRightRadius: 4 },
  translationOverlay: {
    position: "absolute", bottom: 80, left: spacing.lg, right: spacing.lg,
    backgroundColor: colors.bgOverlay, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: "rgba(59, 130, 246, 0.3)",
  },
  overlayLangRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  overlayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentCyan },
  overlayLang: { color: colors.accentCyan, fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  overlayOriginal: { color: colors.textSubtle, fontSize: 13, marginBottom: spacing.sm },
  overlayDivider: { height: 1, backgroundColor: colors.bgElevated, marginVertical: spacing.sm },
  overlayTranslated: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  processingText: { color: colors.white, fontSize: 16, marginTop: spacing.sm },
  hintText: { position: "absolute", bottom: 80, alignSelf: "center", color: "rgba(255,255,255,0.5)", fontSize: fontSize.caption },
  bottomControls: { backgroundColor: colors.bgPrimary, paddingVertical: spacing.lg, paddingBottom: spacing.xl },
  modeToggleWrap: { alignItems: "center", marginBottom: spacing.lg },
  modeToggle: {
    flexDirection: "row", backgroundColor: colors.bgSurface, borderRadius: borderRadius.md,
    padding: 3, borderWidth: 1, borderColor: colors.bgElevated,
  },
  modeBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  modeBtnActive: { backgroundColor: colors.accentBlue },
  modeBtnText: { color: colors.textMuted, fontSize: fontSize.caption, fontWeight: "500" },
  modeBtnTextActive: { color: colors.white, fontWeight: "600" },
  shutterRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing["2xl"] },
  langChip: {
    flexDirection: "row", backgroundColor: colors.bgSurface, borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.bgElevated,
  },
  langChipFrom: { color: colors.textPrimary, fontSize: 11, fontWeight: "600" },
  langChipArrow: { color: colors.accentBlue, fontSize: 10 },
  langChipTo: { color: colors.accentCyan, fontSize: 11, fontWeight: "600" },
  shutterButton: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: colors.white,
    alignItems: "center", justifyContent: "center",
  },
  shutterInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.white },
  shutterDisabled: { backgroundColor: colors.textSubtle },
  stopButton: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 3, borderColor: colors.error, alignItems: "center", justifyContent: "center",
  },
  stopSquare: { width: 20, height: 20, borderRadius: 4, backgroundColor: colors.error },
  scansContainer: { maxHeight: 180, backgroundColor: colors.bgPrimary, borderTopWidth: 1, borderTopColor: colors.bgSurface },
  scansHeader: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  scansTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  clearText: { color: colors.textMuted, fontSize: 14 },
  scanItem: { flexDirection: "row", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.bgSurface },
  scanThumb: { width: 48, height: 48, borderRadius: borderRadius.sm, marginRight: spacing.md },
  scanTextWrap: { flex: 1 },
  scanOriginal: { color: colors.textSubtle, fontSize: 12 },
  scanTranslated: { color: colors.textPrimary, fontSize: 14, fontWeight: "600", marginTop: 2 },
  permissionContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  permissionIcon: {
    width: 56, height: 56, borderRadius: borderRadius.full, backgroundColor: colors.bgSurface,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md, borderWidth: 1, borderColor: colors.bgElevated,
  },
  permissionTitle: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: "600", marginBottom: spacing.xs },
  permissionSubtext: { color: colors.textMuted, fontSize: 13, textAlign: "center", marginBottom: spacing.lg },
  permissionButton: { backgroundColor: colors.accentBlue, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  permissionButtonText: { color: colors.white, fontSize: 14, fontWeight: "600" },
});
```

- [ ] **Step 2: Commit**

```bash
git add voxlingo/app/\(tabs\)/camera.tsx && git commit -m "feat: redesign Camera screen with dark theme, corner guides, frosted overlays"
```

---

### Task 12: Redesign Meeting Screen

**Files:**
- Modify: `voxlingo/app/(tabs)/meeting.tsx`

- [ ] **Step 1: Rewrite meeting.tsx**

```typescript
// voxlingo/app/(tabs)/meeting.tsx
import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { Globe } from "lucide-react-native";
import { LanguageCode, TranscriptEntry } from "../../types";
import { DEFAULT_TARGET_LANG } from "../../constants/languages";
import { LanguagePicker } from "../../components/LanguagePicker";
import { SubtitleOverlay } from "../../components/SubtitleOverlay";
import { ErrorBanner } from "../../components/ErrorBanner";
import {
  useMeetingStream,
  MeetingUtteranceData,
} from "../../hooks/useMeetingStream";
import { exportAndShareTranscript } from "../../services/transcript";
import {
  colors,
  speakerColors,
  spacing,
  borderRadius,
  shadows,
  fontFamily,
  fontSize,
} from "../../theme";

function getSpeakerColor(speaker: string, speakerMap: Map<string, number>): string {
  if (!speakerMap.has(speaker)) {
    speakerMap.set(speaker, speakerMap.size);
  }
  const index = speakerMap.get(speaker)!;
  return speakerColors[index % speakerColors.length].start;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MeetingScreen() {
  const [userLang, setUserLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const [utterances, setUtterances] = useState<TranscriptEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const speakerMapRef = useRef(new Map<string, number>());

  const { isListening, error, duration, startListening, stopListening } =
    useMeetingStream({
      onUtterance: (data: MeetingUtteranceData) => {
        const entry: TranscriptEntry = {
          speaker: data.speaker,
          lang: data.lang as LanguageCode,
          original: data.original,
          translated: data.translated,
          timestamp: data.timestamp,
        };
        setUtterances((prev) => [...prev, entry]);
      },
      onError: (err: Error) => {
        console.error("Meeting error:", err);
      },
    });

  const handleToggleSession = useCallback(async () => {
    if (isListening) {
      await stopListening();
    } else {
      speakerMapRef.current.clear();
      await startListening(userLang);
    }
  }, [isListening, userLang, startListening, stopListening]);

  const handleExport = useCallback(async () => {
    if (utterances.length === 0) {
      Alert.alert("No transcript", "Start a meeting session first.");
      return;
    }
    try {
      setIsExporting(true);
      await exportAndShareTranscript(utterances, duration);
    } catch (err: any) {
      Alert.alert("Export failed", err.message);
    } finally {
      setIsExporting(false);
    }
  }, [utterances, duration]);

  const handleClear = useCallback(() => {
    setUtterances([]);
    speakerMapRef.current.clear();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Meeting</Text>
        {isListening && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.timerText}>{formatDuration(duration)}</Text>
          </View>
        )}
      </View>

      {/* Target language */}
      {!isListening ? (
        <View style={styles.langSection}>
          <Text style={styles.langLabel}>TRANSLATE TO</Text>
          <LanguagePicker selectedLang={userLang} onSelect={setUserLang} />
        </View>
      ) : (
        <View style={styles.langCompact}>
          <Globe size={12} color={colors.accentCyan} strokeWidth={2} />
          <Text style={styles.langCompactLabel}>Translating to</Text>
          <Text style={styles.langCompactValue}>
            {userLang.toUpperCase()}
          </Text>
        </View>
      )}

      {/* Subtitle list */}
      <FlatList
        ref={flatListRef}
        style={styles.subtitleList}
        contentContainerStyle={utterances.length === 0 ? styles.subtitleEmpty : undefined}
        data={utterances}
        keyExtractor={(_, index) => index.toString()}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        renderItem={({ item, index }) => (
          <SubtitleOverlay
            speaker={item.speaker}
            originalText={item.original}
            translatedText={item.translated}
            speakerColor={getSpeakerColor(item.speaker, speakerMapRef.current)}
            timestamp={new Date(item.timestamp).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
            isActive={isListening && index === utterances.length - 1}
          />
        )}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>👥</Text>
            </View>
            <Text style={styles.emptyTitle}>Ready to translate</Text>
            <Text style={styles.emptySubtext}>
              Start a session to capture{"\n"}multi-speaker conversations
            </Text>
          </View>
        }
      />

      {/* Error */}
      {error && <ErrorBanner message={error} />}

      {/* Bottom controls */}
      <View style={styles.controls}>
        {isListening ? (
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleExport}
              disabled={isExporting}
            >
              <Text style={styles.secondaryBtnText}>
                {isExporting ? "..." : "Export"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopBtn} onPress={handleToggleSession}>
              <View style={styles.stopSquare} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleExport}>
              <Text style={styles.secondaryBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.controlColumn}>
            {utterances.length > 0 && (
              <View style={styles.controlRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleExport}>
                  <Text style={styles.secondaryBtnText}>Export</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleExport}>
                  <Text style={styles.secondaryBtnText}>Share</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleToggleSession}
              activeOpacity={0.7}
            >
              <Text style={styles.startBtnText}>
                {utterances.length > 0 ? "New Session" : "Start Session"}
              </Text>
            </TouchableOpacity>
            {utterances.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearText}>Clear transcript</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.displayMedium, fontSize: fontSize.heading, color: colors.textPrimary,
  },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: "rgba(16, 185, 129, 0.15)", paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  timerText: { color: colors.success, fontSize: 11, fontWeight: "600", fontVariant: ["tabular-nums"] },
  langSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  langLabel: {
    fontSize: fontSize.label, color: colors.textMuted, textTransform: "uppercase",
    letterSpacing: 1.5, fontWeight: "600", marginBottom: spacing.sm,
  },
  langCompact: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  langCompactLabel: { color: colors.textMuted, fontSize: 11 },
  langCompactValue: { color: colors.accentCyan, fontSize: 11, fontWeight: "600" },
  subtitleList: { flex: 1, paddingHorizontal: spacing.lg },
  subtitleEmpty: { flex: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyIcon: {
    width: 80, height: 80, borderRadius: borderRadius.full, backgroundColor: colors.bgSurface,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.bgElevated,
  },
  emptyIconText: { fontSize: 36, opacity: 0.3 },
  emptyTitle: { fontSize: fontSize.body, fontWeight: "500", color: colors.textDim },
  emptySubtext: { fontSize: 13, color: colors.bgElevated, textAlign: "center", marginTop: spacing.xs },
  controls: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderTopColor: colors.bgSurface },
  controlRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md },
  controlColumn: { alignItems: "center", gap: spacing.md },
  secondaryBtn: {
    flex: 1, backgroundColor: colors.bgSurface, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.bgElevated,
  },
  secondaryBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: "500" },
  stopBtn: {
    width: 52, height: 52, borderRadius: borderRadius.full, backgroundColor: colors.error,
    alignItems: "center", justifyContent: "center", ...shadows.glowError,
  },
  stopSquare: { width: 18, height: 18, borderRadius: 3, backgroundColor: colors.white },
  startBtn: {
    width: "100%", backgroundColor: colors.accentBlue, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: "center", ...shadows.glowMd,
  },
  startBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  clearText: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
});
```

- [ ] **Step 2: Commit**

```bash
git add voxlingo/app/\(tabs\)/meeting.tsx && git commit -m "feat: redesign Meeting screen with dark theme, gradient avatars, live badge"
```

---

### Task 13: Redesign Settings Screen

**Files:**
- Modify: `voxlingo/app/settings.tsx`

- [ ] **Step 1: Rewrite settings.tsx**

```typescript
// voxlingo/app/settings.tsx
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { LanguageCode, Translation, WordListItem } from "../types";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
} from "../constants/languages";
import { LanguagePicker } from "../components/LanguagePicker";
import { SkeletonCard } from "../components/SkeletonCard";
import { ErrorBanner } from "../components/ErrorBanner";
import {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  getTranslationHistory,
  getWordList,
} from "../services/firebase";
import { colors, spacing, borderRadius, fontSize, fontFamily } from "../theme";

const MODE_COLORS: Record<string, string> = {
  travel: colors.accentBlue,
  camera: colors.accentCyan,
  meeting: "#8b5cf6",
};

export default function SettingsScreen() {
  const [sourceLang, setSourceLang] = useState<LanguageCode>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [history, setHistory] = useState<Translation[]>([]);
  const [wordList, setWordList] = useState<WordListItem[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "words">("history");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setIsSignedIn(true);
      setUserName(user.displayName || "User");
      setUserEmail(user.email || "");
      loadUserData(user.uid);
    }
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [hist, words] = await Promise.all([
        getTranslationHistory(uid),
        getWordList(uid),
      ]);
      setHistory(hist);
      setWordList(words);
    } catch {
      setLoadError("Could not load data. You may be offline.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = useCallback(async () => {
    const profile = await signInWithGoogle();
    if (profile) {
      setIsSignedIn(true);
      setUserName(profile.displayName);
      const user = getCurrentUser();
      if (user) {
        setUserEmail(user.email || "");
        loadUserData(user.uid);
      }
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setIsSignedIn(false);
    setUserName("");
    setUserEmail("");
    setHistory([]);
    setWordList([]);
  }, []);

  const initials = userName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Account Card */}
        <View style={styles.section}>
          {isSignedIn ? (
            <View style={styles.accountCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{userName}</Text>
                <Text style={styles.accountEmail}>{userEmail}</Text>
              </View>
              <ChevronRight size={16} color={colors.textDim} strokeWidth={2} />
            </View>
          ) : (
            <TouchableOpacity style={styles.signInBtn} onPress={handleSignIn}>
              <Text style={styles.signInText}>Sign in with Google</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Default Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DEFAULT LANGUAGES</Text>
          <View style={styles.langCard}>
            <View style={styles.langRow}>
              <Text style={styles.langRowLabel}>From</Text>
              <View style={styles.langRowRight}>
                <LanguagePicker selectedLang={sourceLang} onSelect={setSourceLang} />
              </View>
            </View>
            <View style={styles.langDivider} />
            <View style={styles.langRow}>
              <Text style={styles.langRowLabel}>To</Text>
              <View style={styles.langRowRight}>
                <LanguagePicker selectedLang={targetLang} onSelect={setTargetLang} />
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.section}>
          <View style={styles.tabToggle}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "history" && styles.tabBtnActive]}
              onPress={() => setActiveTab("history")}
            >
              <Text style={[styles.tabBtnText, activeTab === "history" && styles.tabBtnTextActive]}>
                History
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "words" && styles.tabBtnActive]}
              onPress={() => setActiveTab("words")}
            >
              <Text style={[styles.tabBtnText, activeTab === "words" && styles.tabBtnTextActive]}>
                Word List
              </Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {loadError && <ErrorBanner message={loadError} onRetry={() => {
            const user = getCurrentUser();
            if (user) loadUserData(user.uid);
          }} />}

          {!isLoading && activeTab === "history" && (
            history.length === 0 ? (
              <Text style={styles.emptyText}>No translation history yet</Text>
            ) : (
              history.slice(0, 20).map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyTop}>
                    <Text style={styles.historyOriginal} numberOfLines={1}>{item.originalText}</Text>
                    <View style={styles.modeBadge}>
                      <View style={[styles.modeDot, { backgroundColor: MODE_COLORS[item.mode] || colors.accentBlue }]} />
                      <Text style={styles.modeText}>{item.mode}</Text>
                    </View>
                  </View>
                  <Text style={styles.historyTranslated} numberOfLines={1}>{item.translatedText}</Text>
                  <Text style={styles.historyTime}>
                    {new Date(item.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })},{" "}
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </Text>
                </View>
              ))
            )
          )}

          {!isLoading && activeTab === "words" && (
            wordList.length === 0 ? (
              <Text style={styles.emptyText}>No saved words yet</Text>
            ) : (
              wordList.slice(0, 20).map((item) => (
                <View key={item.id} style={styles.wordCard}>
                  <Text style={styles.wordText}>{item.word}</Text>
                  <Text style={styles.wordTranslation}>{item.translation}</Text>
                </View>
              ))
            )
          )}
        </View>

        {/* Sign Out */}
        {isSignedIn && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  section: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  sectionLabel: {
    fontSize: fontSize.label, color: colors.textMuted, fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: spacing.sm,
  },
  accountCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg, padding: spacing.lg, gap: spacing.md,
    borderWidth: 1, borderColor: colors.bgElevated,
  },
  avatar: {
    width: 44, height: 44, borderRadius: borderRadius.full, backgroundColor: colors.accentBlue,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  accountInfo: { flex: 1 },
  accountName: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: "600" },
  accountEmail: { color: colors.textMuted, fontSize: fontSize.caption, marginTop: 1 },
  signInBtn: {
    backgroundColor: colors.accentBlue, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: "center",
  },
  signInText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  langCard: {
    backgroundColor: colors.bgSurface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.bgElevated, overflow: "hidden",
  },
  langRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
  },
  langRowLabel: { color: colors.textSubtle, fontSize: 13 },
  langRowRight: {},
  langDivider: { height: 1, backgroundColor: colors.bgPrimary },
  tabToggle: {
    flexDirection: "row", backgroundColor: colors.bgSurface, borderRadius: borderRadius.md,
    padding: 3, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.bgElevated,
  },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: "center" },
  tabBtnActive: { backgroundColor: colors.accentBlue },
  tabBtnText: { fontSize: fontSize.caption, fontWeight: "500", color: colors.textMuted },
  tabBtnTextActive: { color: colors.white, fontWeight: "600" },
  emptyText: { color: colors.textSubtle, fontSize: 14, textAlign: "center", paddingVertical: spacing.lg },
  historyCard: {
    backgroundColor: colors.bgSurface, borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.bgElevated,
  },
  historyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  historyOriginal: { color: colors.textPrimary, fontSize: 13, fontWeight: "500", flex: 1 },
  modeBadge: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  modeDot: { width: 4, height: 4, borderRadius: 2 },
  modeText: { color: colors.textDim, fontSize: 10 },
  historyTranslated: { color: colors.accentCyan, fontSize: fontSize.caption },
  historyTime: { color: colors.textDim, fontSize: 10, marginTop: spacing.xs },
  wordCard: {
    flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.bgElevated,
  },
  wordText: { color: colors.textPrimary, fontSize: 13, fontWeight: "500" },
  wordTranslation: { color: colors.accentCyan, fontSize: 13 },
  signOutBtn: { alignItems: "center", paddingVertical: spacing.lg },
  signOutText: { color: colors.error, fontSize: 13, fontWeight: "500" },
});
```

- [ ] **Step 2: Commit**

```bash
git add voxlingo/app/settings.tsx && git commit -m "feat: redesign Settings screen with dark cards, gradient avatar, mode badges"
```

---

### Task 14: Final Typecheck + Smoke Test

- [ ] **Step 1: Run full typecheck**

```bash
cd voxlingo && npx tsc --noEmit
```

Fix any type errors that arise.

- [ ] **Step 2: Start the app and verify it loads**

```bash
cd voxlingo && npx expo start --web
```

Verify: App loads with dark theme, tabs render with Lucide icons and gradient active pill. Navigate between all 4 screens.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve typecheck and rendering issues from visual redesign"
```

(Skip this step if no fixes were needed.)
