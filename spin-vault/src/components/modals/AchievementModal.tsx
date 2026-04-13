/**
 * AchievementModal — Unlock celebration
 *
 * Shown via the modal queue whenever an achievement is unlocked.
 * Reads achievementType from uiSlice.modalData and looks up the
 * display definition from the achievements config.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/useTheme';
import { useUIStore } from '../../stores/uiSlice';
import { getAchievementDef } from '../../config/achievements';
import { BaseModal } from './BaseModal';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
}

export function AchievementModal({ visible }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const hideModal = useUIStore((s) => s.hideModal);
  const modalData = useUIStore((s) => s.modalData);

  const achievementType = modalData?.achievementType ?? '';

  // Preserve the last valid def so content doesn't flash to the fallback
  // during the 160ms exit animation (modalData is cleared on hideModal).
  const lastDefRef = useRef(getAchievementDef(''));
  if (achievementType) lastDefRef.current = getAchievementDef(achievementType);
  const def = lastDefRef.current;

  // ── Entrance animation ────────────────────────────────────────────────────

  const emojiScale = useSharedValue(0);
  const badgeOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      emojiScale.value = withDelay(
        150,
        withSequence(
          withSpring(1.4, { damping: 6, stiffness: 280 }),
          withSpring(1.0, { damping: 14, stiffness: 200 }),
        ),
      );
      badgeOpacity.value = withDelay(300, withTiming(1, { duration: 250 }));
    } else {
      emojiScale.value = 0;
      badgeOpacity.value = 0;
    }
  }, [visible, emojiScale, badgeOpacity]);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
  }));

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <BaseModal visible={visible} onDismiss={hideModal}>
      <View style={styles.container}>

        {/* Animated emoji */}
        <Animated.Text style={[styles.emoji, emojiStyle]}>
          {def.emoji}
        </Animated.Text>

        {/* "Achievement unlocked" badge */}
        <Animated.View
          style={[
            styles.badge,
            {
              backgroundColor: colors.gold.light,
              borderColor: colors.gold.primary,
              borderRadius: radius.full,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              marginTop: spacing.md,
            },
            badgeStyle,
          ]}
        >
          <Text
            style={{
              ...typography.label,
              color: colors.gold.text,
              fontWeight: '700',
              letterSpacing: 1.2,
            }}
          >
            ACHIEVEMENT UNLOCKED
          </Text>
        </Animated.View>

        {/* Title */}
        <Text
          style={{
            ...typography.headline,
            color: colors.text.primary,
            fontWeight: '700',
            textAlign: 'center',
            marginTop: spacing.md,
          }}
        >
          {def.title}
        </Text>

        {/* Description */}
        <Text
          style={{
            ...typography.body,
            color: colors.text.secondary,
            textAlign: 'center',
            marginTop: spacing.sm,
            lineHeight: 22,
          }}
        >
          {def.description}
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
            Awesome!
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
  emoji: { fontSize: 72 },
  badge: { borderWidth: 1 },
  btn: { alignSelf: 'stretch', alignItems: 'center' },
});

export default AchievementModal;
