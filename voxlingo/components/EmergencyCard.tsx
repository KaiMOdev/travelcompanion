import React from 'react';
import { Modal, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { EmergencyInfo } from '../types';
import { colors, spacing, radius, typography } from '../constants/theme';

type Props = {
  visible: boolean;
  info: EmergencyInfo;
  countryName: string;
  onClose: () => void;
};

export function EmergencyCard({ visible, info, countryName, onClose }: Props) {
  const callNumber = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Emergency — {countryName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.numbersRow}>
            <TouchableOpacity style={styles.numberCard} onPress={() => callNumber(info.police)}>
              <Text style={styles.numberLabel}>Police</Text>
              <Text style={styles.number}>{info.police}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberCard} onPress={() => callNumber(info.ambulance)}>
              <Text style={styles.numberLabel}>Ambulance</Text>
              <Text style={styles.number}>{info.ambulance}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberCard} onPress={() => callNumber(info.fire)}>
              <Text style={styles.numberLabel}>Fire</Text>
              <Text style={styles.number}>{info.fire}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.phrasesSection}>
            <Text style={styles.phrasesTitle}>Show someone these phrases:</Text>
            <View style={styles.phraseItem}>
              <Text style={styles.phraseLabel}>I need help:</Text>
              <Text style={styles.phraseText}>{info.phrases.help}</Text>
            </View>
            <View style={styles.phraseItem}>
              <Text style={styles.phraseLabel}>Call an ambulance:</Text>
              <Text style={styles.phraseText}>{info.phrases.callAmbulance}</Text>
            </View>
            <View style={styles.phraseItem}>
              <Text style={styles.phraseLabel}>I don't speak the language:</Text>
              <Text style={styles.phraseText}>{info.phrases.dontSpeak}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.advisoryLink}
            onPress={() => Linking.openURL(info.advisoryUrl)}
          >
            <Text style={styles.advisoryText}>Official travel advisory</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Emergency information is for reference. Always verify with local authorities.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.subtitle,
    color: colors.error,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 20,
    color: colors.textSecondary,
    padding: spacing.sm,
  },
  numbersRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  numberCard: {
    flex: 1,
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  numberLabel: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  number: {
    ...typography.title,
    color: colors.error,
    fontWeight: '800',
  },
  phrasesSection: {
    marginBottom: spacing.xl,
  },
  phrasesTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  phraseItem: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  phraseLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  phraseText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  advisoryLink: {
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  advisoryText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
