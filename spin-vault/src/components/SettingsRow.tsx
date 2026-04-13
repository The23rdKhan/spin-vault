/**
 * SettingsRow — A single row in a settings list
 *
 * Label on the left, arbitrary right-side control (Switch, text, chevron).
 * Tappable when onPress is provided.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../theme/useTheme';

interface SettingsRowProps {
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  showSeparator?: boolean;
}

export function SettingsRow({
  label,
  subtitle,
  right,
  onPress,
  danger = false,
  showSeparator = true,
}: SettingsRowProps) {
  const { colors, spacing, typography } = useTheme();

  const labelColor = danger ? colors.semantic.error : colors.text.primary;

  const inner = (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomColor: colors.border.default,
          borderBottomWidth: showSeparator ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      <View style={styles.labelGroup}>
        <Text style={[styles.label, { ...typography.body, color: labelColor }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { ...typography.caption, color: colors.text.tertiary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelGroup: {
    flex: 1,
    marginRight: 12,
  },
  label: {},
  subtitle: {
    marginTop: 2,
  },
  right: {
    flexShrink: 0,
  },
});

export default SettingsRow;
