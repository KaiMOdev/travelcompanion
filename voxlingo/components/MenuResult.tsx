import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MenuTranslation, MenuItem } from '../types';
import { colors, spacing, radius, typography, shadow } from '../constants/theme';

const ALLERGEN_COLORS: Record<string, string> = {
  wheat: '#D2691E', egg: '#FFD700', dairy: '#87CEEB', nuts: '#8B4513',
  peanuts: '#CD853F', soy: '#556B2F', shellfish: '#FF6347', fish: '#4682B4',
  sesame: '#DEB887', pork: '#FF69B4', beef: '#8B0000',
};

type Props = {
  result: MenuTranslation;
  userDietary?: string[];
};

function MenuItemCard({ item, userDietary }: { item: MenuItem; userDietary?: string[] }) {
  const [expanded, setExpanded] = useState(false);

  const hasConflict = userDietary?.some((pref) =>
    item.possibleAllergens.some((a) => a.toLowerCase().includes(pref.toLowerCase())),
  );

  return (
    <TouchableOpacity
      style={[styles.menuItem, hasConflict && styles.menuItemConflict]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemHeader}>
        <View style={styles.menuItemTitles}>
          <Text style={styles.menuItemOriginal}>{item.original}</Text>
          <Text style={styles.menuItemTranslated}>{item.translated}</Text>
        </View>
        {item.popular && <Text style={styles.popularBadge}>Popular</Text>}
      </View>

      {expanded && (
        <View style={styles.menuItemDetails}>
          <Text style={styles.description}>{item.description}</Text>

          {item.possibleAllergens.length > 0 && (
            <View style={styles.allergensRow}>
              <Text style={styles.allergensLabel}>
                Possibly contains ({item.allergenConfidence}):
              </Text>
              <View style={styles.allergenPills}>
                {item.possibleAllergens.map((allergen) => (
                  <View
                    key={allergen}
                    style={[
                      styles.allergenPill,
                      { backgroundColor: ALLERGEN_COLORS[allergen] || '#999' },
                    ]}
                  >
                    <Text style={styles.allergenText}>{allergen}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {item.allergenConfidence === 'low' && (
            <Text style={styles.askStaff}>Ask staff about allergens</Text>
          )}

          {item.dietary.length > 0 && (
            <View style={styles.dietaryRow}>
              {item.dietary.map((d) => (
                <Text key={d} style={styles.dietaryBadge}>{d}</Text>
              ))}
            </View>
          )}

          {hasConflict && (
            <Text style={styles.conflictWarning}>
              May conflict with your dietary preferences — ask staff to confirm
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function MenuResult({ result, userDietary }: Props) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.detectedLang}>
        Detected: {result.detectedLanguage.toUpperCase()}
      </Text>
      <Text style={styles.menuLabel}>Menu — tap items for details</Text>

      {result.items.map((item, index) => (
        <MenuItemCard key={index} item={item} userDietary={userDietary} />
      ))}

      <Text style={styles.disclaimer}>{result.disclaimer}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  detectedLang: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  menuLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  menuItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow('sm'),
  },
  menuItemConflict: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: colors.error,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuItemTitles: {
    flex: 1,
  },
  menuItemOriginal: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  menuItemTranslated: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  popularBadge: {
    ...typography.caption,
    color: colors.secondary,
    backgroundColor: colors.secondaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    fontWeight: '700',
    overflow: 'hidden',
  },
  menuItemDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  allergensLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  allergensRow: {
    marginBottom: spacing.md,
  },
  allergenPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  allergenPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  allergenText: {
    ...typography.caption,
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  askStaff: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  dietaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dietaryBadge: {
    ...typography.caption,
    color: colors.success,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    fontWeight: '600',
    overflow: 'hidden',
  },
  conflictWarning: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    backgroundColor: colors.errorBg,
    padding: spacing.sm,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
