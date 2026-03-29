import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { LanguageCode, Translation, WordListItem } from "../types";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
} from "../constants/languages";
import { LanguagePicker } from "../components/LanguagePicker";
import {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  getTranslationHistory,
  getWordList,
} from "../services/firebase";

export default function SettingsScreen() {
  const [sourceLang, setSourceLang] = useState<LanguageCode>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [history, setHistory] = useState<Translation[]>([]);
  const [wordList, setWordList] = useState<WordListItem[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "words">("history");

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setIsSignedIn(true);
      setUserName(user.displayName || user.email || "User");
      loadUserData(user.uid);
    }
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      const [hist, words] = await Promise.all([
        getTranslationHistory(uid),
        getWordList(uid),
      ]);
      setHistory(hist);
      setWordList(words);
    } catch {
      // Offline or no data yet
    }
  };

  const handleSignIn = useCallback(async () => {
    const profile = await signInWithGoogle();
    if (profile) {
      setIsSignedIn(true);
      setUserName(profile.displayName);
      const user = getCurrentUser();
      if (user) loadUserData(user.uid);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setIsSignedIn(false);
    setUserName("");
    setHistory([]);
    setWordList([]);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {isSignedIn ? (
            <View style={styles.accountInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.accountDetails}>
                <Text style={styles.accountName}>{userName}</Text>
                <TouchableOpacity onPress={handleSignOut}>
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
              <Text style={styles.signInText}>Sign in with Google</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Language Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Languages</Text>
          <View style={styles.langRow}>
            <LanguagePicker selectedLang={sourceLang} onSelect={setSourceLang} label="From" />
            <LanguagePicker selectedLang={targetLang} onSelect={setTargetLang} label="To" />
          </View>
        </View>

        {/* Tabs: History / Word List */}
        <View style={styles.section}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "history" && styles.tabActive]}
              onPress={() => setActiveTab("history")}
            >
              <Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>
                History ({history.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "words" && styles.tabActive]}
              onPress={() => setActiveTab("words")}
            >
              <Text style={[styles.tabText, activeTab === "words" && styles.tabTextActive]}>
                Word List ({wordList.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "history" && (
            <View>
              {history.length === 0 ? (
                <Text style={styles.emptyText}>No translation history yet</Text>
              ) : (
                history.slice(0, 20).map((item) => (
                  <View key={item.id} style={styles.historyItem}>
                    <Text style={styles.historyOriginal} numberOfLines={1}>{item.originalText}</Text>
                    <Text style={styles.historyTranslated} numberOfLines={1}>{item.translatedText}</Text>
                    <Text style={styles.historyMeta}>{item.sourceLang} → {item.targetLang} · {item.mode}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "words" && (
            <View>
              {wordList.length === 0 ? (
                <Text style={styles.emptyText}>No saved words yet</Text>
              ) : (
                wordList.slice(0, 20).map((item) => (
                  <View key={item.id} style={styles.wordItem}>
                    <Text style={styles.word}>{item.word}</Text>
                    <Text style={styles.wordTranslation}>{item.translation}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  section: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: "#6b7280", textTransform: "uppercase", marginBottom: 12 },
  accountInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#ffffff", fontSize: 20, fontWeight: "bold" },
  accountDetails: { flex: 1 },
  accountName: { fontSize: 18, fontWeight: "600", color: "#1f2937" },
  signOutText: { fontSize: 14, color: "#ef4444", marginTop: 2 },
  signInButton: { backgroundColor: "#3b82f6", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  signInText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  langRow: { flexDirection: "row", gap: 16 },
  tabBar: { flexDirection: "row", marginBottom: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f3f4f6", alignItems: "center" },
  tabActive: { backgroundColor: "#3b82f6" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  tabTextActive: { color: "#ffffff" },
  emptyText: { color: "#9ca3af", fontSize: 14, textAlign: "center", paddingVertical: 16 },
  historyItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  historyOriginal: { fontSize: 14, color: "#9ca3af" },
  historyTranslated: { fontSize: 16, color: "#1f2937", fontWeight: "500", marginTop: 2 },
  historyMeta: { fontSize: 12, color: "#d1d5db", marginTop: 4 },
  wordItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  word: { fontSize: 16, color: "#1f2937", fontWeight: "500" },
  wordTranslation: { fontSize: 16, color: "#3b82f6" },
});
