/**
 * ScreenHeader — Reusable top title bar for tab screens
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/useTheme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg.card,
          borderBottomColor: colors.border.default,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
      ]}
    >
      <Text style={[styles.title, { ...typography.title, color: colors.text.primary }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { ...typography.caption, color: colors.text.tertiary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
  },
});

export default ScreenHeader;
