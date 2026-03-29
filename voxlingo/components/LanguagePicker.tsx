import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
} from "react-native";
import { ChevronDown, X, Search, Check } from "lucide-react-native";
import { LanguageCode } from "../types";
import { SUPPORTED_LANGUAGES, Language } from "../constants/languages";
import { colors, spacing, borderRadius, fontSize } from "../theme";

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
  const [search, setSearch] = useState("");

  const selectedLanguage = SUPPORTED_LANGUAGES.find(
    (l) => l.code === selectedLang,
  );

  const filtered = useMemo(() => {
    if (!search) return SUPPORTED_LANGUAGES;
    const q = search.toLowerCase();
    return SUPPORTED_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q),
    );
  }, [search]);

  const handleSelect = (lang: Language) => {
    onSelect(lang.code);
    setModalVisible(false);
    setSearch("");
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>
          {selectedLanguage?.name || selectedLang}
        </Text>
        <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setModalVisible(false); setSearch(""); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setModalVisible(false); setSearch(""); }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                style={styles.closeCircle}
                onPress={() => { setModalVisible(false); setSearch(""); }}
              >
                <X size={14} color={colors.textSubtle} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search size={14} color={colors.textDim} strokeWidth={2} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search languages..."
                  placeholderTextColor={colors.textDim}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                />
              </View>
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = item.code === selectedLang;
                return (
                  <TouchableOpacity
                    style={[styles.langItem, isSelected && styles.langItemSelected]}
                    onPress={() => handleSelect(item)}
                  >
                    <View>
                      <Text style={styles.langName}>{item.name}</Text>
                      <Text style={styles.langNative}>{item.nativeName}</Text>
                    </View>
                    {isSelected && (
                      <Check size={16} color={colors.accentBlue} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.bgElevated,
    minWidth: 130,
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.bgOverlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: "70%",
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgPrimary,
  },
  modalTitle: {
    fontSize: fontSize.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    padding: spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgPrimary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.bgElevated,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },
  langItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  langItemSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  langName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  langNative: {
    fontSize: fontSize.caption,
    color: colors.textDim,
    marginTop: 1,
  },
});
