/**
 * DeleteAccountModal
 *
 * Two-step confirmation before permanently deleting the account.
 * Step 1: warning + "Delete Account" button (outlined red)
 * Step 2: final confirmation with filled red button + loading state
 *
 * After deletion, requestAccountDeletion() calls signOut() internally,
 * which changes authStatus → the root layout unmounts the modal tree.
 */

import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/useTheme';
import { useUIStore } from '../../stores/uiSlice';
import { useSessionStore } from '../../stores/sessionSlice';
import { BaseModal } from './BaseModal';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
}

export function DeleteAccountModal({ visible }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const hideModal = useUIStore((s) => s.hideModal);
  const requestAccountDeletion = useSessionStore((s) => s.requestAccountDeletion);

  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleClose() {
    if (loading) return;
    setConfirming(false);
    setErrorMsg(null);
    hideModal();
  }

  async function handleDelete() {
    // Step 1 → step 2
    if (!confirming) {
      setConfirming(true);
      return;
    }

    // Step 2 → execute
    setLoading(true);
    setErrorMsg(null);

    await requestAccountDeletion('user_requested');

    // requestAccountDeletion catches internally and never re-throws.
    // Check the store error to determine if it actually succeeded.
    const storeError = useSessionStore.getState().error;
    if (storeError) {
      setErrorMsg('Something went wrong. Please try again.');
      setLoading(false);
    } else {
      // signOut() was called internally; auth state change collapses the modal tree.
      hideModal();
    }
  }

  return (
    <BaseModal visible={visible} onDismiss={handleClose} dismissOnBackdrop={!loading}>

      {/* ── Icon ── */}
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: `${colors.semantic.error}22`, borderRadius: radius.full },
        ]}
      >
        <Ionicons name="warning-outline" size={32} color={colors.semantic.error} />
      </View>

      {/* ── Title ── */}
      <Text
        style={[
          styles.title,
          { ...typography.headline, color: colors.semantic.error, marginTop: spacing.md },
        ]}
      >
        Delete Account
      </Text>

      {/* ── Body ── */}
      <Text
        style={[
          styles.body,
          { ...typography.body, color: colors.text.secondary, marginTop: spacing.sm },
        ]}
      >
        {confirming
          ? 'This is permanent and cannot be undone. All your coins, progress, and achievements will be lost forever.'
          : 'Are you sure you want to delete your account? This will erase all your data.'}
      </Text>

      {/* ── Error ── */}
      {errorMsg !== null && (
        <Text
          style={[
            styles.errorText,
            { ...typography.caption, color: colors.semantic.error, marginTop: spacing.sm },
          ]}
        >
          {errorMsg}
        </Text>
      )}

      {/* ── Buttons ── */}
      <View style={[styles.buttons, { marginTop: spacing.xl, gap: spacing.sm }]}>
        {/* Cancel — hidden during loading */}
        {!loading && (
          <TouchableOpacity
            onPress={handleClose}
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
            <Text style={{ ...typography.body, color: colors.text.primary, fontWeight: '600', textAlign: 'center' }}>
              Cancel
            </Text>
          </TouchableOpacity>
        )}

        {/* Delete / Confirm */}
        <TouchableOpacity
          onPress={() => void handleDelete()}
          disabled={loading}
          activeOpacity={0.8}
          style={[
            styles.btn,
            {
              backgroundColor: confirming ? colors.semantic.error : colors.bg.card,
              borderColor: colors.semantic.error,
              borderRadius: radius.md,
              padding: spacing.md,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <Text
              style={{
                ...typography.body,
                color: confirming ? colors.text.inverse : colors.semantic.error,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {confirming ? 'Yes, Delete My Account' : 'Delete Account'}
            </Text>
          )}
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
  title: {
    textAlign: 'center',
    fontWeight: '700',
  },
  body: {
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    textAlign: 'center',
  },
  buttons: {
    gap: 10,
  },
  btn: {
    borderWidth: 1,
    alignItems: 'center',
  },
});

export default DeleteAccountModal;
