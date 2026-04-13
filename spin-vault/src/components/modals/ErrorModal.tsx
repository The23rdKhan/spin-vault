/**
 * ErrorModal — Generic error display
 *
 * Shows an error message with a dismiss button.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { useUIStore } from '../../stores/uiSlice';
import Icon from '../Icon';
import { BaseModal } from './BaseModal';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorModalProps {
  visible: boolean;
}

export function ErrorModal({ visible }: ErrorModalProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const hideModal = useUIStore((s) => s.hideModal);
  const modalData = useUIStore((s) => s.modalData);

  const errorMessage = modalData?.errorMessage ?? 'Something went wrong. Please try again.';

  return (
    <BaseModal visible={visible} onDismiss={hideModal}>
      <View style={styles.container}>
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: colors.bg.card,
              borderRadius: radius.full,
            },
          ]}
        >
          <Icon name="alert-circle-outline" size={40} variant="error" />
        </View>

        {/* Title */}
        <Text style={[styles.title, { ...typography.title, color: colors.text.primary }]}>
          Something went wrong
        </Text>

        {/* Error message */}
        <Text style={[styles.message, { ...typography.body, color: colors.text.secondary }]}>
          {errorMessage}
        </Text>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={hideModal}
          activeOpacity={0.8}
          style={[
            styles.button,
            {
              backgroundColor: colors.bg.card,
              borderRadius: radius.lg,
              marginTop: spacing.xl,
              paddingVertical: spacing.md,
              borderColor: colors.border.strong,
            },
          ]}
        >
          <Text style={[styles.buttonText, { ...typography.body, color: colors.text.primary }]}>
            Dismiss
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
  iconContainer: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: {},
});

export default ErrorModal;
