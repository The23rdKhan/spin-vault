/**
 * StatCard — Numeric stat display tile
 *
 * Shows a label + large value, used on Profile and Events screens.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/useTheme';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface StatCardProps {
  label: string;
  value: string;
  icon?: IoniconsName;
  valueColor?: string;
}

export function StatCard({ label, value, icon, valueColor }: StatCardProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const displayColor = valueColor ?? colors.gold.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bg.card,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderColor: colors.border.default,
        },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={18} color={colors.text.tertiary} style={styles.icon} />
      ) : null}
      <Text style={[styles.value, { ...typography.headline, color: displayColor }]}>{value}</Text>
      <Text style={[styles.label, { ...typography.label, color: colors.text.tertiary }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 80,
  },
  icon: {
    marginBottom: 4,
  },
  value: {
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default StatCard;
