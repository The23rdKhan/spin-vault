/**
 * Settings Screen
 *
 * Audio, haptics, notifications, display, privacy, and account settings.
 * All changes sync to Supabase via settingsSlice.
 */

import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../src/theme/useTheme';
import { useSettingsStore } from '../../src/stores/settingsSlice';
import type { HapticIntensity } from '../../src/stores/settingsSlice';
import { useSessionStore } from '../../src/stores/sessionSlice';
import { useUIStore } from '../../src/stores/uiSlice';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SettingsRow } from '../../src/components/SettingsRow';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import Icon from '../../src/components/Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Section header helper
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text
      style={[
        styles.sectionHeader,
        {
          ...typography.label,
          color: colors.text.tertiary,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
          paddingBottom: spacing.sm,
          backgroundColor: colors.bg.primary,
        },
      ]}
    >
      {title.toUpperCase()}
    </Text>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: colors.bg.elevated,
          marginHorizontal: spacing.lg,
          borderRadius: radius.lg,
          borderColor: colors.border.default,
        },
      ]}
    >
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Volume steps helper
// ─────────────────────────────────────────────────────────────────────────────

const VOLUME_OPTIONS = ['25%', '50%', '75%', '100%'];
const VOLUME_VALUES: Record<string, number> = {
  '25%': 0.25,
  '50%': 0.5,
  '75%': 0.75,
  '100%': 1.0,
};

function volumeToOption(v: number): string {
  const pct = Math.round(v * 100);
  if (pct <= 25) return '25%';
  if (pct <= 50) return '50%';
  if (pct <= 75) return '75%';
  return '100%';
}

