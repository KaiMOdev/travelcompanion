import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LanguageCode } from "../types";
import { getLanguageName } from "../constants/languages";

interface LanguagePickerProps {
  selectedLang: LanguageCode;
  onSelect: (lang: LanguageCode) => void;
}

export function LanguagePicker({ selectedLang, onSelect }: LanguagePickerProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => {
        // TODO: Open language selection modal
        onSelect(selectedLang);
      }}
    >
      <Text style={styles.label}>{getLanguageName(selectedLang)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});
