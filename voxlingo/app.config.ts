import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = process.env.APP_ENV ?? "development";
  const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL;

  if (appEnv === "production" && !serverUrl) {
    throw new Error(
      "EXPO_PUBLIC_SERVER_URL is required for production builds. " +
      "Set it via EAS secrets or environment variables."
    );
  }

  return {
    ...config,
    name: "WanderVox",
    slug: "wandervox",
    extra: {
      ...config.extra,
      appEnv,
      serverUrl: serverUrl ?? "http://localhost:3001",
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
      serverApiKey: process.env.EXPO_PUBLIC_SERVER_API_KEY ?? "",
    },
  };
};