const HAPTIC_OPTIONS: HapticIntensity[] = ['light', 'medium', 'heavy'];
const HAPTIC_LABELS = ['Light', 'Medium', 'Heavy'];

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { colors } = useTheme();

  // Settings store
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const musicEnabled = useSettingsStore((s) => s.musicEnabled);
  const soundVolume = useSettingsStore((s) => s.soundVolume);
  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const hapticIntensity = useSettingsStore((s) => s.hapticIntensity);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const reduceMotionOverride = useSettingsStore((s) => s.reduceMotionOverride);
  const highContrast = useSettingsStore((s) => s.highContrast);
  const analyticsEnabled = useSettingsStore((s) => s.analyticsEnabled);
  const crashReportingEnabled = useSettingsStore((s) => s.crashReportingEnabled);
  const getReduceMotion = useSettingsStore((s) => s.getReduceMotion);

  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleMusic = useSettingsStore((s) => s.toggleMusic);
  const toggleHaptics = useSettingsStore((s) => s.toggleHaptics);
  const setSoundVolume = useSettingsStore((s) => s.setSoundVolume);
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume);
  const setHapticIntensity = useSettingsStore((s) => s.setHapticIntensity);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const setReduceMotion = useSettingsStore((s) => s.setReduceMotion);
  const clearReduceMotionOverride = useSettingsStore((s) => s.clearReduceMotionOverride);
  const setHighContrast = (v: boolean) => { useSettingsStore.setState({ highContrast: v }); };
  const setAnalytics = (v: boolean) => { useSettingsStore.setState({ analyticsEnabled: v }); };
  const setCrashReporting = (v: boolean) => { useSettingsStore.setState({ crashReportingEnabled: v }); };

  // Session store
  const linkedEmail = useSessionStore((s) => s.linkedEmail);
  const isAnonymous = useSessionStore((s) => s.isAnonymous);

  // UI store
  const showModal = useUIStore((s) => s.showModal);
  const showInfo = useUIStore((s) => s.showInfo);

  const reduceMotionValue = getReduceMotion();
  const reduceMotionSubtitle =
    reduceMotionOverride === null ? 'Following system setting' : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg.primary }]} edges={['top']}>
      <ScreenHeader title="Settings" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Audio ── */}
        <SectionHeader title="Audio" />
        <SectionCard>
          <SettingsRow
            label="Sound Effects"
            right={<Switch value={soundEnabled} onValueChange={toggleSound} trackColor={{ true: colors.gold.primary }} />}
          />
          <SettingsRow
            label="Sound Volume"
            right={
              <SegmentedControl
                options={VOLUME_OPTIONS}
                value={volumeToOption(soundVolume)}
                onChange={(v) => setSoundVolume(VOLUME_VALUES[v] ?? 1)}
                disabled={!soundEnabled}
              />
            }
          />
          <SettingsRow
            label="Music"
            right={<Switch value={musicEnabled} onValueChange={toggleMusic} trackColor={{ true: colors.gold.primary }} />}
          />
          <SettingsRow
            label="Music Volume"
            showSeparator={false}
            right={
              <SegmentedControl
                options={VOLUME_OPTIONS}
                value={volumeToOption(musicVolume)}
                onChange={(v) => setMusicVolume(VOLUME_VALUES[v] ?? 1)}
                disabled={!musicEnabled}
              />
            }
          />
        </SectionCard>

        {/* ── Haptics ── */}
        <SectionHeader title="Haptics" />
        <SectionCard>
          <SettingsRow
            label="Haptic Feedback"
            right={<Switch value={hapticsEnabled} onValueChange={toggleHaptics} trackColor={{ true: colors.gold.primary }} />}
          />
          <SettingsRow
            label="Intensity"
            showSeparator={false}
            right={
              <SegmentedControl
                options={HAPTIC_LABELS}
                value={HAPTIC_LABELS[HAPTIC_OPTIONS.indexOf(hapticIntensity)] ?? 'Medium'}
                onChange={(label) => {
                  const idx = HAPTIC_LABELS.indexOf(label);
                  if (idx !== -1) setHapticIntensity(HAPTIC_OPTIONS[idx] ?? 'medium');
                }}
                disabled={!hapticsEnabled}
              />
            }
          />
        </SectionCard>

        {/* ── Notifications ── */}
        <SectionHeader title="Notifications" />
        <SectionCard>
          <SettingsRow
            label="Daily Reminder"
            subtitle="Get reminded to claim your daily bonus"
            showSeparator={false}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ true: colors.gold.primary }}
              />
            }
          />
        </SectionCard>

        {/* ── Display ── */}
        <SectionHeader title="Display" />
        <SectionCard>
          <SettingsRow
            label="Reduce Motion"
            subtitle={reduceMotionSubtitle}
            right={
              <Switch
                value={reduceMotionValue}
                onValueChange={(v) => {
                  if (v === false && reduceMotionOverride === null) {
                    // Only override if user is explicitly turning it off
                    setReduceMotion(false);
                  } else {
                    setReduceMotion(v);
                  }
                }}
                trackColor={{ true: colors.gold.primary }}
              />
            }
          />
          {reduceMotionOverride !== null && (
            <SettingsRow
              label="Reset to system default"
              onPress={clearReduceMotionOverride}
              right={<Icon name="refresh-outline" size={18} variant="muted" />}
            />
          )}
          <SettingsRow
            label="High Contrast"
            showSeparator={false}
            right={
              <Switch
                value={highContrast}
                onValueChange={setHighContrast}
                trackColor={{ true: colors.gold.primary }}
              />
            }
          />
        </SectionCard>

        {/* ── Privacy ── */}
        <SectionHeader title="Privacy" />
        <SectionCard>
          <SettingsRow
            label="Analytics"
            subtitle="Help improve the app with anonymous usage data"
            right={
              <Switch
                value={analyticsEnabled}
                onValueChange={setAnalytics}
                trackColor={{ true: colors.gold.primary }}
              />
            }
          />
          <SettingsRow
            label="Crash Reporting"
            subtitle="Automatically send crash reports"
            showSeparator={false}
            right={
              <Switch
                value={crashReportingEnabled}
                onValueChange={setCrashReporting}
                trackColor={{ true: colors.gold.primary }}
              />
            }
          />
        </SectionCard>

        {/* ── Account ── */}
        <SectionHeader title="Account" />
        <SectionCard>
          <SettingsRow
            label={isAnonymous ? 'Anonymous Account' : (linkedEmail ?? 'Linked Account')}
            subtitle={isAnonymous ? 'Link an account to save your progress' : 'Your account is linked'}
            right={
              isAnonymous
                ? <Icon name="warning-outline" size={18} variant="muted" />
                : <Icon name="checkmark-circle-outline" size={18} variant="win" />
            }
          />
          <SettingsRow
            label="Link Email"
            onPress={() => showModal('link_account')}
            right={<Icon name="chevron-forward-outline" size={18} variant="muted" />}
          />
          <SettingsRow
            label="Link Google"
            onPress={() => showModal('link_account')}
            right={<Icon name="chevron-forward-outline" size={18} variant="muted" />}
          />
          <SettingsRow
            label="Link Apple"
            onPress={() => showModal('link_account')}
            right={<Icon name="chevron-forward-outline" size={18} variant="muted" />}
            showSeparator={false}
          />
        </SectionCard>

        {/* ── Danger zone ── */}
        <SectionHeader title="Danger Zone" />
        <SectionCard>
          <SettingsRow
            label="Delete Account"
            danger
            onPress={() => showModal('delete_account')}
            right={<Icon name="chevron-forward-outline" size={18} variant="error" />}
            showSeparator={false}
          />
        </SectionCard>

        {/* Bottom padding */}
        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  sectionHeader: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  bottomPad: { height: 32 },
});
