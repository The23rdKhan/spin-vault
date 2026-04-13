/**
 * FreeSpinsModal — Free spins start / end
 *
 * Handles both 'free_spins_start' and 'free_spins_end' modal types.
 * Variant is determined by the active modal type in uiSlice.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { useUIStore } from '../../stores/uiSlice';
import { useGameStore } from '../../stores/gameSlice';
import { formatCoins } from '../../utils/formatCoins';
import { BaseModal } from './BaseModal';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface FreeSpinsModalProps {
  visible: boolean;
  variant: 'start' | 'end';
}

export function FreeSpinsModal({ visible, variant }: FreeSpinsModalProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const hideModal = useUIStore((s) => s.hideModal);
  const modalData = useUIStore((s) => s.modalData);
  const endFreeSpins = useGameStore((s) => s.endFreeSpins);
  const freeSpinsTotalWin = useGameStore((s) => s.freeSpinsTotalWin);

  const freeSpinsCount = modalData?.freeSpinsCount ?? 0;

  function handleDismiss() {
    hideModal();
    if (variant === 'end') {
      endFreeSpins();
    }
  }

  const isStart = variant === 'start';

  return (
    <BaseModal visible={visible} onDismiss={handleDismiss} dismissOnBackdrop={false}>
      <View style={styles.container}>
        {/* Icon emoji */}
        <Text style={styles.emoji}>{isStart ? '🎰' : '🎉'}</Text>

        {/* Title */}
        <Text
          style={[
            styles.title,
            {
              ...typography.headline,
              color: isStart ? colors.jackpot.purple : colors.semantic.win,
            },
          ]}
        >
          {isStart ? 'FREE SPINS!' : 'Free Spins Done!'}
        </Text>

        {/* Body */}
        {isStart ? (
          <Text style={[styles.body, { ...typography.display, color: colors.text.primary }]}>
            {freeSpinsCount}
          </Text>
        ) : (
          <Text style={[styles.amount, { ...typography.display, color: colors.semantic.win }]}>
            {formatCoins(freeSpinsTotalWin)}
          </Text>
        )}

        <Text style={[styles.subtitle, { ...typography.body, color: colors.text.secondary }]}>
          {isStart ? 'free spins awarded!' : 'total coins won'}
        </Text>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleDismiss}
          activeOpacity={0.8}
          style={[
            styles.button,
            {
              backgroundColor: isStart ? colors.jackpot.purple : colors.semantic.win,
              borderRadius: radius.lg,
              marginTop: spacing.xl,
              paddingVertical: spacing.md,
            },
          ]}
        >
          <Text style={[styles.buttonText, { ...typography.title, color: colors.text.inverse }]}>
            {isStart ? "LET'S GO!" : 'AWESOME!'}
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
  emoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  body: {
    fontWeight: '700',
    marginTop: 8,
  },
  amount: {
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    marginTop: 4,
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    letterSpacing: 1,
  },
});

export default FreeSpinsModal;
