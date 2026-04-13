/**
 * DailyBonusModal — Claim 325K daily bonus
 *
 * Shown once per day when canClaimDaily === true.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { useUIStore } from '../../stores/uiSlice';
import { useWalletStore, DAILY_FREE_COINS } from '../../stores/walletSlice';
import { AchievementService } from '../../services/AchievementService';
import { formatCoins } from '../../utils/formatCoins';
import Icon from '../Icon';
import { BaseModal } from './BaseModal';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface DailyBonusModalProps {
  visible: boolean;
}

export function DailyBonusModal({ visible }: DailyBonusModalProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const hideModal = useUIStore((s) => s.hideModal);
  const showSuccess = useUIStore((s) => s.showSuccess);
  const claimDailyBonus = useWalletStore((s) => s.claimDailyBonus);
  const isLoading = useWalletStore((s) => s.isLoading);

  async function handleClaim() {
    const success = await claimDailyBonus();
    if (success) {
      showSuccess(`${formatCoins(DAILY_FREE_COINS)} coins added!`);
      void AchievementService.unlock('daily_bonus');
    }
    hideModal();
  }

  return (
    <BaseModal visible={visible} onDismiss={hideModal} dismissOnBackdrop={false}>
      <View style={styles.container}>
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.gold.light, borderRadius: radius.full },
          ]}
        >
          <Icon name="gift-outline" size={40} variant="gold" />
        </View>

        {/* Title */}
        <Text style={[styles.title, { ...typography.headline, color: colors.text.primary }]}>
          Daily Bonus!
        </Text>

        {/* Amount */}
        <Text style={[styles.amount, { ...typography.display, color: colors.gold.primary }]}>
          {formatCoins(DAILY_FREE_COINS)}
        </Text>
        <Text style={[styles.coinsLabel, { ...typography.body, color: colors.text.secondary }]}>
          free coins
        </Text>

        {/* Claim button */}
        <TouchableOpacity
          onPress={() => void handleClaim()}
          disabled={isLoading}
          activeOpacity={0.8}
          style={[
            styles.button,
            {
              backgroundColor: colors.gold.primary,
              borderRadius: radius.lg,
              marginTop: spacing.xl,
              paddingVertical: spacing.md,
              opacity: isLoading ? 0.7 : 1,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.bg.machine} />
          ) : (
            <Text style={[styles.buttonText, { ...typography.title, color: colors.bg.machine }]}>
              CLAIM
            </Text>
          )}
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity onPress={hideModal} activeOpacity={0.7} style={styles.skipButton}>
          <Text style={[styles.skipText, { ...typography.caption, color: colors.text.tertiary }]}>
            Maybe later
          </Text>
        </TouchableOpacity>
      </View>
    </BaseModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  amount: {
    fontWeight: '700',
    marginTop: 4,
  },
  coinsLabel: {
    marginTop: 2,
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    letterSpacing: 1,
  },
  skipButton: {
    marginTop: 12,
    padding: 8,
  },
  skipText: {},
});

export default DailyBonusModal;
