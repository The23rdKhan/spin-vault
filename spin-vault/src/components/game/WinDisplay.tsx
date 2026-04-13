/**
 * WinDisplay — Animated count-up win amount
 *
 * Fades in when currentWin > 0 in the 'celebrating' or 'revealing' phase,
 * counts up to the win amount, then fades out when returning to 'idle'.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/useTheme';
import { useGameStore } from '../../stores/gameSlice';
import { formatCoins } from '../../utils/formatCoins';
import Icon from '../Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function WinDisplay() {
  const { colors, spacing, typography } = useTheme();

  const currentWin = useGameStore((s) => s.currentWin);
  const isJackpotWin = useGameStore((s) => s.isJackpotWin);
  const phase = useGameStore((s) => s.phase);

  const displayOpacity = useSharedValue(0);
  const displayValue = useSharedValue(0);

  // JS-thread state for displaying the text
  const [displayedText, setDisplayedText] = useState('0');
  const prevPhaseRef = useRef(phase);

  // Update displayedText from animated value
  useAnimatedReaction(
    () => displayValue.value,
    (value) => {
      // Math.trunc avoids round-up overshoot; clamp to 0 prevents negative on reset
      const safe = Math.max(0, Math.trunc(value));
      runOnJS(setDisplayedText)(formatCoins(BigInt(safe)));
    }
  );

  useEffect(() => {
    const isVisible =
      (phase === 'celebrating' || phase === 'revealing') && currentWin > 0n;
    const wasVisible = prevPhaseRef.current !== 'idle' && currentWin > 0n;
    prevPhaseRef.current = phase;

    if (isVisible) {
      // Fade in
      displayOpacity.value = withTiming(1, { duration: 250 });
      // Count up
      displayValue.value = 0;
      displayValue.value = withTiming(Number(currentWin), {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });
    } else if (phase === 'idle') {
      // Fade out and reset
      displayOpacity.value = withTiming(0, { duration: 200 });
      displayValue.value = withTiming(0, { duration: 200 });
    }
  }, [phase, currentWin, displayOpacity, displayValue]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: displayOpacity.value,
  }));

  const winColor = isJackpotWin ? colors.jackpot.purple : colors.semantic.win;

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <View
        style={[
          styles.inner,
          {
            backgroundColor: colors.bg.card,
            borderRadius: 8,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderColor: winColor,
          },
        ]}
      >
        <Icon name="ellipse" size={14} color={colors.gold.primary} />
        <Text style={[styles.winLabel, { ...typography.label, color: colors.text.tertiary }]}>
          WIN
        </Text>
        <Text
          style={[
            styles.winAmount,
            isJackpotWin ? typography.headline : typography.title,
            { color: winColor },
          ]}
        >
          {displayedText}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minHeight: 52,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
  },
  winLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  winAmount: {
    fontWeight: '700',
  },
});

export default WinDisplay;
