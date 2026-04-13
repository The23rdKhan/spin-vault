/**
 * ModalHost — Single mount point for all modals
 *
 * Reads activeModal from uiSlice and renders the correct modal component.
 * Mount this once at the root layout level so modals float above all screens.
 */

import React from 'react';

import { useUIStore } from '../../stores/uiSlice';

import { AchievementModal } from './AchievementModal';
import { ConfirmExitModal } from './ConfirmExitModal';
import { DailyBonusModal } from './DailyBonusModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { ErrorModal } from './ErrorModal';
import { FreeSpinsModal } from './FreeSpinsModal';
import { InsufficientCoinsModal } from './InsufficientCoinsModal';
import { JackpotModal } from './JackpotModal';
import { LevelUpModal } from './LevelUpModal';
import { LinkAccountModal } from './LinkAccountModal';
import { WinCelebrationModal } from './WinCelebrationModal';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ModalHost() {
  const activeModal = useUIStore((s) => s.activeModal);

  return (
    <>
      <WinCelebrationModal visible={activeModal === 'win_celebration'} />
      <JackpotModal visible={activeModal === 'jackpot'} />
      <DailyBonusModal visible={activeModal === 'daily_bonus'} />
      <FreeSpinsModal visible={activeModal === 'free_spins_start'} variant="start" />
      <FreeSpinsModal visible={activeModal === 'free_spins_end'} variant="end" />
      <InsufficientCoinsModal visible={activeModal === 'insufficient_coins'} />
      <ErrorModal visible={activeModal === 'error'} />
      <DeleteAccountModal visible={activeModal === 'delete_account'} />
      <AchievementModal visible={activeModal === 'achievement'} />
      <LinkAccountModal visible={activeModal === 'link_account'} />
      <LevelUpModal visible={activeModal === 'level_up'} />
      <ConfirmExitModal visible={activeModal === 'confirm_exit'} />
    </>
  );
}

export default ModalHost;
