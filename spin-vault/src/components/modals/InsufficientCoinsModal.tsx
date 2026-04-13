/**
 * InsufficientCoinsModal — Low balance prompt
 *
 * Shown when canAffordBet() returns false. Offers navigation to the Shop
 * or dismissal.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '../../theme/useTheme';
import { useUIStore } from '../../stores/uiSlice';
import Icon from '../Icon';
import { BaseModal } from './BaseModal';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface InsufficientCoinsModalProps {
  visible: boolean;
}

export function InsufficientCoinsModal({ visible }: InsufficientCoinsModalProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const hideModal = useUIStore((s) => s.hideModal);
  const router = useRouter();

  function handleGoToShop() {
    hideModal();
    router.push('/(tabs)/shop');
  }

  return (
    <BaseModal visible={visible} onDismiss={hideModal}>
      <View style={styles.container}>
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.bg.card, borderRadius: radius.full },
          ]}
        >
          <Icon name="wallet-outline" size={40} variant="muted" />
        </View>

        {/* Title */}
        <Text style={[styles.title, { ...typography.title, color: colors.text.primary }]}>
          Not Enough Coins
        </Text>

        {/* Body */}
        <Text style={[styles.body, { ...typography.body, color: colors.text.secondary }]}>
          Visit the Shop to get more coins or wait for your daily bonus.
        </Text>

        {/* Go to shop */}
        <TouchableOpacity
          onPress={handleGoToShop}
          activeOpacity={0.8}
          style={[
            styles.primaryButton,
            {
              backgroundColor: colors.gold.primary,
              borderRadius: radius.lg,
              marginTop: spacing.xl,
              paddingVertical: spacing.md,
            },
          ]}
        >
          <Text style={[styles.primaryButtonText, { ...typography.title, color: colors.bg.machine }]}>
            GO TO SHOP
          </Text>
        </TouchableOpacity>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={hideModal}
          activeOpacity={0.7}
          style={styles.dismissButton}
        >
          <Text style={[styles.dismissText, { ...typography.body, color: colors.text.tertiary }]}>
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
  body: {
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryButtonText: {
    letterSpacing: 0.5,
  },
  dismissButton: {
    marginTop: 12,
    padding: 8,
  },
  dismissText: {},
});

export default InsufficientCoinsModal;
