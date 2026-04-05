import React, { useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
} from 'react-native';
import { DESTINATIONS } from '../constants/destinations';
import { Destination } from '../types';
import { colors, spacing, radius, typography } from '../constants/theme';

type Props = {
  visible: boolean;
  selectedCode: string | null;
  onSelect: (countryCode: string) => void;
  onClose: () => void;
};

export function DestinationPicker({ visible, selectedCode, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? DESTINATIONS.filter((d) =>
        d.countryName.toLowerCase().includes(search.toLowerCase()),
      )
    : DESTINATIONS;

  // Sort: hero destinations first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    if (a.isHero && !b.isHero) return -1;
    if (!a.isHero && b.isHero) return 1;
    return a.countryName.localeCompare(b.countryName);
  });

  const renderItem = ({ item }: { item: Destination }) => {
    const isSelected = item.countryCode === selectedCode;
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.itemSelected]}
        onPress={() => {
          onSelect(item.countryCode);
          onClose();
        }}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
            {item.countryName}
          </Text>
          {item.isHero && <Text style={styles.heroBadge}>Featured</Text>}
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Where are you traveling?</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search countries..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.countryCode}
            renderItem={renderItem}
            style={styles.list}
          />
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
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  closeButton: {
    fontSize: 20,
    color: colors.textSecondary,
    padding: spacing.sm,
  },
  searchInput: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.textPrimary,
  },
  list: {
    paddingHorizontal: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  itemSelected: {
    backgroundColor: colors.primaryGlow,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  itemNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  heroBadge: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
});
