/**
 * Root Layout — App Entry Point
 *
 * Boot sequence:
 * 1. Prevent splash screen from auto-hiding
 * 2. Read onboarding completion from AsyncStorage
 * 3. Call AuthService.initialize() (sets up auth listener + session restore)
 *    - Wallet fetch & settings load happen in parallel for faster boot
 * 4. Register Linking listener for OAuth deep link callbacks
 * 5. Hide splash screen once fully initialized
 * 6. Gate on onboarding: first-time users see the onboarding screen;
 *    returning users go straight to tabs
 * 7. ModalHost + ToastHost float above all screens (mounted at root)
 *
 * OAuth deep link flow:
 *   spinvault://auth/callback?code=XXXX  ← Supabase sends after Google/Apple auth
 *   → handleOAuthCallback(url) → exchangeCodeForSession → onAuthStateChange
 *   → sessionSlice syncs automatically (isAnonymous=false, linkedEmail set)
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ── Sentry Initialization ────────────────────────────────────────────────────
// Initialize error tracking in production builds only
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (!__DEV__) {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: false,
      release: `spin-vault@${Constants.expoConfig?.version ?? '1.0.0'}`,
      dist: Constants.expoConfig?.version ?? '1.0.0',
      tracesSampleRate: 0.05, // 5% of transactions (prevents quota burnout)
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000, // 30 seconds
      enableAppHangTracking: true,
      environment: __DEV__ ? 'development' : 'production',

      // Sanitize sensitive data before sending to Sentry
      beforeSend(event, hint) {
        // Remove IP address from user context
        if (event.contexts?.user) {
          delete event.contexts.user.ip_address;
        }

        // Sanitize sensitive keys from extra data
        if (event.extra) {
          const sensitiveKeys = [
            'password',
            'token',
            'secret',
            'apiKey',
            'api_key',
            'sessionId',
            'session_id',
            'accessToken',
            'access_token',
            'refreshToken',
            'refresh_token',
            'authToken',
            'auth_token',
          ];

          for (const key of sensitiveKeys) {
            if (key in event.extra) {
              event.extra[key] = '[REDACTED]';
            }
          }
        }

        // Sanitize breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
            if (breadcrumb.data) {
              const sanitized = { ...breadcrumb.data };
              if ('password' in sanitized) sanitized.password = '[REDACTED]';
              if ('token' in sanitized) sanitized.token = '[REDACTED]';
              if ('secret' in sanitized) sanitized.secret = '[REDACTED]';
              if ('apiKey' in sanitized) sanitized.apiKey = '[REDACTED]';
              return { ...breadcrumb, data: sanitized };
            }
            return breadcrumb;
          });
        }

        return event;
      },
    });
  } else {
    console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
    console.warn('   Set EXPO_PUBLIC_SENTRY_DSN in your .env file');
  }
}

// Keep the native splash screen visible while we load app resources
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('Failed to prevent splash auto-hide:', error);
  // Continue anyway - splash will just hide automatically
});

import { LoadingScreen } from '../src/components/LoadingScreen';
import { ModalHost } from '../src/components/modals/ModalHost';
import { ToastHost } from '../src/components/ToastHost';
import { AuthService } from '../src/services/AuthService';
import { useSessionStore } from '../src/stores/sessionSlice';
import { useUIStore } from '../src/stores/uiSlice';
import { ONBOARDING_STORAGE_KEY } from './onboarding';
import { logger } from '../src/lib/logger';
import { useTheme } from '../src/theme/useTheme';

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
      logger.debug('🚀 [BOOT] App startup begins');

      // 1. Check persistent onboarding state before anything else
      try {
        logger.debug('📱 [BOOT] Checking onboarding status...');
        const stored = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (stored === 'true') {
          logger.debug('✅ [BOOT] Onboarding already completed');
          setOnboardingComplete();
        } else {
          logger.debug('ℹ️  [BOOT] First time user - will show onboarding');
        }
      } catch (error) {
        logger.warn('⚠️  [BOOT] Failed to read onboarding state:', { error });
      }

      // 2. Initialize auth with retry logic (handles transient network failures)
      logger.debug('🔐 [BOOT] Starting AuthService initialization...');
      let retries = 3;
      let lastError: string | null = null;
      let initSuccess = false;

      while (retries > 0 && !initSuccess) {
        const result = await AuthService.initialize();

        if (result.success) {
          logger.debug('✅ [BOOT] Auth initialization successful');
          initSuccess = true;
        } else {
          lastError = result.error ?? 'Unknown error';
          retries--;

          if (retries > 0) {
            const backoffDelay = (4 - retries) * 1000; // 1s, 2s, 3s
            logger.warn('⚠️  [BOOT] Init failed, retrying...', {
              error: lastError,
              attemptsRemaining: retries,
              backoffMs: backoffDelay,
            });
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          } else {
            logger.error(
              '❌ [BOOT] Auth initialization failed after retries',
              new Error(lastError)
            );
            setInitError(lastError);
          }
        }
      }

      // 3. Register the deep link listener now that auth is fully initialised
      logger.debug('🔗 [BOOT] Registering deep link listener...');
      linkingSub = Linking.addEventListener('url', ({ url }) => {
        logger.debug('🔗 [BOOT] Deep link received:', { url });
        void AuthService.handleOAuthCallback(url);
      });

      // 4. Handle OAuth callback if app was cold-started from a deep link
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          logger.debug('🔗 [BOOT] Processing initial deep link:', { initialUrl });
          await AuthService.handleOAuthCallback(initialUrl);
        }
      } catch (error) {
        logger.warn('⚠️  [BOOT] OAuth callback handling failed:', { error });
      }

      logger.debug('✅ [BOOT] App boot complete - ready to render');
      setIsReady(true);
    }

    void bootApp();

    return () => {
      linkingSub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide splash screen once app is fully initialized (success OR error)
  useEffect(() => {
    const shouldHideSplash =
      isReady &&
      !isInitializing &&
      (authStatus === 'authenticated' || authStatus === 'error' || initError !== null);

    if (shouldHideSplash) {
      const hideSplash = async () => {
        try {
          await SplashScreen.hideAsync();
          logger.debug('✅ [BOOT] Splash screen hidden');
        } catch (error) {
          logger.warn('⚠️  [BOOT] Failed to hide splash screen:', { error });
          // Fallback: force hide after timeout
          setTimeout(() => {
            SplashScreen.hideAsync().catch(() => {
              logger.warn('⚠️  [BOOT] Splash screen force-hide also failed');
            });
          }, 1000);
        }
      };
      void hideSplash();
    }
  }, [isReady, isInitializing, authStatus, initError]);

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

// ── Error Boundary ───────────────────────────────────────────────────────────
// Catches React errors and prevents full app crashes. Required by Expo Router.

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  // Fallback colors if theme provider fails (prevents ErrorBoundary crash loop)
  const fallbackColors = {
    bg: { primary: '#1a1a2e' },
    gold: { primary: '#ffd700' },
    text: { secondary: '#cccccc', tertiary: '#999999' },
  };

  let colors = fallbackColors;
  try {
    const theme = useTheme();
    colors = theme.colors;
  } catch (themeError) {
    // Theme provider failed, use fallback colors
    logger.warn('ErrorBoundary: Theme unavailable, using fallback colors');
  }

  useEffect(() => {
    // Log error to Sentry
    logger.error('🚨 [ERROR BOUNDARY] Uncaught error in React tree', error);
  }, [error]);

  return (
    <View style={[styles.errorContainer, { backgroundColor: colors.bg.primary }]}>
      <Text style={[styles.errorTitle, { color: colors.gold.primary }]}>
        Something went wrong
      </Text>
      <Text style={[styles.errorMessage, { color: colors.text.secondary }]}>
        {error.message}
      </Text>
      {__DEV__ && (
        <Text style={[styles.errorStack, { color: colors.text.tertiary }]}>
          {error.stack}
        </Text>
      )}
      <Pressable
        style={[styles.retryButton, { backgroundColor: colors.gold.primary }]}
        onPress={retry}
      >
        <Text style={[styles.retryButtonText, { color: colors.bg.primary }]}>
          Try Again
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorStack: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 24,
    maxHeight: 200,
    overflow: 'hidden',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
