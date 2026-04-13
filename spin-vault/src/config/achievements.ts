/**
 * Achievement Definitions
 *
 * Central map from achievement_type string (stored in Supabase) →
 * display metadata. Used by AchievementModal, Profile screen, and
 * any future achievement-related UI.
 *
 * To add a new achievement: add a row here + call
 * AchievementService.unlock('your_type') at the right trigger point.
 */

import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementDef {
  type: string;
  title: string;
  description: string;
  emoji: string;
  icon: IoniconsName;
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const ACHIEVEMENT_DEFS: Record<string, AchievementDef> = {
  first_spin: {
    type: 'first_spin',
    title: 'First Spin',
    description: 'You spun the reels for the first time.',
    emoji: '🎰',
    icon: 'refresh-outline',
  },
  first_win: {
    type: 'first_win',
    title: 'First Win',
    description: 'You won coins for the first time.',
    emoji: '🏆',
    icon: 'trophy-outline',
  },
  jackpot: {
    type: 'jackpot',
    title: 'Jackpot!',
    description: 'Hit the jackpot and claimed the ultimate prize.',
    emoji: '💎',
    icon: 'diamond-outline',
  },
  spin_10: {
    type: 'spin_10',
    title: 'Getting Warmed Up',
    description: 'Spin the reels 10 times.',
    emoji: '🔥',
    icon: 'flame-outline',
  },
  spin_100: {
    type: 'spin_100',
    title: 'High Roller',
    description: 'Spin the reels 100 times.',
    emoji: '💫',
    icon: 'star-outline',
  },
  spin_1000: {
    type: 'spin_1000',
    title: 'Slot Veteran',
    description: 'Spin the reels 1,000 times.',
    emoji: '⚡',
    icon: 'flash-outline',
  },
  big_win: {
    type: 'big_win',
    title: 'Big Winner',
    description: 'Win 100,000+ coins in a single spin.',
    emoji: '💰',
    icon: 'cash-outline',
  },
  daily_bonus: {
    type: 'daily_bonus',
    title: 'Daily Devotee',
    description: 'Claimed your first daily bonus.',
    emoji: '🎁',
    icon: 'gift-outline',
  },
  free_spins: {
    type: 'free_spins',
    title: 'Free Rider',
    description: 'Triggered your first free spins round.',
    emoji: '🎡',
    icon: 'repeat-outline',
  },
  max_bet: {
    type: 'max_bet',
    title: 'All In',
    description: 'Placed a maximum bet.',
    emoji: '🤑',
    icon: 'trending-up-outline',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the definition for a given achievement type.
 * Falls back to a sensible default for unknown types so the UI
 * never crashes on server-side types not yet in this map.
 */
export function getAchievementDef(type: string): AchievementDef {
  return (
    ACHIEVEMENT_DEFS[type] ?? {
      type,
      title: type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      description: 'Achievement unlocked.',
      emoji: '🏅',
      icon: 'medal-outline' as IoniconsName,
    }
  );
}
