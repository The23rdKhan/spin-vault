/**
 * LinkAccountModal — Save your progress
 *
 * Two linking methods:
 *   1. Email + password  → supabase.auth.updateUser()
 *   2. Google / Apple   → supabase.auth.linkIdentity() (OAuth redirect)
 *
 * All store actions (linkWithEmail, linkWithGoogle, linkWithApple) are
 * fully implemented in sessionSlice; this is purely presentation.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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

export function LinkAccountModal({ visible }: Props) {
  const { colors, spacing, radius, typography } = useTheme();

  const hideModal = useUIStore((s) => s.hideModal);
  const showSuccess = useUIStore((s) => s.showSuccess);
  const showError = useUIStore((s) => s.showError);

  const linkWithEmail = useSessionStore((s) => s.linkWithEmail);
  const linkWithGoogle = useSessionStore((s) => s.linkWithGoogle);
  const linkWithApple = useSessionStore((s) => s.linkWithApple);
  const isLinking = useSessionStore((s) => s.isLinking);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function resetForm() {
    setEmail('');
    setPassword('');
    setEmailError(false);
    setPasswordError(false);
    setFieldError(null);
  }

  function handleClose() {
    if (isLinking) return;
    resetForm();
    hideModal();
  }

  // ── Email link ────────────────────────────────────────────────────────────

  async function handleEmailLink() {
    setFieldError(null);
    setEmailError(false);
    setPasswordError(false);

    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setEmailError(true);
      setFieldError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setPasswordError(true);
      setFieldError('Password must be at least 6 characters.');
      return;
    }

    const success = await linkWithEmail(email.trim(), password);
    if (success) {
      showSuccess('Account linked! Your progress is now saved.');
      resetForm();
      hideModal();
    } else {
      setFieldError('Could not link account. This email may already be in use.');
    }
  }

  // ── Google ────────────────────────────────────────────────────────────────

  async function handleGoogle() {
    const success = await linkWithGoogle();
    if (success) {
      // OAuth will redirect; modal closes to avoid UI collision
      hideModal();
    } else {
      showError('Google sign-in failed. Please try again.');
    }
  }

  // ── Apple ─────────────────────────────────────────────────────────────────

  async function handleApple() {
    const success = await linkWithApple();
    if (success) {
      hideModal();
    } else {
      showError('Apple sign-in failed. Please try again.');
    }
  }

  // ── Input style helper ────────────────────────────────────────────────────

  function inputStyle(hasError: boolean) {
    return [
      styles.input,
      {
        ...typography.body,
        backgroundColor: colors.bg.primary,
        borderColor: hasError ? colors.semantic.error : colors.border.default,
        borderRadius: radius.md,
        color: colors.text.primary,
        padding: spacing.md,
      },
    ] as const;
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <BaseModal visible={visible} onDismiss={handleClose} dismissOnBackdrop={!isLinking}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Header ── */}
        <Text
          style={{
            ...typography.headline,
            color: colors.text.primary,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          Link Account
        </Text>
        <Text
          style={{
            ...typography.body,
            color: colors.text.secondary,
            textAlign: 'center',
            marginTop: spacing.sm,
            lineHeight: 22,
          }}
        >
          Save your progress and access your vault from any device.
        </Text>

        {/* ── Email form ── */}
        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <TextInput
            value={email}
            onChangeText={(t) => { setEmail(t); setEmailError(false); setFieldError(null); }}
            placeholder="Email address"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLinking}
            style={inputStyle(emailError)}
          />
          <TextInput
            value={password}
            onChangeText={(t) => { setPassword(t); setPasswordError(false); setFieldError(null); }}
            placeholder="Password (min. 6 characters)"
            placeholderTextColor={colors.text.tertiary}
            secureTextEntry
            editable={!isLinking}
            style={inputStyle(passwordError)}
          />

          {/* Field error */}
          {fieldError !== null && (
            <Text style={{ ...typography.caption, color: colors.semantic.error }}>
              {fieldError}
            </Text>
          )}

          {/* Email CTA */}
          <TouchableOpacity
            onPress={() => void handleEmailLink()}
            disabled={isLinking}
            activeOpacity={0.85}
            style={[
              styles.btn,
              {
                backgroundColor: colors.gold.primary,
                borderRadius: radius.md,
                padding: spacing.md,
                opacity: isLinking ? 0.7 : 1,
              },
            ]}
          >
            {isLinking ? (
              <ActivityIndicator color={colors.bg.machine} size="small" />
            ) : (
              <Text style={{ ...typography.body, color: colors.bg.machine, fontWeight: '700' }}>
                Link with Email
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Divider ── */}
        <View style={[styles.divider, { marginVertical: spacing.lg }]}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border.default }]} />
          <Text
            style={{
              ...typography.caption,
              color: colors.text.tertiary,
              paddingHorizontal: spacing.sm,
            }}
          >
            or
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border.default }]} />
        </View>

        {/* ── OAuth buttons ── */}
        <View style={{ gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => void handleGoogle()}
            disabled={isLinking}
            activeOpacity={0.85}
            style={[
              styles.oauthBtn,
              {
                backgroundColor: colors.bg.card,
                borderColor: colors.border.default,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
          >
            <Ionicons name="logo-google" size={20} color={colors.text.primary} />
            <Text style={{ ...typography.body, color: colors.text.primary, fontWeight: '600' }}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void handleApple()}
            disabled={isLinking}
            activeOpacity={0.85}
            style={[
              styles.oauthBtn,
              {
                backgroundColor: colors.bg.card,
                borderColor: colors.border.default,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
          >
            <Ionicons name="logo-apple" size={20} color={colors.text.primary} />
            <Text style={{ ...typography.body, color: colors.text.primary, fontWeight: '600' }}>
              Continue with Apple
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Cancel ── */}
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.7}
          style={[styles.cancelBtn, { marginTop: spacing.md }]}
        >
          <Text style={{ ...typography.caption, color: colors.text.tertiary }}>Maybe later</Text>
        </TouchableOpacity>

      </KeyboardAvoidingView>
    </BaseModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  input: { borderWidth: 1 },
  btn: { alignItems: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center' },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
  },
  cancelBtn: { alignItems: 'center' },
});

export default LinkAccountModal;
