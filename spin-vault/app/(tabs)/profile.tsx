/**
 * Profile Screen
 *
 * Avatar, balance, session stats, achievements, and transaction history.
 */

import React, { useEffect } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/useTheme';
import { useSessionStore } from '../../src/stores/sessionSlice';
import { useGameStore } from '../../src/stores/gameSlice';
import { useWalletStore } from '../../src/stores/walletSlice';
import type { Transaction } from '../../src/stores/walletSlice';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StatCard } from '../../src/components/StatCard';
import { getAchievementDef } from '../../src/config/achievements';
import { formatCoins } from '../../src/utils/formatCoins';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return 'P';
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const TRANSACTION_LABELS: Record<string, string> = {
  spin_bet: 'Spin',
  spin_win: 'Win',
  daily_bonus: 'Daily Bonus',
  ad_reward: 'Ad Reward',
  purchase: 'Purchase',
  refund: 'Refund',
  admin_credit: 'Credit',
};

function formatTxDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
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
      {title.toUpperCase()}
    </Text>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const { colors, spacing, typography } = useTheme();
  const isCredit =
    tx.type === 'spin_win' ||
    tx.type === 'daily_bonus' ||
    tx.type === 'ad_reward' ||
    tx.type === 'purchase' ||
    tx.type === 'refund' ||
    tx.type === 'admin_credit';
  const amountColor = isCredit ? colors.semantic.win : colors.semantic.error;
  const prefix = isCredit ? '+' : '−';

  return (
    <View
      style={[
        styles.txRow,
        {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomColor: colors.border.default,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.txLeft}>
        <Text style={{ ...typography.body, color: colors.text.primary }}>
          {TRANSACTION_LABELS[tx.type] ?? tx.type}
        </Text>
        <Text style={{ ...typography.caption, color: colors.text.tertiary, marginTop: 2 }}>
          {formatTxDate(tx.createdAt)}
        </Text>
      </View>
      <Text style={{ ...typography.body, color: amountColor, fontWeight: '600' }}>
        {prefix}{formatCoins(tx.amount)}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colors, spacing, radius, typography } = useTheme();

  const userProfile = useSessionStore((s) => s.userProfile);
  const linkedEmail = useSessionStore((s) => s.linkedEmail);
  const isAnonymous = useSessionStore((s) => s.isAnonymous);
  const achievements = useSessionStore((s) => s.achievements);
  const fetchAchievements = useSessionStore((s) => s.fetchAchievements);

  const spinCount = useGameStore((s) => s.spinCount);
  const totalSessionWins = useGameStore((s) => s.totalSessionWins);
  const totalSessionLosses = useGameStore((s) => s.totalSessionLosses);

  const balance = useWalletStore((s) => s.balance);
  const transactions = useWalletStore((s) => s.transactions);
  const fetchTransactions = useWalletStore((s) => s.fetchTransactions);

  useEffect(() => {
    void fetchAchievements();
    void fetchTransactions(50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // userProfile has id/created_at/updated_at — derive display name from user id
  const username = userProfile ? `Player_${userProfile.id.slice(0, 6)}` : 'Player';
  const initials = getInitials(username);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg.primary }]} edges={['top']}>
      <ScreenHeader title="Profile" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Avatar & identity ── */}
        <View
          style={[
            styles.hero,
            { backgroundColor: colors.bg.card, borderBottomColor: colors.border.default },
          ]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.gold.primary, borderRadius: radius.full },
            ]}
          >
            <Text style={{ ...typography.headline, color: colors.bg.machine, fontWeight: '700' }}>
              {initials}
            </Text>
          </View>

          <Text style={{ ...typography.title, color: colors.text.primary, fontWeight: '700', marginTop: 4 }}>
            {username}
          </Text>

          {isAnonymous ? (
            <Text style={{ ...typography.caption, color: colors.text.tertiary, marginTop: 2 }}>
              Guest Account
            </Text>
          ) : (
            <Text style={{ ...typography.caption, color: colors.text.secondary, marginTop: 2 }}>
              {linkedEmail}
            </Text>
          )}

          <Text style={{ ...typography.display, color: colors.gold.primary, fontWeight: '700', marginTop: 16 }}>
            {formatCoins(balance)}
          </Text>
          <Text style={{ ...typography.caption, color: colors.text.tertiary, marginTop: 2 }}>
            coins
          </Text>
        </View>

        {/* ── Session stats ── */}
        <SectionLabel title="This Session" />
        <View style={[styles.statsRow, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
          <StatCard label="Spins" value={String(spinCount)} icon="refresh-outline" />
          <StatCard
            label="Won"
            value={formatCoins(totalSessionWins)}
            icon="trending-up-outline"
            valueColor={colors.semantic.win}
          />
          <StatCard
            label="Lost"
            value={formatCoins(totalSessionLosses)}
            icon="trending-down-outline"
            valueColor={colors.semantic.error}
          />
        </View>

        {/* ── Achievements ── */}
        <SectionLabel title="Achievements" />
        <View
          style={[
            styles.listBox,
            {
              marginHorizontal: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: colors.bg.card,
              borderColor: colors.border.default,
            },
          ]}
        >
          {achievements.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                { ...typography.body, color: colors.text.tertiary },
              ]}
            >
              No achievements yet — keep spinning!
            </Text>
          ) : (
            <FlatList
              data={achievements}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const def = getAchievementDef(item.achievement_type);
                return (
                  <View
                    style={[
                      styles.achievementRow,
                      {
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.md,
                        borderBottomColor: colors.border.default,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <Text style={styles.achievementEmoji}>{def.emoji}</Text>
                    <View style={styles.achievementInfo}>
                      <Text style={{ ...typography.body, color: colors.text.primary, fontWeight: '600' }}>
                        {def.title}
                      </Text>
                      <Text style={{ ...typography.caption, color: colors.text.tertiary, marginTop: 2 }}>
                        {def.description}
                      </Text>
                      <Text style={{ ...typography.caption, color: colors.text.tertiary, marginTop: 2 }}>
                        {new Date(item.unlocked_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>

        {/* ── Transaction history ── */}
        <SectionLabel title="Transaction History" />
        <View
          style={[
            styles.listBox,
            {
              marginHorizontal: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: colors.bg.card,
              borderColor: colors.border.default,
            },
          ]}
        >
          {transactions.length === 0 ? (
            <Text style={[styles.emptyText, { ...typography.body, color: colors.text.tertiary }]}>
              No transactions yet
            </Text>
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => <TransactionRow tx={item} />}
            />
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row' },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8 },
  listBox: { borderWidth: 1, overflow: 'hidden' },
  achievementRow: { flexDirection: 'row', alignItems: 'center' },
  achievementEmoji: { fontSize: 24, marginRight: 12 },
  achievementInfo: { flex: 1 },
  txRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  txLeft: { flex: 1, marginRight: 12 },
  emptyText: { textAlign: 'center', padding: 24 },
});
