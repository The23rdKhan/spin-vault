/**
 * ToastHost — Renders animated toast notifications
 *
 * Floats above all content at the top of the screen.
 * Each toast slides in from above and auto-dismisses.
 * Mount once at the root layout level alongside ModalHost.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/useTheme';
import { useUIStore } from '../stores/uiSlice';
import type { Toast, ToastType } from '../stores/uiSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Single Toast Item
// ─────────────────────────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Slide in
    translateY.value = withSpring(0, { damping: 16, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });

    // Auto-dismiss
    const timer = setTimeout(() => {
      dismiss();
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.duration]); // Re-schedule timer if duration changes

  function dismiss() {
    translateY.value = withTiming(-60, { duration: 220 });
    opacity.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(onDismiss)(toast.id);
      }
    });
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const bgColor = getToastBgColor(toast.type, colors);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={dismiss}
        activeOpacity={0.9}
        style={[
          styles.toastRow,
          {
            backgroundColor: bgColor,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            marginBottom: spacing.sm,
          },
        ]}
      >
        <Text
          style={[styles.toastMessage, { ...typography.body, color: colors.text.inverse }]}
          numberOfLines={2}
        >
          {toast.message}
        </Text>

        {toast.action && (
          <TouchableOpacity
            onPress={() => {
              toast.action?.onPress();
              dismiss();
            }}
            activeOpacity={0.7}
            style={[
              styles.actionButton,
              { borderColor: 'rgba(255,255,255,0.5)', borderRadius: radius.sm },
            ]}
          >
            <Text style={[styles.actionText, { ...typography.label, color: colors.text.inverse }]}>
              {toast.action.label}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Color helper
// ─────────────────────────────────────────────────────────────────────────────

function getToastBgColor(type: ToastType, colors: ReturnType<typeof useTheme>['colors']): string {
  switch (type) {
    case 'success':
      return colors.semantic.win;
    case 'error':
      return colors.semantic.error;
    case 'warning':
      return colors.semantic.warning;
    case 'info':
      return colors.semantic.info;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ToastHost
// ─────────────────────────────────────────────────────────────────────────────

export function ToastHost() {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          top: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
        },
      ]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  toastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  toastMessage: {
    flex: 1,
    fontWeight: '500',
  },
  actionButton: {
    marginLeft: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionText: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default ToastHost;
