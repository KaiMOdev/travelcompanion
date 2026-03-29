import { Platform } from "react-native";

export const fontFamily = {
  display: "SpaceGrotesk_700Bold",
  displayMedium: "SpaceGrotesk_600SemiBold",
  system: Platform.select({ ios: "System", android: "Roboto", default: "System" }),
} as const;

export const fontSize = {
  display: 28,
  heading: 20,
  subheading: 16,
  body: 15,
  translation: 17,
  caption: 12,
  label: 10,
} as const;

export const fontWeight = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const letterSpacing = {
  label: 1.5,
  display: -0.5,
};
