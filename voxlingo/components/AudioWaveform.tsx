import { View, StyleSheet } from "react-native";

interface AudioWaveformProps {
  isActive: boolean;
}

export function AudioWaveform({ isActive }: AudioWaveformProps) {
  return (
    <View
      style={[styles.container, isActive && styles.active]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    width: "100%",
  },
  active: {
    backgroundColor: "#3b82f6",
  },
});
