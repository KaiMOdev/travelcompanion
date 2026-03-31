import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, spacing, borderRadius } from "../theme";

// Use text emoji icons — works reliably on all platforms without SVG dependency issues
const TAB_EMOJI = {
  index: "🎤",
  camera: "📷",
  meeting: "👥",
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
        const routeName = route.name as keyof typeof TAB_EMOJI;
        const emoji = TAB_EMOJI[routeName];
        const label = TAB_LABELS[routeName];

        if (!emoji || !label) return null;

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
              <Text style={styles.iconEmoji}>{emoji}</Text>
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
  iconEmoji: {
    fontSize: 18,
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
