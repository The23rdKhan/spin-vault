/**
 * AuthService — App Boot Sequence + OAuth Deep Link Handling
 *
 * Boot sequence (called once on mount):
 * 1. Set up Supabase auth state listener (syncs OAuth callbacks to sessionSlice)
 * 2. Initialize session (SecureStore → anonymous sign-in fallback)
 * 3. Fetch wallet balance & load user settings in parallel (⚡ optimized)
 * 4. Check daily bonus eligibility
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
import { logger } from '../lib/logger';
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
    logger.warn('[AuthService] OAuth code exchange failed:', { error: err });
    useUIStore.getState().showError('Account linking failed. Please try again.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialize
// ─────────────────────────────────────────────────────────────────────────────

export async function initialize(): Promise<InitializeResult> {
  logger.debug('🔐 [AUTH] AuthService.initialize() started');

  try {
    // Set up auth state listener before session init so we catch the first event
    logger.debug('👂 [AUTH] Setting up auth state listener...');
    setupAuthStateListener();

    // Step 1: Initialize session (checks SecureStore, signs in anonymously if needed)
    logger.debug('👤 [AUTH] Step 1/4: Initializing session...');
    await useSessionStore.getState().initialize();

    const { authStatus, error: sessionError, user } = useSessionStore.getState();

    if (authStatus === 'error') {
      logger.error('❌ [AUTH] Session initialization failed', new Error(sessionError ?? 'Unknown error'));
      return {
        success: false,
        error: sessionError ?? 'Session initialization failed',
      };
    }

    if (authStatus !== 'authenticated') {
      logger.error('❌ [AUTH] User not authenticated after initialization', new Error('Auth failed'));
      return {
        success: false,
        error: 'Failed to authenticate',
      };
    }

    logger.debug('✅ [AUTH] Session initialized, user authenticated');

    // Set user context in Sentry/logger for error tracking
    if (user !== null) {
      logger.setUser(user.id, user.is_anonymous ?? true, user.email ?? undefined);
    }

    // Steps 2-3: Fetch wallet balance and load settings in parallel (no dependencies)
    // Use Promise.allSettled to allow partial failures (non-blocking)
    logger.debug('💰 [AUTH] Step 2-3/4: Fetching wallet balance & settings in parallel...');
    const [walletResult, settingsResult] = await Promise.allSettled([
      useWalletStore.getState().fetchBalance(),
      useSettingsStore.getState().loadSettings(),
    ]);

    // Log results but don't block initialization on failures
    if (walletResult.status === 'rejected') {
      logger.warn('⚠️  [AUTH] Wallet fetch failed (non-blocking):', {
        error: walletResult.reason,
      });
    } else {
      const { error: walletError, balance } = useWalletStore.getState();
      if (walletError !== null) {
        logger.warn('⚠️  [AUTH] Wallet fetch failed:', { error: walletError });
      } else {
        logger.debug('✅ [AUTH] Wallet balance fetched:', { balance: balance.toString() });
      }
    }

    if (settingsResult.status === 'rejected') {
      logger.warn('⚠️  [AUTH] Settings load failed (non-blocking):', {
        error: settingsResult.reason,
      });
    } else {
      logger.debug('✅ [AUTH] User settings loaded');
    }

    // Step 4: Check daily bonus eligibility
    logger.debug('🎁 [AUTH] Step 4/4: Checking daily bonus eligibility...');
    useWalletStore.getState().checkDailyBonusEligibility();
    const { canClaimDaily } = useWalletStore.getState();
    logger.debug('✅ [AUTH] Daily bonus check complete', { canClaimDaily });

    logger.info('🎉 [AUTH] AuthService.initialize() completed successfully');
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
    logger.error('❌ [AUTH] Fatal error during initialization', err, { errorMessage });

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
