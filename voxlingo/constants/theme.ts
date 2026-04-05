import { Platform } from 'react-native';

export const colors = {
  // Primary — vibrant teal-cyan
  primary: '#00BFA6',
  primaryDark: '#00897B',
  primaryDeep: '#004D40',
  primaryLight: '#E0F7FA',
  primaryGlow: 'rgba(0, 191, 166, 0.15)',

  // Accent — electric coral
  accent: '#FF6B6B',
  accentLight: '#FFE0E0',

  // Secondary — vivid amber
  secondary: '#FFB300',
  secondaryLight: '#FFF8E1',

  // Dark backgrounds
  headerBg: '#0A1628',
  headerText: '#FFFFFF',
  headerSubtext: 'rgba(255,255,255,0.6)',

  // Light backgrounds
  background: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F7',

  // Text
  textPrimary: '#1B2838',
  textSecondary: '#5A6577',
  textMuted: '#8F9BB3',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',

  // Bubbles
  sourceBubble: '#FFFFFF',
  targetBubble: '#E0F7FA',
  targetText: '#00897B',

  // States
  recording: '#FF4757',
  recordingGlow: 'rgba(255, 71, 87, 0.2)',
  translating: '#FFB300',
  error: '#E53935',
  errorBg: '#FFEBEE',
  errorBorder: '#FFCDD2',
  success: '#00C853',

  // Borders & dividers
  border: '#E4E9F2',
  divider: '#EDF1F7',

  // Tab bar
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E4E9F2',
  tabActive: '#00BFA6',
  tabInactive: '#8F9BB3',

  // Camera
  cameraBg: '#0A0A0A',
  shutterBg: '#1A1A2E',
  shutterRing: '#00BFA6',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const typography = {
  hero: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    letterSpacing: -1,
  },
  title: {
    fontSize: 24,
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
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600' as const,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
};

export function shadow(level: 'sm' | 'md' | 'lg' | 'glow') {
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
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
    lg: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: {},
    }),
    glow: Platform.select({
      ios: {
        shadowColor: '#00BFA6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  };
  return shadows[level] || {};
}
