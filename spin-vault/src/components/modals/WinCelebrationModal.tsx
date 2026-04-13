/**
 * WinCelebrationModal — Shown when currentWin > 0 after a spin
 *
 * Displays win amount with a Lottie animation and a COLLECT button.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LottieView from 'lottie-react-native';

import { useTheme } from '../../theme/useTheme';
import { useUIStore } from '../../stores/uiSlice';
import { useGameStore } from '../../stores/gameSlice';
import { formatCoins } from '../../utils/formatCoins';
import { BaseModal } from './BaseModal';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WIN_LOTTIE = require('../../assets/lottie/win.json');

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface WinCelebrationModalProps {
  visible: boolean;
}

export function WinCelebrationModal({ visible }: WinCelebrationModalProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const hideModal = useUIStore((s) => s.hideModal);
  const modalData = useUIStore((s) => s.modalData);
  const completeWinCycle = useGameStore((s) => s.completeWinCycle);
  const phase = useGameStore((s) => s.phase);

  const winAmount = modalData?.winAmount ?? 0n;

  function handleCollect() {
    hideModal();
    if (phase === 'celebrating') {
      completeWinCycle();
    }
  }

  return (
    <BaseModal visible={visible} onDismiss={handleCollect} dismissOnBackdrop={false}>
      <View style={styles.container}>
        {/* Lottie animation */}
        <LottieView
          source={WIN_LOTTIE}
          autoPlay
          loop={false}
          style={styles.lottie}
        />

        {/* Labels */}
        <Text style={[styles.label, { ...typography.label, color: colors.text.tertiary }]}>
          YOU WON
        </Text>
        <Text
          style={[styles.amount, { ...typography.display, color: colors.semantic.win }]}
        >
          {formatCoins(winAmount)}
        </Text>
        <Text style={[styles.coins, { ...typography.caption, color: colors.text.secondary }]}>
          coins
        </Text>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleCollect}
          activeOpacity={0.8}
          style={[
            styles.button,
            {
              backgroundColor: colors.gold.primary,
              borderRadius: radius.lg,
              marginTop: spacing.xl,
              paddingVertical: spacing.md,
            },
          ]}
        >
          <Text style={[styles.buttonText, { ...typography.title, color: colors.bg.machine }]}>
            COLLECT
          </Text>
        </TouchableOpacity>
      </View>
    </BaseModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  lottie: {
    width: 160,
    height: 160,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 8,
  },
  amount: {
    marginTop: 4,
    fontWeight: '700',
  },
  coins: {
    marginTop: 2,
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    letterSpacing: 1,
  },
});

export default WinCelebrationModal;
