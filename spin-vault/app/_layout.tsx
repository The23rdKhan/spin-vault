/**
 * Root Layout — App Entry Point
 *
 * Boot sequence:
 * 1. Read onboarding completion from AsyncStorage
 * 2. Call AuthService.initialize() (sets up auth listener + session restore)
 * 3. Register Linking listener for OAuth deep link callbacks
 * 4. Gate on onboarding: first-time users see the onboarding screen;
 *    returning users go straight to tabs
 * 5. ModalHost + ToastHost float above all screens (mounted at root)
 *
 * OAuth deep link flow:
 *   spinvault://auth/callback?code=XXXX  ← Supabase sends after Google/Apple auth
 *   → handleOAuthCallback(url) → exchangeCodeForSession → onAuthStateChange
 *   → sessionSlice syncs automatically (isAnonymous=false, linkedEmail set)
 */

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LoadingScreen } from '../src/components/LoadingScreen';
import { ModalHost } from '../src/components/modals/ModalHost';
import { ToastHost } from '../src/components/ToastHost';
import { AuthService } from '../src/services/AuthService';
import { useSessionStore } from '../src/stores/sessionSlice';
import { useUIStore } from '../src/stores/uiSlice';
import { ONBOARDING_STORAGE_KEY } from './onboarding';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const authStatus = useSessionStore((state) => state.authStatus);
  const isInitializing = useSessionStore((state) => state.isInitializing);
  const hasCompletedOnboarding = useUIStore((s) => s.hasCompletedOnboarding);
  const setOnboardingComplete = useUIStore((s) => s.setOnboardingComplete);

  useEffect(() => {
    // Deep link subscription stored so we can clean it up on unmount.
    // Registered AFTER initialize() to avoid handling a code before Supabase
    // has a valid session (PKCE codes are one-time-use; a failed exchange
    // during the boot window would silently burn them).
    let linkingSub: ReturnType<typeof Linking.addEventListener> | null = null;

    async function bootApp() {
      // 1. Check persistent onboarding state before anything else
      try {
        const stored = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (stored === 'true') {
          setOnboardingComplete();
        }
      } catch {
        // Storage read failed — onboarding shows; persists on next run
      }

      // 2. Initialize auth (sets up onAuthStateChange listener + session restore)
      const result = await AuthService.initialize();
      if (!result.success) {
        setInitError(result.error ?? 'Initialization failed');
      }

      // 3. Register the deep link listener now that auth is fully initialised
      linkingSub = Linking.addEventListener('url', ({ url }) => {
        void AuthService.handleOAuthCallback(url);
      });

      // 4. Handle OAuth callback if app was cold-started from a deep link
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await AuthService.handleOAuthCallback(initialUrl);
        }
      } catch {
        // Non-fatal — OAuth will retry on next attempt
      }

      setIsReady(true);
    }

    void bootApp();

    return () => {
      linkingSub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (!isReady || isInitializing) {
    return <LoadingScreen message="Loading..." />;
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (initError !== null || authStatus === 'error') {
    return <LoadingScreen message={initError ?? 'Something went wrong'} />;
  }

  // ── Auth gate ────────────────────────────────────────────────────────────

  if (authStatus !== 'authenticated') {
    return <LoadingScreen message="Connecting..." />;
  }

  // ── Onboarding gate ──────────────────────────────────────────────────────
  // First-time users see the onboarding flow. When setOnboardingComplete() is
  // called inside OnboardingScreen, this component re-renders and switches to
  // the tabs Stack — no router.replace() needed.

  if (!hasCompletedOnboarding) {
    return (
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack>
        <ToastHost />
      </>
    );
  }

  // ── Main app ─────────────────────────────────────────────────────────────

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <ModalHost />
      <ToastHost />
    </>
  );
}
