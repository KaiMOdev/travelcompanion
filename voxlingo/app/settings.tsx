// voxlingo/app/settings.tsx
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { LanguageCode, Translation, WordListItem } from "../types";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
} from "../constants/languages";
import { LanguagePicker } from "../components/LanguagePicker";
import { SkeletonCard } from "../components/SkeletonCard";
import { ErrorBanner } from "../components/ErrorBanner";
import {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  getTranslationHistory,
  getWordList,
} from "../services/firebase";
import { colors, spacing, borderRadius, fontSize, fontFamily } from "../theme";

const MODE_COLORS: Record<string, string> = {
  travel: colors.accentBlue,
  camera: colors.accentCyan,
  meeting: "#8b5cf6",
};

export default function SettingsScreen() {
  const [sourceLang, setSourceLang] = useState<LanguageCode>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<LanguageCode>(DEFAULT_TARGET_LANG);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [history, setHistory] = useState<Translation[]>([]);
  const [wordList, setWordList] = useState<WordListItem[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "words">("history");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setIsSignedIn(true);
      setUserName(user.displayName || "User");
      setUserEmail(user.email || "");
      loadUserData(user.uid);
    }
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [hist, words] = await Promise.all([
        getTranslationHistory(uid),
        getWordList(uid),
      ]);
      setHistory(hist);
      setWordList(words);
    } catch {
      setLoadError("Could not load data. You may be offline.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = useCallback(async () => {
    const profile = await signInWithGoogle();
    if (profile) {
      setIsSignedIn(true);
      setUserName(profile.displayName);
      const user = getCurrentUser();
      if (user) {
        setUserEmail(user.email || "");
        loadUserData(user.uid);
      }
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setIsSignedIn(false);
    setUserName("");
    setUserEmail("");
    setHistory([]);
    setWordList([]);
  }, []);

  const initials = userName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Account Card */}
        <View style={styles.section}>
          {isSignedIn ? (
            <View style={styles.accountCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{userName}</Text>
                <Text style={styles.accountEmail}>{userEmail}</Text>
              </View>
              <ChevronRight size={16} color={colors.textDim} strokeWidth={2} />
            </View>
          ) : (
            <TouchableOpacity style={styles.signInBtn} onPress={handleSignIn}>
              <Text style={styles.signInText}>Sign in with Google</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Default Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DEFAULT LANGUAGES</Text>
          <View style={styles.langCard}>
            <View style={styles.langRow}>
              <Text style={styles.langRowLabel}>From</Text>
              <View style={styles.langRowRight}>
                <LanguagePicker selectedLang={sourceLang} onSelect={setSourceLang} />
              </View>
            </View>
            <View style={styles.langDivider} />
            <View style={styles.langRow}>
              <Text style={styles.langRowLabel}>To</Text>
              <View style={styles.langRowRight}>
                <LanguagePicker selectedLang={targetLang} onSelect={setTargetLang} />
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.section}>
          <View style={styles.tabToggle}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "history" && styles.tabBtnActive]}
              onPress={() => setActiveTab("history")}
            >
              <Text style={[styles.tabBtnText, activeTab === "history" && styles.tabBtnTextActive]}>
                History
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "words" && styles.tabBtnActive]}
              onPress={() => setActiveTab("words")}
            >
              <Text style={[styles.tabBtnText, activeTab === "words" && styles.tabBtnTextActive]}>
                Word List
              </Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {loadError && <ErrorBanner message={loadError} onRetry={() => {
            const user = getCurrentUser();
            if (user) loadUserData(user.uid);
          }} />}

          {!isLoading && activeTab === "history" && (
            history.length === 0 ? (
              <Text style={styles.emptyText}>No translation history yet</Text>
            ) : (
              history.slice(0, 20).map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyTop}>
                    <Text style={styles.historyOriginal} numberOfLines={1}>{item.originalText}</Text>
                    <View style={styles.modeBadge}>
                      <View style={[styles.modeDot, { backgroundColor: MODE_COLORS[item.mode] || colors.accentBlue }]} />
                      <Text style={styles.modeText}>{item.mode}</Text>
                    </View>
                  </View>
                  <Text style={styles.historyTranslated} numberOfLines={1}>{item.translatedText}</Text>
                  <Text style={styles.historyTime}>
                    {new Date(item.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })},{" "}
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </Text>
                </View>
              ))
            )
          )}

          {!isLoading && activeTab === "words" && (
            wordList.length === 0 ? (
              <Text style={styles.emptyText}>No saved words yet</Text>
            ) : (
              wordList.slice(0, 20).map((item) => (
                <View key={item.id} style={styles.wordCard}>
                  <Text style={styles.wordText}>{item.word}</Text>
                  <Text style={styles.wordTranslation}>{item.translation}</Text>
                </View>
              ))
            )
          )}
        </View>

        {/* Sign Out */}
        {isSignedIn && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  section: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  sectionLabel: {
    fontSize: fontSize.label, color: colors.textMuted, fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: spacing.sm,
  },
  accountCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg, padding: spacing.lg, gap: spacing.md,
    borderWidth: 1, borderColor: colors.bgElevated,
  },
  avatar: {
    width: 44, height: 44, borderRadius: borderRadius.full, backgroundColor: colors.accentBlue,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  accountInfo: { flex: 1 },
  accountName: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: "600" },
  accountEmail: { color: colors.textMuted, fontSize: fontSize.caption, marginTop: 1 },
  signInBtn: {
    backgroundColor: colors.accentBlue, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: "center",
  },
  signInText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  langCard: {
    backgroundColor: colors.bgSurface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.bgElevated, overflow: "hidden",
  },
  langRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
  },
  langRowLabel: { color: colors.textSubtle, fontSize: 13 },
  langRowRight: {},
  langDivider: { height: 1, backgroundColor: colors.bgPrimary },
  tabToggle: {
    flexDirection: "row", backgroundColor: colors.bgSurface, borderRadius: borderRadius.md,
    padding: 3, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.bgElevated,
  },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: "center" },
  tabBtnActive: { backgroundColor: colors.accentBlue },
  tabBtnText: { fontSize: fontSize.caption, fontWeight: "500", color: colors.textMuted },
  tabBtnTextActive: { color: colors.white, fontWeight: "600" },
  emptyText: { color: colors.textSubtle, fontSize: 14, textAlign: "center", paddingVertical: spacing.lg },
  historyCard: {
    backgroundColor: colors.bgSurface, borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.bgElevated,
  },
  historyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  historyOriginal: { color: colors.textPrimary, fontSize: 13, fontWeight: "500", flex: 1 },
  modeBadge: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  modeDot: { width: 4, height: 4, borderRadius: 2 },
  modeText: { color: colors.textDim, fontSize: 10 },
  historyTranslated: { color: colors.accentCyan, fontSize: fontSize.caption },
  historyTime: { color: colors.textDim, fontSize: 10, marginTop: spacing.xs },
  wordCard: {
    flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.bgElevated,
  },
  wordText: { color: colors.textPrimary, fontSize: 13, fontWeight: "500" },
  wordTranslation: { color: colors.accentCyan, fontSize: 13 },
  signOutBtn: { alignItems: "center", paddingVertical: spacing.lg },
  signOutText: { color: colors.error, fontSize: 13, fontWeight: "500" },
});
