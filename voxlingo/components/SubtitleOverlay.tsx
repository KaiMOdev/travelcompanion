import { View, Text, StyleSheet } from "react-native";

interface SubtitleOverlayProps {
  speaker: string;
  originalText: string;
  translatedText: string;
  color: string;
}

export function SubtitleOverlay({
  speaker,
  originalText,
  translatedText,
  color,
}: SubtitleOverlayProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{speaker.charAt(0)}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.speaker}>{speaker}</Text>
        <Text style={styles.original}>{originalText}</Text>
        <Text style={styles.translated}>{translatedText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 12,
    marginVertical: 4,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  textContainer: {
    flex: 1,
  },
  speaker: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 2,
  },
  original: {
    fontSize: 14,
    color: "#9ca3af",
  },
  translated: {
    fontSize: 16,
    color: "#1f2937",
    marginTop: 2,
  },
});
