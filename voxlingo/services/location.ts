import * as Location from 'expo-location';

export type LocationInfo = {
  address: string;
  latitude: number;
  longitude: number;
};

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<LocationInfo | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const parts = [
      geocode?.streetNumber,
      geocode?.street,
      geocode?.district,
      geocode?.city,
      geocode?.region,
    ].filter(Boolean);

    return {
      address: parts.join(', ') || `${location.coords.latitude}, ${location.coords.longitude}`,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}
