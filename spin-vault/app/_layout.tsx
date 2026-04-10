/**
 * Root Layout — App Entry Point
 *
 * Handles the app boot sequence:
 * 1. Show loading screen while initializing
 * 2. Call AuthService.initialize() on mount
 * 3. Only render tabs when authenticated
 */

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';

import { LoadingScreen } from '../src/components/LoadingScreen';
import { AuthService } from '../src/services/AuthService';
import { useSessionStore } from '../src/stores/sessionSlice';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const authStatus = useSessionStore((state) => state.authStatus);
  const isInitializing = useSessionStore((state) => state.isInitializing);

  useEffect(() => {
    async function bootApp() {
      const result = await AuthService.initialize();

      if (!result.success) {
        setInitError(result.error ?? 'Initialization failed');
      }

      setIsReady(true);
    }

    void bootApp();
  }, []);

  // Show loading screen while initializing
  if (!isReady || isInitializing) {
    return <LoadingScreen message="Loading..." />;
  }

  // Show error state if initialization failed
  if (initError !== null || authStatus === 'error') {
    return <LoadingScreen message={initError ?? 'Something went wrong'} />;
  }

  // Only render app content when authenticated
  if (authStatus !== 'authenticated') {
    return <LoadingScreen message="Connecting..." />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
