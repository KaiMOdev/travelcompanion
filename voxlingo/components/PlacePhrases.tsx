import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { ExplorePlace, PlacePhrase } from '../types';
import { colors, spacing, radius, typography, shadow } from '../constants/theme';

type Props = {
  visible: boolean;
  place: ExplorePlace | null;
  onClose: () => void;
  onSpeak: (text: string) => void;
};

function PhraseRow({ phrase, onSpeak }: { phrase: PlacePhrase; onSpeak: (text: string) => void }) {
  return (
    <View style={styles.phraseRow}>
      <View style={styles.phraseContent}>
        <Text style={styles.phraseEnglish}>{phrase.english}</Text>
        <Text style={styles.phraseLocal}>{phrase.local}</Text>
        {phrase.context ? (
          <Text style={styles.phraseContext}>{phrase.context}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.speakButton}
        onPress={() => onSpeak(phrase.local)}
        activeOpacity={0.7}
      >
        <Text style={styles.speakIcon}>🔊</Text>
      </TouchableOpacity>
    </View>
  );
}

export function PlacePhrases({ visible, place, onClose, onSpeak }: Props) {
  if (!place) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Useful Phrases</Text>
            <Text style={styles.subtitle}>for {place.name}</Text>
          </View>

          {place.phrases.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No phrases available for this place.</Text>
            </View>
          ) : (
            <FlatList
              data={place.phrases}
              keyExtractor={(_, index) => String(index)}
              renderItem={({ item }) => (
                <PhraseRow phrase={item} onSpeak={onSpeak} />
              )}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.xxxl,
    ...shadow('lg'),
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  list: {
    padding: spacing.lg,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  phraseContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  phraseEnglish: {
    ...typography.body,
    color: colors.textPrimary,
  },
  phraseLocal: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  phraseContext: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  speakButton: {
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  speakIcon: {
    fontSize: 20,
  },
  empty: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
  closeButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  closeText: {
    ...typography.subtitle,
    color: colors.textOnPrimary,
  },
});
