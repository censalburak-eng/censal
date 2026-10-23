import { scale, verticalScale, moderateScale, wp, hp } from './responsive';

export const lightColors = {
  // Brand & Actions
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  primaryTint: 'rgba(79, 70, 229, 0.10)',
  primaryText: '#4F46E5',

  // Background & Surfaces
  bg: '#F4F4FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E4E4F0',

  // Texts
  text: '#1F2937',
  muted: '#6B7280',
  textInverse: '#FFFFFF',

  // Status & Pins
  online: '#22C55E',
  pin: '#FFE4E6',
  pinText: '#881337',
  pinBorder: '#FECDD3',

  // Plate TR Badge
  plateBg: '#FFFFFF',
  plateBorder: '#CBD5E1',
  plateBlueTR: '#1D4ED8',
  plateText: '#1F2937',

  // Semantics
  danger: '#EF4444',
  dangerSurface: 'rgba(239, 68, 68, 0.1)',
  success: '#22C55E',
  successSurface: 'rgba(34, 197, 94, 0.1)',
} as const;

export const darkColors = {
  // Brand & Actions
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  primaryTint: 'rgba(79, 70, 229, 0.15)',
  primaryText: '#818CF8',

  // Background & Surfaces
  bg: '#12121F',
  surface: '#1E1E33',
  surfaceElevated: '#282846',
  border: '#2E2E4A',

  // Texts
  text: '#E5E7EB',
  muted: '#9CA3AF',
  textInverse: '#12121F',

  // Status & Pins
  online: '#22C55E',
  pin: 'rgba(136, 19, 55, 0.35)',
  pinText: '#FDA4AF',
  pinBorder: 'rgba(244, 63, 94, 0.3)',

  // Plate TR Badge
  plateBg: '#1A1A2E',
  plateBorder: '#3F3F66',
  plateBlueTR: '#1D4ED8',
  plateText: '#FFFFFF',

  // Semantics
  danger: '#EF4444',
  dangerSurface: 'rgba(239, 68, 68, 0.15)',
  success: '#22C55E',
  successSurface: 'rgba(34, 197, 94, 0.15)',
} as const;

// tokens.ts
export type ThemeColors = { [K in keyof typeof lightColors]: string };

// Mor ve mavi hariç tutulmuş kullanıcı isim renkleri
export const USER_NAME_COLORS = {
  light: [
    '#BE123C',
    '#B45309',
    '#0F766E',
    '#A21CAF',
    '#4D7C0F',
    '#C2410C',
  ] as const,
  dark: [
    '#FDA4AF',
    '#FCD34D',
    '#5EEAD4',
    '#F0ABFC',
    '#BEF264',
    '#FDBA74',
  ] as const,
};

export const getUserColor = (userId: string, isDark: boolean): string => {
  const colors = isDark ? USER_NAME_COLORS.dark : USER_NAME_COLORS.light;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index] ?? colors[0];
};

export const tokens = {
  colors: {
    ...lightColors,
    background: lightColors.bg,
    cardBackground: lightColors.surface,
    cardBorder: lightColors.border,
    surfaceBorder: lightColors.border,
    textPrimary: lightColors.text,
    textSecondary: lightColors.muted,
    textMuted: lightColors.muted,
    primaryLight: lightColors.primary,
    primaryDark: '#1D4ED8',
    warning: '#B45309',
    freeBg: lightColors.successSurface,
    freeText: lightColors.success,
    pinBadgeBg: lightColors.pin,
    pinBadgeText: lightColors.pinText,
    pinBadgeBorder: lightColors.pinBorder,
  },
  spacing: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },
  radii: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  typography: {
    fontSize: {
      caption: 11,
      sm: 13,
      base: 15,
      md: 16,
      lg: 18,
      xl: 22,
      xxl: 28,
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
    },
  },
  touchTarget: {
    minHeight: 44,
    minWidth: 44,
  },
  scale,
  verticalScale,
  moderateScale,
  wp,
  hp,
} as const;
