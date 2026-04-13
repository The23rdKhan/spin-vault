/**
 * SpinButton — Primary CTA for triggering a spin
 *
 * Phase-aware: shows SPIN / FREE SPIN / spinning states with a breathing
 * idle pulse and press-feedback scale animation (Reanimated 3).
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/useTheme';
import { useGameStore } from '../../stores/gameSlice';
import { useWalletStore } from '../../stores/walletSlice';
import { useUIStore } from '../../stores/uiSlice';
import Icon from '../Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SpinButton() {
  const { colors, radius, typography } = useTheme();

  const phase = useGameStore((s) => s.phase);
  const requestSpin = useGameStore((s) => s.requestSpin);
  const freeSpinsRemaining = useGameStore((s) => s.freeSpinsRemaining);
  const canAffordBet = useWalletStore((s) => s.canAffordBet);
  const showModal = useUIStore((s) => s.showModal);

  const scale = useSharedValue(1);

  const isIdle = phase === 'idle' || phase === 'free_spins' || phase === 'betting';
  const isActive = phase === 'spinning' || phase === 'revealing' || phase === 'celebrating';
  const isFreeSpinMode = freeSpinsRemaining > 0;

  // Breathing idle pulse
  useEffect(() => {
    if (isIdle) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 850 }),
          withTiming(1.0, { duration: 850 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(1.0, { duration: 150 });
    }
  }, [isIdle, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    if (!canAffordBet() && freeSpinsRemaining === 0) {
      showModal('insufficient_coins');
      return;
    }
    void requestSpin();
  }

  function handlePressIn() {
    scale.value = withSpring(0.94, { damping: 15, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1.0, { damping: 15, stiffness: 300 });
  }

  // Button bg color
  let bgColor: string = colors.gold.primary;
  if (isActive) bgColor = colors.text.tertiary;
  else if (isFreeSpinMode) bgColor = colors.jackpot.purple;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isActive}
        activeOpacity={1}
        style={[
          styles.button,
          {
            backgroundColor: bgColor,
            borderRadius: radius.full,
            width: 120,
            height: 120,
          },
        ]}
      >
        {isActive ? (
          // Spinning state — refresh icon
          <Icon name="refresh-outline" size={36} color={colors.text.inverse} />
        ) : isFreeSpinMode ? (
          // Free spin mode
          <View style={styles.freeSpinContent}>
            <Text style={[styles.freeLabel, { ...typography.label, color: colors.text.inverse }]}>
              FREE
            </Text>
            <Text style={[styles.spinLabel, { ...typography.title, color: colors.text.inverse }]}>
              SPIN
            </Text>
          </View>
        ) : (
          // Normal spin
          <Text style={[styles.spinLabel, { ...typography.title, color: colors.bg.machine }]}>
            SPIN
          </Text>
        )}
      </TouchableOpacity>

      {/* Free spins remaining badge */}
      {freeSpinsRemaining > 0 && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.semantic.win,
              borderRadius: radius.full,
            },
          ]}
        >
          <Text style={[styles.badgeText, { ...typography.label, color: colors.text.inverse }]}>
            {freeSpinsRemaining}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  button: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  spinLabel: {
    textAlign: 'center',
    letterSpacing: 1,
  },
  freeSpinContent: {
    alignItems: 'center',
  },
  freeLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontWeight: '700',
  },
});

export default SpinButton;
