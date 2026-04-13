/**
 * AuthService — App Boot Sequence + OAuth Deep Link Handling
 *
 * Boot sequence (called once on mount):
 * 1. Set up Supabase auth state listener (syncs OAuth callbacks to sessionSlice)
 * 2. Initialize session (SecureStore → anonymous sign-in fallback)
 * 3. Fetch wallet balance
 * 4. Load user settings
 * 5. Check daily bonus eligibility
 *
 * OAuth callback flow:
 *   User taps Google/Apple → browser opens OAuth page
 *   → browser redirects to spinvault://auth/callback?code=XXXX
 *   → _layout.tsx catches URL via Linking.addEventListener
 *   → calls AuthService.handleOAuthCallback(url)
 *   → exchangeCodeForSession() resolves the PKCE code
 *   → onAuthStateChange fires → sessionSlice syncs automatically
 */

import * as Linking from 'expo-linking';

import { supabase } from '../lib/supabase';
import { useSessionStore } from '../stores/sessionSlice';
import { useUIStore } from '../stores/uiSlice';
import { useWalletStore } from '../stores/walletSlice';
import { useSettingsStore } from '../stores/settingsSlice';

export interface InitializeResult {
  success: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth state listener
// ─────────────────────────────────────────────────────────────────────────────

let _unsubscribeAuthListener: (() => void) | null = null;

/**
 * Subscribes to Supabase auth state changes and syncs them into sessionSlice.
 * Handles OAuth SIGNED_IN events after exchangeCodeForSession completes,
 * token refreshes, USER_UPDATED (e.g. linked email), and SIGNED_OUT.
 */
function setupAuthStateListener(): void {
  // Clean up any previous subscription
  if (_unsubscribeAuthListener) {
    _unsubscribeAuthListener();
    _unsubscribeAuthListener = null;
  }

  const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
      case 'USER_UPDATED':
        if (session) {
          useSessionStore.setState({
            supabaseSession: session,
            user: session.user,
            isAnonymous: session.user.is_anonymous ?? true,
            linkedEmail: session.user.email ?? null,
            authStatus: 'authenticated',
            isLinking: false,
          });
        }
        break;

      case 'SIGNED_OUT':
        useSessionStore.setState({
          supabaseSession: null,
          user: null,
          userProfile: null,
          authStatus: 'unauthenticated',
          isAnonymous: true,
          linkedEmail: null,
        });
        break;

      default:
        break;
    }
  });

  _unsubscribeAuthListener = () => listener.subscription.unsubscribe();
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth callback handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles the deep link URL Supabase sends after OAuth completion.
 * Called from _layout.tsx when Linking receives an incoming URL.
 *
 * URL format (PKCE): spinvault://auth/callback?code=XXXX
 * After exchange, onAuthStateChange fires → sessionSlice syncs automatically.
 */
export async function handleOAuthCallback(url: string): Promise<void> {
  const parsed = Linking.parse(url);

  // Only process our auth callback path
  if (parsed.path !== 'auth/callback') return;

  const code = parsed.queryParams?.code;
  if (typeof code !== 'string' || code === '') return;

  try {
    await supabase.auth.exchangeCodeForSession(url);
    // onAuthStateChange fires SIGNED_IN → sessionSlice updated automatically.
    // Show a toast so the user knows linking succeeded while they were in browser.
    useUIStore.getState().showSuccess('Account linked successfully!');
  } catch (err) {
    console.warn('[AuthService] OAuth code exchange failed:', err);
    useUIStore.getState().showError('Account linking failed. Please try again.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialize
// ─────────────────────────────────────────────────────────────────────────────

export async function initialize(): Promise<InitializeResult> {
  try {
    // Set up auth state listener before session init so we catch the first event
    setupAuthStateListener();

    // Step 1: Initialize session (checks SecureStore, signs in anonymously if needed)
    await useSessionStore.getState().initialize();

    const { authStatus, error: sessionError } = useSessionStore.getState();

    if (authStatus === 'error') {
      return {
        success: false,
        error: sessionError ?? 'Session initialization failed',
      };
    }

    if (authStatus !== 'authenticated') {
      return {
        success: false,
        error: 'Failed to authenticate',
      };
    }

    // Step 2: Fetch wallet balance (server is source of truth)
    await useWalletStore.getState().fetchBalance();

    const { error: walletError } = useWalletStore.getState();
    if (walletError !== null) {
      console.warn('[AuthService] Wallet fetch failed:', walletError);
    }

    // Step 3: Load user settings
    await useSettingsStore.getState().loadSettings();

    // Step 4: Check daily bonus eligibility
    useWalletStore.getState().checkDailyBonusEligibility();

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';

    useSessionStore.getState().reset();
    useWalletStore.getState().reset();

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset
// ─────────────────────────────────────────────────────────────────────────────

export function resetAppState(): void {
  useSessionStore.getState().reset();
  useWalletStore.getState().reset();
  useSettingsStore.getState().resetToDefaults();
}

export const AuthService = {
  initialize,
  handleOAuthCallback,
  resetAppState,
};

export default AuthService;
