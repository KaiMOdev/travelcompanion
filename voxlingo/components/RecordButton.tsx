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
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
      );
      pulse.start();
      glow.start();
      return () => { pulse.stop(); glow.stop(); };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.3);
    }
  }, [isRecording, pulseAnim, glowAnim]);

  return (
    <View style={styles.container}>
      {isRecording && (
        <Animated.View
          style={[
            styles.glowRing,
            { opacity: glowAnim, transform: [{ scale: pulseAnim }] },
          ]}
        />
      )}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.button,
            isRecording && styles.recording,
            isTranslating && styles.translating,
          ]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.icon}>
            {isRecording ? '⏹️' : isTranslating ? '⏳' : '🎙️'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
      <Text style={[styles.hint, isRecording && styles.hintRecording]}>
        {isRecording ? 'Tap to stop' : isTranslating ? 'Translating...' : 'Tap to speak'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
  },
  glowRing: {
    position: 'absolute',
    top: spacing.lg - 12,
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.recordingGlow,
  },
  button: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow('glow'),
  },
  recording: {
    backgroundColor: colors.recording,
  },
  translating: {
    backgroundColor: colors.translating,
  },
  icon: {
    fontSize: 36,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  hintRecording: {
    color: colors.recording,
  },
});
