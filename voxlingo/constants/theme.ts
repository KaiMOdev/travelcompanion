import { Platform } from 'react-native';

export const colors = {
  // Primary palette
  primary: '#0D7377',
  primaryDark: '#095B5E',
  primaryLight: '#E0F2F1',

  // Accent
  accent: '#E8A838',
  accentLight: '#FFF3E0',

  // Backgrounds
  background: '#FAFAF7',
  surface: '#F2F0EB',
  surfaceElevated: '#FFFFFF',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#9E9E9E',
  textOnPrimary: '#FFFFFF',

  // Bubbles
  sourceBubble: '#F0EDE8',
  targetBubble: '#E0F2F1',
  targetText: '#0D7377',

  // States
  recording: '#D94040',
  error: '#C44D4D',
  errorBg: '#FFF0F0',
  errorBorder: '#E8A0A0',

  // Borders & dividers
  border: '#E0DDD6',
  divider: '#EDEBE6',

  // Tab bar
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E0DDD6',
  tabInactive: '#9E9E9E',

  // Camera
  cameraBg: '#0A0A0A',
  shutterBg: '#1A1A1A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
  },
  bodyLarge: {
    fontSize: 18,
  },
  caption: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
};

export function shadow(level: 'sm' | 'md' | 'lg') {
  const shadows = {
    sm: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
    md: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {},
    }),
    lg: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  };
  return shadows[level] || {};
}
