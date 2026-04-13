/**
 * Events Screen
 *
 * Session stats summary, active event cards with progress bars, and a
 * "coming soon" section for live tournaments.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useGameStore } from '../../src/stores/gameSlice';
import { useUIStore } from '../../src/stores/uiSlice';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StatCard } from '../../src/components/StatCard';
import { formatCoins } from '../../src/utils/formatCoins';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

// ─────────────────────────────────────────────────────────────────────────────
// Event card data
// ─────────────────────────────────────────────────────────────────────────────

interface EventDef {
  id: string;
  title: string;
  description: string;
  icon: IoniconsName;
  goal: number;
  getProgress: (spinCount: number) => number;
}

// Progress bar component
function ProgressBar({ progress, goal }: { progress: number; goal: number }) {
  const { colors, radius } = useTheme();
  const pct = goal > 0 ? Math.min(progress / goal, 1) : 0;
  const width = useSharedValue(0);

  // Animate on mount
  React.useEffect(() => {
    width.value = withTiming(pct, { duration: 800 });
  }, [pct, width]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as `${number}%`,
  }));

  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.bg.primary, borderRadius: radius.full }]}>
      <Animated.View
        style={[
          styles.progressFill,
          { backgroundColor: colors.gold.primary, borderRadius: radius.full },
          animStyle,
        ]}
      />
    </View>
  );
}

// Event card
function EventCard({ event, spinCount }: { event: EventDef; spinCount: number }) {
  const { colors, spacing, radius, typography } = useTheme();
  const progress = event.getProgress(spinCount);
  const isComplete = event.goal > 0 && progress >= event.goal;

  return (
    <View
      style={[
        styles.eventCard,
        {
          backgroundColor: colors.bg.card,
          borderColor: isComplete ? colors.semantic.win : colors.border.default,
          borderRadius: radius.lg,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.eventHeader}>
        <View
          style={[
            styles.eventIconBg,
            {
              backgroundColor: isComplete ? colors.semantic.win : colors.gold.light,
              borderRadius: radius.md,
            },
          ]}
        >
          <Ionicons
            name={event.icon}
            size={20}
            color={isComplete ? colors.text.inverse : colors.gold.primary}
          />
        </View>
        <View style={styles.eventTitleGroup}>
          <Text style={{ ...typography.body, color: colors.text.primary, fontWeight: '600' }}>
            {event.title}
          </Text>
          <Text style={{ ...typography.caption, color: colors.text.secondary, marginTop: 2 }}>
            {event.description}
          </Text>
        </View>
        {isComplete && (
          <Ionicons name="checkmark-circle" size={20} color={colors.semantic.win} />
        )}
      </View>

      {event.goal > 0 && (
        <View style={styles.progressSection}>
          <ProgressBar progress={progress} goal={event.goal} />
          <Text style={{ ...typography.label, color: colors.text.tertiary, marginTop: 4 }}>
            {Math.min(progress, event.goal)} / {event.goal}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function EventsScreen() {
  const { colors, spacing, radius, typography } = useTheme();

  const spinCount = useGameStore((s) => s.spinCount);
  const totalSessionWins = useGameStore((s) => s.totalSessionWins);
  const totalSessionLosses = useGameStore((s) => s.totalSessionLosses);
  const resetSessionStats = useGameStore((s) => s.resetSessionStats);
  const showInfo = useUIStore((s) => s.showInfo);

  const events: EventDef[] = [
    {
      id: 'daily_spins',
      title: 'Daily Spin Challenge',
      description: 'Spin 50 times today',
      icon: 'flash-outline',
      goal: 50,
      getProgress: (s) => s,
    },
    {
      id: 'lucky_sevens',
      title: 'Lucky Sevens',
      description: 'Land triple 7s',
      icon: 'star-outline',
      goal: 1,
      getProgress: () => 0,
    },
    {
      id: 'weekend_jackpot',
      title: 'Weekend Jackpot',
      description: 'Jackpot prizes doubled this weekend',
      icon: 'trophy-outline',
      goal: 0,
      getProgress: () => 0,
    },
  ];

  const total = totalSessionWins + totalSessionLosses;
  const winRatePct = total > 0n ? Math.round((Number(totalSessionWins) / Number(total)) * 100) : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg.primary }]} edges={['top']}>
      <ScreenHeader title="Events" subtitle="Challenges & tournaments" />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Session Stats ── */}
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
          THIS SESSION
        </Text>

        <View style={[styles.statsRow, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
          <StatCard label="Spins" value={String(spinCount)} icon="refresh-outline" />
          <StatCard
            label="Won"
            value={formatCoins(totalSessionWins)}
            icon="trending-up-outline"
            valueColor={colors.semantic.win}
          />
          <StatCard label="Win Rate" value={`${winRatePct}%`} icon="analytics-outline" />
        </View>

        <TouchableOpacity
          onPress={resetSessionStats}
          activeOpacity={0.7}
          style={[styles.resetButton, { marginHorizontal: spacing.lg, marginTop: spacing.sm }]}
        >
          <Text style={{ ...typography.caption, color: colors.text.tertiary }}>
            Reset session stats
          </Text>
        </TouchableOpacity>

        {/* ── Active Events ── */}
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
          ACTIVE EVENTS
        </Text>

        <View style={[styles.eventList, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
          {events.map((event) => (
            <EventCard key={event.id} event={event} spinCount={spinCount} />
          ))}
        </View>

        {/* ── Coming Soon ── */}
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
          COMING SOON
        </Text>

        <TouchableOpacity
          onPress={() => showInfo('Tournaments coming in a future update!')}
          activeOpacity={0.85}
          style={[
            styles.comingSoonCard,
            {
              marginHorizontal: spacing.lg,
              backgroundColor: colors.bg.card,
              borderColor: colors.border.default,
              borderRadius: radius.lg,
              padding: spacing.xl,
            },
          ]}
        >
          <Ionicons name="podium-outline" size={32} color={colors.text.tertiary} />
          <Text
            style={{
              ...typography.title,
              color: colors.text.secondary,
              fontWeight: '600',
              marginTop: spacing.sm,
              textAlign: 'center',
            }}
          >
            Tournaments
          </Text>
          <Text
            style={{
              ...typography.body,
              color: colors.text.tertiary,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            Live events and leaderboards coming in a future update
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8 },
  statsRow: { flexDirection: 'row' },
  resetButton: { alignSelf: 'flex-end' },
  eventList: {},
  eventCard: { borderWidth: 1 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventIconBg: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventTitleGroup: { flex: 1 },
  progressSection: { marginTop: 10 },
  progressTrack: { height: 6, overflow: 'hidden' },
  progressFill: { height: '100%' },
  comingSoonCard: { alignItems: 'center', borderWidth: 1 },
});
