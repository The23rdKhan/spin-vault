/**
 * BetSelector — Bet level controls
 *
 * Decrement / current bet display / increment / MAX button.
 * Disables appropriately based on balance and bet level bounds.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { useWalletStore, BET_LEVELS } from '../../stores/walletSlice';
import { formatCoins } from '../../utils/formatCoins';
import Icon from '../Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface BetSelectorProps {
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function BetSelector({ disabled = false }: BetSelectorProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const currentBet = useWalletStore((s) => s.currentBet);
  const betLevelIndex = useWalletStore((s) => s.betLevelIndex);
  const balance = useWalletStore((s) => s.balance);
  const increaseBet = useWalletStore((s) => s.increaseBet);
  const decreaseBet = useWalletStore((s) => s.decreaseBet);
  const setMaxBet = useWalletStore((s) => s.setMaxBet);

  const isAtMin = betLevelIndex === 0;
  const isAtLastLevel = betLevelIndex === BET_LEVELS.length - 1;
  const nextBetLevel = isAtLastLevel ? null : BET_LEVELS[betLevelIndex + 1];
  const isAtMax = isAtLastLevel || (nextBetLevel !== null && nextBetLevel > balance);

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      {/* Decrement */}
      <TouchableOpacity
        onPress={decreaseBet}
        disabled={disabled || isAtMin}
        activeOpacity={0.7}
        style={styles.iconButton}
      >
        <Icon
          name="remove-circle-outline"
          size={32}
          variant={disabled || isAtMin ? 'muted' : 'default'}
        />
      </TouchableOpacity>

      {/* Bet display */}
      <View
        style={[
          styles.betDisplay,
          {
            backgroundColor: colors.bg.card,
            borderRadius: radius.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderColor: colors.border.default,
          },
        ]}
      >
        <Text
          style={[
            styles.betLabel,
            { ...typography.label, color: colors.text.tertiary },
          ]}
        >
          BET
        </Text>
        <Text
          style={[
            styles.betAmount,
            { ...typography.title, color: colors.gold.primary },
          ]}
        >
          {formatCoins(currentBet)}
        </Text>
      </View>

      {/* Increment */}
      <TouchableOpacity
        onPress={increaseBet}
        disabled={disabled || isAtMax}
        activeOpacity={0.7}
        style={styles.iconButton}
      >
        <Icon
          name="add-circle-outline"
          size={32}
          variant={disabled || isAtMax ? 'muted' : 'default'}
        />
      </TouchableOpacity>

      {/* MAX button */}
      {!isAtMax && !disabled && (
        <TouchableOpacity
          onPress={setMaxBet}
          disabled={disabled}
          activeOpacity={0.7}
          style={[
            styles.maxButton,
            {
              backgroundColor: colors.gold.light,
              borderRadius: radius.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
            },
          ]}
        >
          <Text
            style={[
              styles.maxLabel,
              { ...typography.label, color: colors.gold.text },
            ]}
          >
            MAX
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  iconButton: {
    padding: 4,
  },
  betDisplay: {
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
  },
  betLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  betAmount: {
    marginTop: 2,
  },
  maxButton: {
    marginLeft: 4,
  },
  maxLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default BetSelector;
