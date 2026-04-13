/**
 * ConfirmExitModal — Android back-button exit guard
 *
 * Shown when the user presses the Android hardware back button from the
 * root Play screen. Prevents accidental app exit.
 *
 * "Stay"  → dismisses modal, user stays in app
 * "Exit"  → calls BackHandler.exitApp()
 */

import React from 'react';
import { BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/useTheme';
import { useUIStore } from '../../stores/uiSlice';
import { BaseModal } from './BaseModal';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
}

export function ConfirmExitModal({ visible }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const hideModal = useUIStore((s) => s.hideModal);

  function handleStay() {
    hideModal();
  }

  function handleExit() {
    hideModal();
    // Small delay so modal can animate out before the app closes
    setTimeout(() => {
      BackHandler.exitApp();
    }, 180);
  }

  return (
    <BaseModal visible={visible} onDismiss={handleStay} dismissOnBackdrop>
      {/* Icon */}
      <View style={[styles.iconWrap, { borderRadius: radius.full, backgroundColor: colors.bg.card }]}>
        <Ionicons name="exit-outline" size={32} color={colors.text.secondary} />
      </View>

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
        Leave Spin Vault?
      </Text>

      {/* Body */}
      <Text
        style={{
          ...typography.body,
          color: colors.text.secondary,
          textAlign: 'center',
          marginTop: spacing.sm,
          lineHeight: 22,
        }}
      >
        Your progress is saved. Come back anytime to claim your daily bonus!
      </Text>

      {/* Buttons */}
      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        {/* Stay — primary */}
        <TouchableOpacity
          onPress={handleStay}
          activeOpacity={0.85}
          style={[
            styles.btn,
            {
              backgroundColor: colors.gold.primary,
              borderRadius: radius.md,
              padding: spacing.md,
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
            Keep Playing
          </Text>
        </TouchableOpacity>

        {/* Exit — secondary */}
        <TouchableOpacity
          onPress={handleExit}
          activeOpacity={0.8}
          style={[
            styles.btn,
            {
              backgroundColor: colors.bg.card,
              borderColor: colors.border.default,
              borderRadius: radius.md,
              padding: spacing.md,
            },
          ]}
        >
          <Text
            style={{
              ...typography.body,
              color: colors.text.secondary,
              textAlign: 'center',
            }}
          >
            Exit App
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
  iconWrap: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: { alignItems: 'center', borderWidth: 1 },
});

export default ConfirmExitModal;
