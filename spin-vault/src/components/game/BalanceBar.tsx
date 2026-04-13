/**
 * BalanceBar — Top-of-screen status strip
 *
 * Shows live balance (optimistic during spin), current bet, and a free spins
 * counter when in free spin mode. Balance pops briefly when a win is credited.
 */

import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/useTheme';
import { useWalletStore } from '../../stores/walletSlice';
import { useGameStore } from '../../stores/gameSlice';
import { useUIStore } from '../../stores/uiSlice';
import { formatCoins } from '../../utils/formatCoins';
import Icon from '../Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function BalanceBar() {
  const { colors, spacing, typography } = useTheme();

  const balance = useWalletStore((s) => s.balance);
  const optimisticBalance = useWalletStore((s) => s.optimisticBalance);
  const currentBet = useWalletStore((s) => s.currentBet);
  const isSyncing = useWalletStore((s) => s.isSyncing);

  const freeSpinsRemaining = useGameStore((s) => s.freeSpinsRemaining);
  const freeSpinsTotal = useGameStore((s) => s.freeSpinsTotal);

  const isBalanceHidden = useUIStore((s) => s.isBalanceHidden);
  const toggleBalanceVisibility = useUIStore((s) => s.toggleBalanceVisibility);

  // The displayed balance — use optimistic value while a spin is pending
  const displayedBalance = optimisticBalance ?? balance;
  const prevBalanceRef = useRef(displayedBalance);

  const balanceScale = useSharedValue(1);

  // Pop animation when balance increases (win credited)
  useEffect(() => {
    if (displayedBalance > prevBalanceRef.current) {
      balanceScale.value = withSequence(
        withSpring(1.12, { damping: 10, stiffness: 300 }),
        withSpring(1.0, { damping: 12, stiffness: 200 })
      );
    }
    prevBalanceRef.current = displayedBalance;
  }, [displayedBalance, balanceScale]);

  const balanceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: balanceScale.value }],
  }));

  const inFreeSpins = freeSpinsRemaining > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg.card,
          borderBottomColor: colors.border.default,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      {/* Left — Balance */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionLabel,
            { ...typography.label, color: colors.text.tertiary },
          ]}
        >
          BALANCE
        </Text>
        <View style={styles.balanceRow}>
          <Animated.View style={balanceAnimatedStyle}>
            <Text
              style={[
                styles.balanceAmount,
                { ...typography.title, color: colors.text.primary },
              ]}
            >
              {isBalanceHidden ? '••••••' : formatCoins(displayedBalance)}
            </Text>
          </Animated.View>

          <TouchableOpacity
            onPress={toggleBalanceVisibility}
            activeOpacity={0.7}
            style={styles.eyeButton}
          >
            <Icon
              name={isBalanceHidden ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              variant="muted"
            />
          </TouchableOpacity>

          {isSyncing && (
            <ActivityIndicator
              size="small"
              color={colors.text.tertiary}
              style={styles.syncIndicator}
            />
          )}
        </View>
      </View>

      {/* Right — Bet or Free Spins */}
      {inFreeSpins ? (
        <View style={[styles.section, styles.sectionRight]}>
          <Text
            style={[
              styles.sectionLabel,
              { ...typography.label, color: colors.jackpot.purple },
            ]}
          >
            FREE SPINS
          </Text>
          <Text
            style={[
              styles.freeSpinsCount,
              { ...typography.title, color: colors.jackpot.purple },
            ]}
          >
            {freeSpinsRemaining}/{freeSpinsTotal}
          </Text>
        </View>
      ) : (
        <View style={[styles.section, styles.sectionRight]}>
          <Text
            style={[
              styles.sectionLabel,
              { ...typography.label, color: colors.text.tertiary },
            ]}
          >
            BET
          </Text>
          <Text
            style={[
              styles.betAmount,
              { ...typography.body, color: colors.gold.primary },
            ]}
          >
            {formatCoins(currentBet)}
          </Text>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  section: {
    gap: 2,
  },
  sectionRight: {
    alignItems: 'flex-end',
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceAmount: {
    fontWeight: '600',
  },
  eyeButton: {
    padding: 2,
  },
  syncIndicator: {
    marginLeft: 4,
  },
  freeSpinsCount: {
    fontWeight: '700',
  },
  betAmount: {
    fontWeight: '600',
  },
});

export default BalanceBar;
