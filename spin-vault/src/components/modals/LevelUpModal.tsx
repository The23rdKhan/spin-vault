/**
 * LevelUpModal — Level-up celebration
 *
 * TRIGGER (not yet wired — level/XP system pending DB schema):
 *   showModal('level_up', { level: newLevel, bonusCoins: reward })
 *
 * When the level system is added, call the above wherever XP thresholds
 * are crossed (e.g. inside walletSlice.creditWin or a dedicated xpSlice).
 * Falls back gracefully if no level data is present in modalData.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/useTheme';
import { useUIStore } from '../../stores/uiSlice';
import { formatCoins } from '../../utils/formatCoins';
import { BaseModal } from './BaseModal';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
}

export function LevelUpModal({ visible }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const hideModal = useUIStore((s) => s.hideModal);
  const modalData = useUIStore((s) => s.modalData);

  const level = modalData?.level ?? 0;
  const bonusCoins = modalData?.bonusCoins ?? 0n;

  // ── Animations ────────────────────────────────────────────────────────────

  const starScale = useSharedValue(0);
  const levelScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      starScale.value = withDelay(
        100,
        withSequence(
          withSpring(1.3, { damping: 5, stiffness: 300 }),
          withSpring(1.0, { damping: 12, stiffness: 180 }),
        ),
      );
      levelScale.value = withDelay(
        250,
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
      glowOpacity.value = withDelay(
        200,
        withRepeat(
          withSequence(withTiming(0.6, { duration: 900 }), withTiming(0.2, { duration: 900 })),
          -1,
          false,
        ),
      );
    } else {
      starScale.value = 0;
      levelScale.value = 0.5;
      glowOpacity.value = 0;
    }
  }, [visible, starScale, levelScale, glowOpacity]);

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  const levelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: levelScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <BaseModal visible={visible} onDismiss={hideModal}>
      <View style={styles.container}>

        {/* Animated star / medal */}
        <View style={styles.iconWrap}>
          {/* Glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              { backgroundColor: colors.gold.primary, borderRadius: radius.full },
              glowStyle,
            ]}
          />
          <Animated.Text style={[styles.star, starStyle]}>⭐</Animated.Text>
        </View>

        {/* "Level up!" label */}
        <Text
          style={{
            ...typography.label,
            color: colors.gold.primary,
            fontWeight: '700',
            letterSpacing: 1.5,
            marginTop: spacing.md,
          }}
        >
          LEVEL UP!
        </Text>

        {/* Level number */}
        {level > 0 && (
          <Animated.Text
            style={[
              {
                ...typography.display,
                color: colors.text.primary,
                fontWeight: '700',
                marginTop: spacing.sm,
              },
              levelStyle,
            ]}
          >
            Level {level}
          </Animated.Text>
        )}

        {/* Bonus coins */}
        {bonusCoins > 0n && (
          <View
            style={[
              styles.bonusRow,
              {
                backgroundColor: colors.gold.light,
                borderRadius: radius.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                marginTop: spacing.md,
                borderColor: colors.gold.primary,
              },
            ]}
          >
            <Text style={{ ...typography.body, color: colors.gold.text }}>
              🎁 Bonus:{' '}
              <Text style={{ fontWeight: '700' }}>{formatCoins(bonusCoins)} coins</Text>
            </Text>
          </View>
        )}

        {/* Subtitle */}
        <Text
          style={{
            ...typography.body,
            color: colors.text.secondary,
            textAlign: 'center',
            marginTop: spacing.md,
            lineHeight: 22,
          }}
        >
          Keep spinning to unlock the next level!
        </Text>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={hideModal}
          activeOpacity={0.85}
          style={[
            styles.btn,
            {
              backgroundColor: colors.gold.primary,
              borderRadius: radius.lg,
              marginTop: spacing.xl,
              paddingVertical: spacing.md,
            },
          ]}
        >
          <Text
            style={{
              ...typography.body,
              color: colors.bg.machine,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            Keep Going!
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
  container: { alignItems: 'center' },
  iconWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 90,
    height: 90,
  },
  star: { fontSize: 64 },
  bonusRow: { borderWidth: 1 },
  btn: { alignSelf: 'stretch', alignItems: 'center' },
});

export default LevelUpModal;
