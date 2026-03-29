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
