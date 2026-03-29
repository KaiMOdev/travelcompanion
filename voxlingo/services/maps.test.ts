import { getLocationContext } from "./maps";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 40.4168, longitude: -3.7038 },
  }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([
    { country: "Spain", city: "Madrid", region: "Community of Madrid" },
  ]),
}));

describe("getLocationContext", () => {
  it("returns location context with country and city", async () => {
    const context = await getLocationContext();
    expect(context).not.toBeNull();
    expect(context!.country).toBe("Spain");
    expect(context!.city).toBe("Madrid");
  });

  it("includes cultural hints", async () => {
    const context = await getLocationContext();
    expect(context!.culturalHints).toBeDefined();
    expect(Array.isArray(context!.culturalHints)).toBe(true);
  });
});
