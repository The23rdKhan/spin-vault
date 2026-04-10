import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useTheme, type ThemeColors } from '../theme/useTheme';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

type IconVariant = 'default' | 'muted' | 'gold' | 'error' | 'win';

interface IconProps {
  name: IoniconsName;
  size?: number;
  color?: string;
  variant?: IconVariant;
}

function getVariantColor(variant: IconVariant, colors: ThemeColors): string {
  switch (variant) {
    case 'muted':
      return colors.text.secondary;
    case 'gold':
      return colors.gold.primary;
    case 'error':
      return colors.semantic.error;
    case 'win':
      return colors.semantic.win;
    case 'default':
    default:
      return colors.text.primary;
  }
}

export default function Icon({ name, size = 24, color, variant = 'default' }: IconProps) {
  const { colors } = useTheme();
  const iconColor = color ?? getVariantColor(variant, colors);

  return <Ionicons name={name} size={size} color={iconColor} />;
}
