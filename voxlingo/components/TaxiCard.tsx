import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { getCurrentLocation, LocationInfo } from '../services/location';
import { colors, spacing, radius, typography } from '../constants/theme';

type Props = {
  visible: boolean;
  hotelAddress?: string;
  hotelAddressLocal?: string;
  onClose: () => void;
};

export function TaxiCard({ visible, hotelAddress, hotelAddressLocal, onClose }: Props) {
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadLocation();
    }
  }, [visible]);

  const loadLocation = async () => {
    setIsLoading(true);
    setError(null);
    const loc = await getCurrentLocation();
    if (loc) {
      setLocation(loc);
    } else {
      setError('Could not get your location. Please enable location services.');
    }
    setIsLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>

        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}

        {error && !isLoading && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadLocation}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {location && !isLoading && (
          <View style={styles.content}>
            <Text style={styles.heading}>Show this to your driver</Text>

            <View style={styles.addressCard}>
              <Text style={styles.addressLabel}>My current location:</Text>
              <Text style={styles.addressText}>{location.address}</Text>
            </View>

            {hotelAddress && (
              <View style={styles.addressCard}>
                <Text style={styles.addressLabel}>Take me to:</Text>
                <Text style={styles.addressText}>{hotelAddress}</Text>
                {hotelAddressLocal && (
                  <Text style={styles.addressLocal}>{hotelAddressLocal}</Text>
                )}
              </View>
            )}

            <Text style={styles.coordinates}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.headerBg,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: spacing.xl,
    zIndex: 1,
    padding: spacing.md,
  },
  closeText: {
    ...typography.body,
    color: 'white',
    fontWeight: '600',
  },
  centered: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: {
    ...typography.body,
    color: 'white',
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    gap: spacing.xxl,
  },
  heading: {
    ...typography.title,
    color: 'white',
    textAlign: 'center',
  },
  addressCard: {
    backgroundColor: 'white',
    borderRadius: radius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
  },
  addressLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  addressText: {
    ...typography.title,
    color: colors.textPrimary,
    lineHeight: 36,
  },
  addressLocal: {
    ...typography.subtitle,
    color: colors.primary,
    marginTop: spacing.md,
  },
  coordinates: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.4)',
  },
});
