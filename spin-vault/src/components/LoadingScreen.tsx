/**
 * LoadingScreen — App boot loading state
 *
 * Shows while the app is initializing (auth, wallet fetch).
 * Uses Reanimated 3 for pulse animation (no Animated API).
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '../theme/useTheme';
import { typography } from '../theme/tokens';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Subtle pulse animation using Reanimated 3
    opacity.value = withRepeat(
      withTiming(0.5, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repeats
      true // Reverse
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Animated.View style={animatedStyle}>
        <Text style={[styles.logo, { color: colors.gold.primary }]}>SPIN VAULT</Text>
      </Animated.View>

      {message !== undefined && message !== '' && (
        <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: typography.display.fontSize,
    fontWeight: typography.display.fontWeight,
    letterSpacing: 4,
  },
  message: {
    marginTop: 24,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
  },
});

export default LoadingScreen;
