/**
 * AchievementService
 *
 * Thin wrapper around sessionSlice.unlockAchievement() that also
 * queues the celebration modal via uiSlice.
 *
 * Usage:
 *   await AchievementService.unlock('first_spin');
 *   await AchievementService.checkSpinMilestones(spinCount);
 *
 * Safe to call redundantly — no-ops if the achievement is already unlocked.
 */

import { useSessionStore } from '../stores/sessionSlice';
import { useUIStore } from '../stores/uiSlice';

export class AchievementService {
  /**
   * Unlock a single achievement by type.
   * Writes to Supabase, updates the local set, and queues the modal.
   */
  static async unlock(type: string): Promise<void> {
    const { checkAchievementUnlocked, unlockAchievement } = useSessionStore.getState();
    const { queueModal } = useUIStore.getState();

    // Already unlocked — skip silently
    if (checkAchievementUnlocked(type)) return;

    await unlockAchievement(type);

    // Queue the in-game celebration (will show after any active modal dismisses)
    queueModal('achievement', { achievementType: type });
  }

  /**
   * Check spin-count milestones after each spin.
   * Only fires at exact milestone boundaries.
   */
  static async checkSpinMilestones(spinCount: number): Promise<void> {
    if (spinCount === 1) {
      await AchievementService.unlock('first_spin');
    } else if (spinCount === 10) {
      await AchievementService.unlock('spin_10');
    } else if (spinCount === 100) {
      await AchievementService.unlock('spin_100');
    } else if (spinCount === 1000) {
      await AchievementService.unlock('spin_1000');
    }
  }
}
