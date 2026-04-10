import { useColorScheme } from 'react-native';

import {
  lightColors,
  darkColors,
  spacing,
  radius,
  typography,
  type LightColors,
  type DarkColors,
  type ColorScheme,
} from './tokens';

export type ThemeColors = LightColors | DarkColors;

interface Theme {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

/**
 * React hook for accessing theme values.
 * Automatically switches between light/dark based on system preference.
 */
export function useTheme(): Theme {
  const systemColorScheme = useColorScheme();
  const colorScheme: ColorScheme = systemColorScheme ?? 'light';

  return {
    colorScheme,
    colors: colorScheme === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    typography,
  };
}

/**
 * Static theme for use outside React components (services, utilities).
 * Always uses light mode colours.
 */
export const staticTheme: Theme = {
  colorScheme: 'light',
  colors: lightColors,
  spacing,
  radius,
  typography,
};

export default useTheme;
