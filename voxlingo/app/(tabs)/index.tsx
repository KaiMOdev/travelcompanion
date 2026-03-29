import { View, Text, StyleSheet } from "react-native";

export default function TravelScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Travel Mode</Text>
      <Text style={styles.subtitle}>Voice-to-voice translation</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
});
