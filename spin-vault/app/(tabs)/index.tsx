/**
 * Play Screen — Main slot machine gameplay screen
 *
 * Assembles all game UI components and manages phase-driven side effects:
 * win modals, error handling, daily bonus prompt, auto-spin.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { useTheme } from '../../src/theme/useTheme';
import { useGameStore } from '../../src/stores/gameSlice';
import { useWalletStore } from '../../src/stores/walletSlice';
import { useUIStore } from '../../src/stores/uiSlice';
import { AchievementService } from '../../src/services/AchievementService';
import { HapticService } from '../../src/services/HapticService';
import { SoundService } from '../../src/services/SoundService';

import { BalanceBar } from '../../src/components/game/BalanceBar';
import { BetSelector } from '../../src/components/game/BetSelector';
import { SlotMachine } from '../../src/components/game/SlotMachine';
import { SpinButton } from '../../src/components/game/SpinButton';
import { WinDisplay } from '../../src/components/game/WinDisplay';

export default function PlayScreen() {
  const { colors, spacing } = useTheme();

  // Game state
  const phase = useGameStore((s) => s.phase);
  const error = useGameStore((s) => s.error);
  const isJackpotWin = useGameStore((s) => s.isJackpotWin);
  const currentWin = useGameStore((s) => s.currentWin);
  const spinCount = useGameStore((s) => s.spinCount);
  const freeSpinsRemaining = useGameStore((s) => s.freeSpinsRemaining);
  const freeSpinsTotal = useGameStore((s) => s.freeSpinsTotal);
  const completeWinCycle = useGameStore((s) => s.completeWinCycle);
  const isAutoSpinEnabled = useGameStore((s) => s.isAutoSpinEnabled);
  const autoSpinCount = useGameStore((s) => s.autoSpinCount);
  const requestSpin = useGameStore((s) => s.requestSpin);

  // Wallet
  const fetchBalance = useWalletStore((s) => s.fetchBalance);
  const canClaimDaily = useWalletStore((s) => s.canClaimDaily);
  const checkDailyBonusEligibility = useWalletStore((s) => s.checkDailyBonusEligibility);

  // UI
  const showModal = useUIStore((s) => s.showModal);

  // Track previous free spins phase entry to show modal only once
  const prevFreeSpinsEntryRef = useRef(false);
  // Track win cycle timeout
  const winCycleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Mount: fetch balance + check daily bonus ──────────────────────────────
  useEffect(() => {
    void fetchBalance();
    checkDailyBonusEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Android back button — confirm exit ───────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        showModal('confirm_exit');
        return true; // prevent default OS exit
      });
      return () => subscription.remove();
    }, [showModal]),
  );

  // ─── Spin milestones ──────────────────────────────────────────────────────
  useEffect(() => {
    if (spinCount > 0) {
      void AchievementService.checkSpinMilestones(spinCount);
    }
  }, [spinCount]);

  // ─── Daily bonus prompt ────────────────────────────────────────────────────
  useEffect(() => {
    if (canClaimDaily) {
      showModal('daily_bonus');
    }
  }, [canClaimDaily, showModal]);

  // ─── Haptics + Sounds on phase change ─────────────────────────────────────
  useEffect(() => {
    switch (phase) {
      case 'spinning':
        void HapticService.spinStart();
        SoundService.spinStart();
        break;
      case 'celebrating':
        if (isJackpotWin) {
          void HapticService.jackpot();
          SoundService.jackpot();
        } else if (currentWin > 0n) {
          void HapticService.win();
          SoundService.win();
        }
        break;
      default:
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── Phase side-effects ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'celebrating') {
      // Clear any previous timeout
      if (winCycleTimeoutRef.current) {
        clearTimeout(winCycleTimeoutRef.current);
      }

      // Show win / jackpot modal
      if (isJackpotWin) {
        showModal('jackpot', { jackpotAmount: currentWin });
      } else if (currentWin > 0n) {
        showModal('win_celebration', { winAmount: currentWin });
      }

      // Auto-advance after 3s even if modal isn't interacted with
      winCycleTimeoutRef.current = setTimeout(() => {
        completeWinCycle();
      }, 3000);

      // Achievement triggers
      if (currentWin > 0n) {
        void AchievementService.unlock('first_win');
      }
      if (isJackpotWin) {
        void AchievementService.unlock('jackpot');
      }
      if (currentWin >= 100_000n) {
        void AchievementService.unlock('big_win');
      }
    }

    // Free spins entry modal — show only once per free spins session
    if (phase === 'free_spins') {
      if (!prevFreeSpinsEntryRef.current && freeSpinsRemaining === freeSpinsTotal && freeSpinsTotal > 0) {
        prevFreeSpinsEntryRef.current = true;
        showModal('free_spins_start', { freeSpinsCount: freeSpinsRemaining });
        void AchievementService.unlock('free_spins');
      }
    } else {
      prevFreeSpinsEntryRef.current = false;
    }

    // Auto-spin: trigger next spin when returning to idle
    let autoSpinTimeout: ReturnType<typeof setTimeout> | null = null;
    if (phase === 'idle' && isAutoSpinEnabled && autoSpinCount > 0) {
      autoSpinTimeout = setTimeout(() => {
        void requestSpin();
      }, 300);
    }

    // Single cleanup covers both timeouts
    return () => {
      if (autoSpinTimeout) clearTimeout(autoSpinTimeout);
      if (winCycleTimeoutRef.current) clearTimeout(winCycleTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── Error handling ────────────────────────────────────────────────────────
  useEffect(() => {
    if (error) {
      if (error === 'Insufficient coins') {
        showModal('insufficient_coins');
      } else {
        showModal('error', { errorMessage: error });
      }
    }
  }, [error, showModal]);

  const isActive = phase === 'spinning' || phase === 'revealing' || phase === 'celebrating';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]} edges={['top']}>
      {/* Balance strip */}
      <BalanceBar />

      {/* Main content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.content, { gap: spacing.xl }]}>
          {/* The machine */}
          <SlotMachine />

          {/* Win display (conditionally visible) */}
          <WinDisplay />

          {/* Bet controls */}
          <BetSelector disabled={isActive} />

          {/* Spin CTA */}
          <SpinButton />

          {/* Bottom padding */}
          <View style={{ height: spacing.xl }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 24,
  },
});
