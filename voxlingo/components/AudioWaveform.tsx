import { View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { colors, spacing } from "../theme";

interface AudioWaveformProps {
  isActive: boolean;
}

const BAR_COUNT = 12;

function WaveBar({ index, isActive }: { index: number; isActive: boolean }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Stop any existing animation
    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current = null;
    }

    if (isActive) {
      const minHeight = 0.2 + Math.random() * 0.2;
      const maxHeight = 0.5 + Math.random() * 0.5;
      const duration = 200 + Math.random() * 300;

      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(index * 50),
          Animated.timing(scale, {
            toValue: maxHeight,
            duration,
            useNativeDriver: false,
          }),
          Animated.timing(scale, {
            toValue: minHeight,
            duration,
            useNativeDriver: false,
          }),
        ])
      );
      loopRef.current = loop;
      loop.start();
    } else {
      Animated.timing(scale, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }

    return () => {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current = null;
      }
      scale.stopAnimation();
    };
  }, [isActive, index, scale]);

  const isEven = index % 2 === 0;

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: isActive
            ? isEven
              ? colors.accentBlue
              : colors.accentCyan
            : colors.bgElevated,
          transform: [{ scaleY: scale }],
        },
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
