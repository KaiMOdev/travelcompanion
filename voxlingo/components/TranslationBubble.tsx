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
