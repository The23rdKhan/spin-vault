/**
 * Spin Vault Design Tokens
 * RULE: All colours must come from this file — never hardcode hex values in components
 */

export const lightColors = {
  gold: {
    primary: '#B07D3A',
    light: '#F5E6C8',
    text: '#7A5520',
  },
  bg: {
    primary: '#FFFFFF',
    card: '#F8F7F4',
    elevated: '#FFFFFF',
    machine: '#1C1412',
    reel: '#FAFAF8',
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#6B6860',
    tertiary: '#A09D95',
  },
  border: {
    default: '#E8E6E0',
    strong: '#C8C5BE',
  },
  semantic: {
    win: '#2D7A3A',
    warning: '#B07D3A',
    error: '#C0392B',
    info: '#1A6B9A',
  },
  jackpot: {
    purple: '#5B3FA6',
  },
} as const;

export const darkColors = {
  gold: {
    primary: '#D4A055',
    light: '#3D2E0E',
    text: '#F5E6C8',
  },
  bg: {
    primary: '#0F0F0F',
    card: '#1A1A1A',
    elevated: '#252525',
    machine: '#1C1412',
    reel: '#F0EFE8',
  },
  text: {
    primary: '#F0EFE8',
    secondary: '#9B9890',
    tertiary: '#6B6860',
  },
  border: {
    default: '#2E2E2E',
    strong: '#444240',
  },
  semantic: {
    win: '#4CAF62',
    warning: '#D4A055',
    error: '#E05A4A',
    info: '#4A9FCC',
  },
  jackpot: {
    purple: '#8B6FD4',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  display: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '700' as const,
  },
  headline: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600' as const,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
  },
} as const;

// Type exports
export type LightColors = typeof lightColors;
export type DarkColors = typeof darkColors;
export type Colors = LightColors | DarkColors;
export type ColorScheme = 'light' | 'dark';
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Typography = typeof typography;
export type TypographyVariant = keyof Typography;
export type SpacingKey = keyof Spacing;
export type RadiusKey = keyof Radius;

// Combined tokens export
export const tokens = {
  colors: {
    light: lightColors,
    dark: darkColors,
  },
  spacing,
  radius,
  typography,
} as const;

export default tokens;
