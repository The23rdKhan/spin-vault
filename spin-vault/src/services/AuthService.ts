/**
 * AuthService — App Boot Sequence
 *
 * Handles the critical path that runs every time the app opens:
 * 1. Check SecureStore for existing Supabase session
 * 2. If session exists and valid: restore it
 * 3. If no session: call supabase.auth.signInAnonymously()
 * 4. After auth: fetch wallet balance
 */

import { useSessionStore } from '../stores/sessionSlice';
import { useWalletStore } from '../stores/walletSlice';
import { useSettingsStore } from '../stores/settingsSlice';

export interface InitializeResult {
  success: boolean;
  error?: string;
}

/**
 * Initialize the app boot sequence.
 * This should be called once on app mount.
 */
export async function initialize(): Promise<InitializeResult> {
  try {
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
      // Non-fatal: user is authenticated but wallet fetch failed
      // They can retry later
      console.warn('Wallet fetch failed:', walletError);
    }

    // Step 3: Load user settings
    await useSettingsStore.getState().loadSettings();

    // Step 4: Check daily bonus eligibility
    useWalletStore.getState().checkDailyBonusEligibility();

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';

    // Rollback: reset stores to initial state
    useSessionStore.getState().reset();
    useWalletStore.getState().reset();

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Reset all app state (for sign out or error recovery).
 */
export function resetAppState(): void {
  useSessionStore.getState().reset();
  useWalletStore.getState().reset();
  useSettingsStore.getState().resetToDefaults();
}

export const AuthService = {
  initialize,
  resetAppState,
};

export default AuthService;
