import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { XCircle, RefreshCw } from "lucide-react-native";
import { colors, spacing, borderRadius } from "../theme";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onDismiss || onRetry}
      activeOpacity={0.8}
    >
      <View style={styles.iconCircle}>
        <XCircle size={14} color={colors.error} strokeWidth={2} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.message}>{message}</Text>
        {onRetry && <Text style={styles.action}>Tap to retry</Text>}
      </View>
      {onRetry && (
        <RefreshCw size={14} color={colors.error} strokeWidth={2} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    gap: spacing.md,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  message: {
    color: colors.errorLight,
    fontSize: 13,
    fontWeight: "500",
  },
  action: {
    color: colors.errorAction,
    fontSize: 11,
    marginTop: 2,
  },
});
