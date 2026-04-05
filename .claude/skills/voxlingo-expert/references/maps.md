# Google Maps & Location Reference

## Table of Contents
1. [Current Implementation](#current-implementation)
2. [Expo Location API](#expo-location-api)
3. [Maps Grounding (Planned)](#maps-grounding)
4. [Common Errors](#common-errors)

---

## Current Implementation

The project currently uses `expo-location` for geolocation rather than direct Google Maps API calls. The location context is used to provide culturally-aware translations (e.g., knowing the user is in Japan to use appropriate formality levels).

### Architecture
```
expo-location (native) → reverseGeocodeAsync → LocationContext → Gemini system prompt
```

No backend proxy needed — `expo-location` uses the device's native geocoding service.

---

## Expo Location API

### Permissions
```typescript
import * as Location from "expo-location";

const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== "granted") {
  // Handle permission denied — show settings prompt
  return null;
}
```

**Permission types:**
- `requestForegroundPermissionsAsync()` — needed for one-time location checks
- `requestBackgroundPermissionsAsync()` — needed for continuous tracking (not currently used)

### Getting Current Location
```typescript
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced,  // Good enough for city-level context
});

// location.coords.latitude, location.coords.longitude
```

**Accuracy levels** (from fastest to most precise):
- `Lowest` — ~3km, instant
- `Low` — ~1km, fast
- `Balanced` — ~100m, moderate (recommended for this project)
- `High` — ~10m, slower
- `Highest` — ~1m, slowest, high battery use

### Reverse Geocoding
```typescript
const [geocode] = await Location.reverseGeocodeAsync({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
});

// geocode fields: country, city, region, street, name, postalCode, isoCountryCode
```

### Location Context Object
The project builds a `LocationContext` from geocode data:
```typescript
interface LocationContext {
  country: string;
  city: string;
  region: string;
  culturalHints: string;  // Built from country/city for translation context
}
```

This context is injected into Gemini system prompts to improve translation quality.

---

## Maps Grounding (Planned)

A `GOOGLE_MAPS_API_KEY` exists in the backend `.env` but Maps Grounding is not yet implemented. When implementing:

### Google Maps Platform APIs

**Places API (New)**
- Use for finding nearby businesses, landmarks, points of interest
- `POST https://places.googleapis.com/v1/places:searchNearby`
- Requires `X-Goog-Api-Key` header

**Geocoding API**
- More reliable than expo-location for production geocoding
- `GET https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={key}`

**Maps JavaScript API**
- For displaying interactive maps (if adding a map view)
- React Native: use `react-native-maps` with Google Maps provider

### Integration Pattern
Follow the existing backend-proxy pattern:
1. Add Maps API routes to the Express backend
2. Keep `GOOGLE_MAPS_API_KEY` server-side
3. Frontend calls backend endpoints, not Google directly

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Permission denied | User denied location access | Show explanation, link to device settings |
| Location unavailable | GPS disabled or no signal | Fall back to IP-based geolocation or skip location context |
| Reverse geocode returns empty | Remote area or service issue | Use coordinates directly, set country to "Unknown" |
| `expo-location` not linked | Missing native module | Run `npx expo install expo-location` |
| Stale location | Device cached old position | Use `getCurrentPositionAsync` not `getLastKnownPositionAsync` |

### Battery & Performance
- Don't poll location continuously — fetch once when a translation session starts
- Use `Accuracy.Balanced` unless high precision is needed
- Cache location context for the duration of a session (location doesn't change mid-conversation)