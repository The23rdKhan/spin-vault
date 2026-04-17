/**
 * Shop Screen
 *
 * Coin packages, Watch Ad row, and Daily Bonus shortcut.
 * IAP and Ads are stubbed — fully wired UI, no-op on press until SDKs configured.
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
// Temporarily disabled until dev build includes native modules
// import { IAPManager, COIN_PACKAGES, type CoinPackage } from '../../src/lib/iap';
// import { AdService } from '../../src/services/AdService';

// Stub for old dev build compatibility
const COIN_PACKAGES: any[] = [];
const IAPManager = {
  initialize: async () => {},
  purchasePackage: async (_id: string) => {},
  restorePurchases: async () => {}
};
const AdService = {
  initialize: async () => {},
  showRewardedAd: async () => false,
  getRewardAmount: () => 25000
};
type CoinPackage = any;

// ─────────────────────────────────────────────────────────────────────────────
// Package card
// ─────────────────────────────────────────────────────────────────────────────

function PackageCard({ pkg, onPress }: { pkg: CoinPackage; onPress: () => void }) {
  const { colors, spacing, radius, typography } = useTheme();
  const isPopular = pkg.tag === 'POPULAR';
  const isBestValue = pkg.tag === 'BEST VALUE';
  const highlight = isPopular || isBestValue;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: highlight ? colors.gold.light : colors.bg.card,
          borderColor: highlight ? colors.gold.primary : colors.border.default,
          borderRadius: radius.lg,
          padding: spacing.md,
        },
      ]}
    >
      {/* Tag badge */}
      {pkg.tag ? (
        <View
          style={[
            styles.tagBadge,
            {
              backgroundColor: colors.gold.primary,
              borderRadius: radius.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
              marginBottom: spacing.sm,
            },
          ]}
        >
          <Text style={{ ...typography.label, color: colors.bg.machine, fontWeight: '700' }}>
            {pkg.tag}
          </Text>
        </View>
      ) : (
        <View style={styles.tagPlaceholder} />
      )}

      {/* Coin icon */}
      <Text style={styles.coinEmoji}>🪙</Text>

      {/* Amount */}
      <Text style={{ ...typography.title, color: colors.text.primary, fontWeight: '700', marginTop: 4 }}>
        {pkg.label}
      </Text>
      <Text style={{ ...typography.caption, color: colors.text.tertiary }}>coins</Text>

      {/* Price */}
      <View
        style={[
          styles.priceButton,
          {
            backgroundColor: colors.gold.primary,
            borderRadius: radius.md,
            marginTop: spacing.sm,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <Text style={{ ...typography.body, color: colors.bg.machine, fontWeight: '700' }}>
          {pkg.price}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const { colors, spacing, radius, typography } = useTheme();

  const canClaimDaily = useWalletStore((s) => s.canClaimDaily);
  const showModal = useUIStore((s) => s.showModal);
  const showInfo = useUIStore((s) => s.showInfo);
  const showError = useUIStore((s) => s.showError);

  // Initialize IAP and Ads on mount
  React.useEffect(() => {
    IAPManager.initialize().catch((error) => {
      console.error('Failed to initialize IAP:', error);
      showError('Failed to load products. Please restart the app.');
    });

    AdService.initialize().catch((error) => {
      console.error('Failed to initialize AdService:', error);
      // Don't show error to user - ads are optional
    });
  }, [showError]);

  async function handlePackagePress(pkg: CoinPackage) {
    try {
      await IAPManager.purchasePackage(pkg.id);
    } catch (error) {
      console.error('Purchase error:', error);
      showError('Purchase failed. Please try again.');
    }
  }

  async function handleWatchAd() {
    try {
      await AdService.showRewardedAd();
    } catch (error) {
      console.error('Watch ad error:', error);
      showError('Failed to show ad. Please try again.');
    }
  }

  async function handleRestorePurchases() {
    try {
      await IAPManager.restorePurchases();
    } catch (error) {
      console.error('Restore error:', error);
      showError('Failed to restore purchases.');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg.primary }]} edges={['top']}>
      <ScreenHeader title="Shop" subtitle="Get more coins" />
      <BalanceBar />

      <ScrollView showsVerticalScrollIndicator={false}>

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

        {/* ── Watch Ad ── */}
        <TouchableOpacity
          onPress={handleWatchAd}
          activeOpacity={0.85}
          style={[
            styles.adRow,
            {
              marginHorizontal: spacing.lg,
              marginTop: spacing.lg,
              backgroundColor: colors.bg.card,
              borderColor: colors.border.default,
              borderRadius: radius.lg,
              padding: spacing.md,
            },
          ]}
        >
          <View
            style={[
              styles.adIcon,
              { backgroundColor: colors.semantic.info, borderRadius: radius.full },
            ]}
          >
            <Icon name="play-outline" size={20} color={colors.text.inverse} />
          </View>
          <View style={styles.dailyText}>
            <Text style={{ ...typography.body, color: colors.text.primary, fontWeight: '600' }}>
              Watch an Ad
            </Text>
            <Text style={{ ...typography.caption, color: colors.text.tertiary }}>
              Earn {formatCoins(BigInt(AdService.getRewardAmount()))} free coins
            </Text>
          </View>
          <Icon name="chevron-forward-outline" size={18} variant="muted" />
        </TouchableOpacity>

        {/* ── Packages section ── */}
        <Text
          style={[
            styles.sectionLabel,
            {
              ...typography.label,
              color: colors.text.tertiary,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.xl,
              paddingBottom: spacing.sm,
            },
          ]}
        >
          COIN PACKAGES
        </Text>

        <View style={[styles.grid, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
          {COIN_PACKAGES.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} onPress={() => handlePackagePress(pkg)} />
          ))}
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity
          onPress={handleRestorePurchases}
          style={[styles.restoreButton, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}
        >
          <Text style={{ ...typography.caption, color: colors.text.tertiary, textAlign: 'center' }}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

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
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  dailyText: { flex: 1 },
  adRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  adIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
  },
  tagBadge: { alignItems: 'center' },
  tagPlaceholder: { height: 20 },
  coinEmoji: { fontSize: 32 },
  priceButton: { alignItems: 'center' },
  restoreButton: {
    alignItems: 'center',
    marginTop: 12,
  },
  note: {
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});
