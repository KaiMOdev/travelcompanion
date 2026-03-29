import { View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  isActive: boolean;
}

const BAR_COUNT = 5;

export function AudioWaveform({ isActive }: AudioWaveformProps) {
  const animations = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3))
  ).current;
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    // Stop any existing loops before starting new ones
    loopsRef.current.forEach((loop) => loop.stop());
    loopsRef.current = [];

    if (isActive) {
      animations.forEach((anim, index) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.4 + Math.random() * 0.6,
              duration: 200 + Math.random() * 300,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.2 + Math.random() * 0.2,
              duration: 200 + Math.random() * 300,
              useNativeDriver: false,
            }),
          ])
        );
        loopsRef.current.push(loop);
        loop.start();
      });
    } else {
      animations.forEach((anim) => {
        anim.stopAnimation();
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      loopsRef.current.forEach((loop) => loop.stop());
      loopsRef.current = [];
      animations.forEach((anim) => anim.stopAnimation());
    };
  }, [isActive, animations]);

  return (
    <View style={styles.container}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            isActive && styles.activeBar,
            {
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    gap: 4,
  },
  bar: {
    width: 4,
    height: 40,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
  },
  activeBar: {
    backgroundColor: "#3b82f6",
  },
});
