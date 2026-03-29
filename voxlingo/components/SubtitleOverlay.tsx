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
