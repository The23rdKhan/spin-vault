/**
 * JackpotModal — Full-screen jackpot celebration
 *
 * Shown when isJackpotWin === true. Full-screen with big fanfare Lottie.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LottieView from 'lottie-react-native';

import { useTheme } from '../../theme/useTheme';
import { useUIStore } from '../../stores/uiSlice';
import { useGameStore } from '../../stores/gameSlice';
import { formatCoins } from '../../utils/formatCoins';
import { BaseModal } from './BaseModal';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const JACKPOT_LOTTIE = require('../../assets/lottie/jackpot.json');

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface JackpotModalProps {
  visible: boolean;
}

export function JackpotModal({ visible }: JackpotModalProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const hideModal = useUIStore((s) => s.hideModal);
  const modalData = useUIStore((s) => s.modalData);
  const completeWinCycle = useGameStore((s) => s.completeWinCycle);
  const phase = useGameStore((s) => s.phase);

  const jackpotAmount = modalData?.jackpotAmount ?? 0n;

  // Show dismiss button after 2 seconds
  const [canDismiss, setCanDismiss] = useState(false);
  useEffect(() => {
    if (visible) {
      setCanDismiss(false);
      const timer = setTimeout(() => setCanDismiss(true), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible]);

  function handleDismiss() {
    hideModal();
    if (phase === 'celebrating') {
      completeWinCycle();
    }
  }

  return (
    <BaseModal visible={visible} onDismiss={handleDismiss} dismissOnBackdrop={false} fullScreen>
      <View style={styles.container}>
        <LottieView
          source={JACKPOT_LOTTIE}
          autoPlay
          loop
          style={styles.lottie}
        />

        <Text style={[styles.jackpotLabel, { ...typography.display, color: colors.jackpot.purple }]}>
          JACKPOT!
        </Text>

        <Text style={[styles.amount, { ...typography.headline, color: colors.gold.primary }]}>
          {formatCoins(jackpotAmount)}
        </Text>
        <Text style={[styles.coins, { ...typography.body, color: colors.text.secondary }]}>
          coins
        </Text>

        {canDismiss && (
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.8}
            style={[
              styles.button,
              {
                backgroundColor: colors.jackpot.purple,
                borderRadius: radius.lg,
                marginTop: spacing['2xl'],
                paddingVertical: spacing.md,
                paddingHorizontal: spacing['2xl'],
              },
            ]}
          >
            <Text style={[styles.buttonText, { ...typography.title, color: colors.text.inverse }]}>
              AMAZING!
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </BaseModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: 280,
    height: 280,
  },
  jackpotLabel: {
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 16,
  },
  amount: {
    marginTop: 8,
    fontWeight: '700',
  },
  coins: {
    marginTop: 4,
  },
  button: {
    alignItems: 'center',
  },
  buttonText: {
    letterSpacing: 1,
  },
});

export default JackpotModal;
