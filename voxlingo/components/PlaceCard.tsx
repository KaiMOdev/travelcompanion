import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ExplorePlace } from '../types';
import { colors, spacing, radius, typography, shadow } from '../constants/theme';

type Props = {
  place: ExplorePlace;
  onPhrases: (place: ExplorePlace) => void;
  onDirections: (place: ExplorePlace) => void;
  onTranslate: () => void;
};

export function PlaceCard({ place, onPhrases, onDirections, onTranslate }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{place.name}</Text>
        {place.localName ? (
          <Text style={styles.localName}>{place.localName}</Text>
        ) : null}
      </View>

      <Text style={styles.description}>{place.description}</Text>

      {place.whySpecial ? (
        <Text style={styles.whySpecial}>{place.whySpecial}</Text>
      ) : null}

      {place.vibeTags.length > 0 && (
        <View style={styles.tagsRow}>
          {place.vibeTags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onPhrases(place)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>Phrases</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDirections(place)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionIcon}>🗺️</Text>
          <Text style={styles.actionLabel}>Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onTranslate}
          activeOpacity={0.7}
        >
          <Text style={styles.actionIcon}>🎙️</Text>
          <Text style={styles.actionLabel}>Translate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadow('sm'),
  },
  header: {
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  localName: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  whySpecial: {
    ...typography.body,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagText: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'lowercase',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  actionLabel: {
    ...typography.label,
    color: colors.primary,
  },
});
