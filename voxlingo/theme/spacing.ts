export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

import { Platform } from "react-native";

// Shadow styles: iOS uses shadow* props, Android uses elevation only
function makeShadow(color: string, opacity: number, radius: number, elevation: number) {
  if (Platform.OS === "android") {
    return { elevation };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

export const shadows = {
  glowSm: makeShadow("#3b82f6", 0.2, 10, 4),
  glowMd: makeShadow("#3b82f6", 0.3, 15, 6),
  glowLg: makeShadow("#3b82f6", 0.4, 20, 8),
  glowError: makeShadow("#ef4444", 0.3, 15, 6),
  glowSuccess: makeShadow("#10b981", 0.3, 10, 4),
};
