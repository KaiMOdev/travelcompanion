import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { LanguageCode } from "../types";
import { SUPPORTED_LANGUAGES, Language } from "../constants/languages";

interface LanguagePickerProps {
  selectedLang: LanguageCode;
  onSelect: (lang: LanguageCode) => void;
  label?: string;
}

export function LanguagePicker({
  selectedLang,
  onSelect,
  label,
}: LanguagePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedLanguage = SUPPORTED_LANGUAGES.find(
    (l) => l.code === selectedLang
  );

  const handleSelect = (lang: Language) => {
    onSelect(lang.code);
    setModalVisible(false);
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>
          {selectedLanguage?.nativeName || selectedLang}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    item.code === selectedLang && styles.selectedItem,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.languageName}>{item.name}</Text>
                  <Text style={styles.nativeName}>{item.nativeName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    minWidth: 130,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  arrow: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  closeButton: {
    fontSize: 20,
    color: "#6b7280",
    padding: 4,
  },
  languageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  selectedItem: {
    backgroundColor: "#eef2ff",
  },
  languageName: {
    fontSize: 16,
    color: "#1f2937",
  },
  nativeName: {
    fontSize: 14,
    color: "#6b7280",
  },
});
