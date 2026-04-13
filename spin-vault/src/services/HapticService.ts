/**
 * HapticService — Haptic feedback wrapper
 *
 * Thin wrapper over expo-haptics. Always reads settingsSlice at call time
 * so it reacts to live setting changes without subscribing.
 * All methods are safe to call on any platform — expo-haptics no-ops on web.
 */

import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '../stores/settingsSlice';
import type { HapticIntensity } from '../stores/settingsSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getImpactStyle(intensity: HapticIntensity): Haptics.ImpactFeedbackStyle {
  switch (intensity) {
    case 'light':
      return Haptics.ImpactFeedbackStyle.Light;
    case 'heavy':
      return Haptics.ImpactFeedbackStyle.Heavy;
    case 'medium':
    default:
      return Haptics.ImpactFeedbackStyle.Medium;
  }
}

function isEnabled(): boolean {
  return useSettingsStore.getState().hapticsEnabled;
}

function intensity(): HapticIntensity {
  return useSettingsStore.getState().hapticIntensity;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

async function spinStart(): Promise<void> {
  if (!isEnabled()) return;
  await Haptics.impactAsync(getImpactStyle(intensity()));
}

async function reelStop(): Promise<void> {
  if (!isEnabled()) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

async function win(): Promise<void> {
  if (!isEnabled()) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

async function jackpot(): Promise<void> {
  if (!isEnabled()) return;
  // Three heavy pulses 300ms apart — await each so promise resolves after all fire
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

async function error(): Promise<void> {
  if (!isEnabled()) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

async function buttonTap(): Promise<void> {
  if (!isEnabled()) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export const HapticService = {
  spinStart,
  reelStop,
  win,
  jackpot,
  error,
  buttonTap,
};

export default HapticService;
