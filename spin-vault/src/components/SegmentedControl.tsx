/**
 * SegmentedControl — Multi-option pill selector
 *
 * Used for haptic intensity (Light/Medium/Heavy) and volume steps (25/50/75/100%).
 * No external dependency — pure RN + Reanimated 3.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../theme/useTheme';

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function SegmentedControl({ options, value, onChange, disabled = false }: SegmentedControlProps) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg.card,
          borderRadius: radius.lg,
          borderColor: colors.border.default,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {options.map((option, index) => {
        const isSelected = option === value;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;

        return (
          <TouchableOpacity
            key={option}
            onPress={() => !disabled && onChange(option)}
            activeOpacity={0.75}
            style={[
              styles.segment,
              {
                backgroundColor: isSelected ? colors.gold.primary : 'transparent',
                borderRadius: isFirst
                  ? radius.md
                  : isLast
                    ? radius.md
                    : 0,
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
              },
              !isLast && {
                borderRightWidth: StyleSheet.hairlineWidth,
                borderRightColor: colors.border.default,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  ...typography.label,
                  color: isSelected ? colors.bg.machine : colors.text.secondary,
                  fontWeight: isSelected ? '700' : '400',
                },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});

export default SegmentedControl;
