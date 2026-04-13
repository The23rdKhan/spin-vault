/**
 * BaseModal — Shared modal shell
 *
 * Handles backdrop, card container, entrance/exit animations, and
 * optional backdrop-tap dismiss. All modals build on top of this.
 */

import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/useTheme';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface BaseModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  dismissOnBackdrop?: boolean;
  fullScreen?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function BaseModal({
  visible,
  onDismiss,
  children,
  dismissOnBackdrop = true,
  fullScreen = false,
}: BaseModalProps) {
  const { colors, spacing, radius } = useTheme();

  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.88);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(0.65, { duration: 220 });
      cardScale.value = withSpring(1, { damping: 18, stiffness: 220 });
      cardOpacity.value = withTiming(1, { duration: 200 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 180 });
      cardScale.value = withTiming(0.88, { duration: 160 });
      cardOpacity.value = withTiming(0, { duration: 160 });
    }
  }, [visible, backdropOpacity, cardScale, cardOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View
          style={[styles.backdrop, { backgroundColor: colors.text.primary }, backdropStyle]}
        />

        {/* Dismiss tap area behind card */}
        {dismissOnBackdrop && (
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        )}

        {/* Card */}
        <Animated.View
          style={[
            fullScreen ? styles.fullScreenCard : styles.card,
            {
              backgroundColor: colors.bg.elevated,
              borderRadius: fullScreen ? 0 : radius.xl,
              padding: spacing['2xl'],
              borderColor: colors.border.default,
            },
            cardStyle,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '88%',
    maxWidth: 360,
    borderWidth: 1,
    zIndex: 1,
  },
  fullScreenCard: {
    flex: 1,
    width: '100%',
    zIndex: 1,
  },
});

export default BaseModal;
