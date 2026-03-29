import * as Location from "expo-location";

export interface LocationContext {
  country: string;
  city: string;
  region: string;
  culturalHints: string[];
}

export async function getLocationContext(): Promise<LocationContext | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const location = await Location.getCurrentPositionAsync({});
    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    if (!geocode) return null;

    const country = geocode.country || "Unknown";
    const city = geocode.city || geocode.region || "Unknown";
    const region = geocode.region || "";

    return {
      country,
      city,
      region,
      culturalHints: buildCulturalHints(country, city, region),
    };
  } catch (error) {
    console.warn("Location context error:", error);
    return null;
  }
}

function buildCulturalHints(country: string, city: string, region: string): string[] {
  const hints: string[] = [];
  hints.push(`User is currently in ${city}, ${country}`);
  if (region && region !== city) {
    hints.push(`Region: ${region}`);
  }
  return hints;
}

export function formatLocationForPrompt(context: LocationContext): string {
  return context.culturalHints.join(". ") + ".";
}
