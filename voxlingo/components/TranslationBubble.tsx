import { View, Text, StyleSheet } from "react-native";

interface TranslationBubbleProps {
  text: string;
  isSource: boolean;
}

export function TranslationBubble({ text, isSource }: TranslationBubbleProps) {
  return (
    <View style={[styles.bubble, isSource ? styles.source : styles.target]}>
      <Text style={[styles.text, !isSource && styles.targetText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  source: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
  },
  target: {
    alignSelf: "flex-end",
    backgroundColor: "#3b82f6",
  },
  text: {
    fontSize: 16,
    color: "#1f2937",
  },
  targetText: {
    color: "#ffffff",
  },
});
