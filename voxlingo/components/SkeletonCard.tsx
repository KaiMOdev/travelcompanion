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
