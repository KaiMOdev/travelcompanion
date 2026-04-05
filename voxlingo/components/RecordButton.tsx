import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors, shadow, spacing } from '../constants/theme';

type Props = {
  isRecording: boolean;
  isTranslating: boolean;
  onPress: () => void;
};

export function RecordButton({ isRecording, isTranslating, onPress }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 700,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: false,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  return (
    <View style={styles.container}>
      {isRecording && <View style={styles.ringOuter} />}
      <Animated.View style={[styles.wrapper, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity
          style={[
            styles.button,
            isRecording && styles.recording,
          ]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.icon}>
            {isRecording ? '⏹️' : isTranslating ? '⏳' : '🎙️'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
      <Text style={styles.hint}>
        {isRecording ? 'Tap to stop' : isTranslating ? 'Translating...' : 'Tap to speak'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  wrapper: {
    alignItems: 'center',
  },
  ringOuter: {
    position: 'absolute',
    top: spacing.xl - 6,
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: colors.recording,
    opacity: 0.3,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow('lg'),
  },
  recording: {
    backgroundColor: colors.recording,
  },
  icon: {
    fontSize: 34,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});
