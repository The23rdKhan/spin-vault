/**
 * Shop Screen
 *
 * Daily Bonus claim shortcut and coming soon message for future monetization.
 * IAP and Ads have been removed - this is a free-to-play social casino.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../src/theme/useTheme';
import { useWalletStore, DAILY_FREE_COINS } from '../../src/stores/walletSlice';
import { useUIStore } from '../../src/stores/uiSlice';
import { BalanceBar } from '../../src/components/game/BalanceBar';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { formatCoins } from '../../src/utils/formatCoins';
import Icon from '../../src/components/Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const { colors, spacing, radius, typography } = useTheme();

  const canClaimDaily = useWalletStore((s) => s.canClaimDaily);
  const showModal = useUIStore((s) => s.showModal);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg.primary }]} edges={['top']}>
      <ScreenHeader title="Shop" subtitle="Get more coins" />
      <BalanceBar />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Daily Bonus shortcut (when available) ── */}
        {canClaimDaily && (
          <TouchableOpacity
            onPress={() => showModal('daily_bonus')}
            activeOpacity={0.85}
            style={[
              styles.dailyRow,
              {
                marginHorizontal: spacing.lg,
                marginTop: spacing.lg,
                backgroundColor: colors.gold.light,
                borderColor: colors.gold.primary,
                borderRadius: radius.lg,
                padding: spacing.md,
              },
            ]}
          >
            <Icon name="gift-outline" size={24} variant="gold" />
            <View style={styles.dailyText}>
              <Text style={{ ...typography.body, color: colors.gold.text, fontWeight: '600' }}>
                Daily Bonus Available!
              </Text>
              <Text style={{ ...typography.caption, color: colors.gold.primary }}>
                Claim {formatCoins(DAILY_FREE_COINS)} free coins
              </Text>
            </View>
            <Icon name="chevron-forward-outline" size={18} variant="gold" />
          </TouchableOpacity>
        )}

        {/* ── Coming Soon Message ── */}
        <View
          style={[
            styles.comingSoonCard,
            {
              marginHorizontal: spacing.lg,
              marginTop: spacing.xl,
              backgroundColor: colors.bg.card,
              borderColor: colors.border.default,
              borderRadius: radius.lg,
              padding: spacing.xl,
            },
          ]}
        >
          <Icon name="rocket-outline" size={48} variant="muted" />
          <Text
            style={{
              ...typography.title,
              color: colors.text.primary,
              fontWeight: '700',
              marginTop: spacing.md,
              textAlign: 'center',
            }}
          >
            More Ways to Earn
          </Text>
          <Text
            style={{
              ...typography.body,
              color: colors.text.secondary,
              marginTop: spacing.sm,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            Additional coin packages and bonus features coming soon!
          </Text>
          <Text
            style={{
              ...typography.caption,
              color: colors.text.tertiary,
              marginTop: spacing.md,
              textAlign: 'center',
            }}
          >
            For now, enjoy free daily bonuses and spins!
          </Text>
        </View>

        {/* Note */}
        <Text
          style={[
            styles.note,
            { ...typography.caption, color: colors.text.tertiary, paddingHorizontal: spacing.lg },
          ]}
        >
          Spin Vault uses virtual coins for entertainment only. No real money or prizes involved.
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  dailyText: { flex: 1 },
  comingSoonCard: {
    alignItems: 'center',
    borderWidth: 1,
  },
  note: {
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 18,
  },
});
