/**
 * SymbolView — Renders a single slot machine symbol cell
 *
 * Displays emoji/text for each SymbolId with an animated gold border
 * when the symbol is part of a winning line.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/useTheme';
import type { SymbolId } from '../../stores/gameSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Symbol Map
// ─────────────────────────────────────────────────────────────────────────────

interface SymbolConfig {
  display: string;
  colorKey: 'error' | 'gold' | 'purple' | 'primary';
}

const SYMBOL_MAP: Record<SymbolId, SymbolConfig> = {
  seven: { display: '7', colorKey: 'error' },
  wild: { display: 'W', colorKey: 'gold' },
  scatter: { display: 'S', colorKey: 'purple' },
  bar: { display: 'BAR', colorKey: 'primary' },
  bell: { display: '🔔', colorKey: 'primary' },
  cherry: { display: '🍒', colorKey: 'primary' },
  lemon: { display: '🍋', colorKey: 'primary' },
  orange: { display: '🍊', colorKey: 'primary' },
  grape: { display: '🍇', colorKey: 'primary' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SymbolViewProps {
  symbolId: SymbolId;
  size?: number;
  isWinning?: boolean;
  isSpinning?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SymbolView({ symbolId, size = 72, isWinning = false, isSpinning = false }: SymbolViewProps) {
  const { colors, radius } = useTheme();
  const winGlow = useSharedValue(0);

  const symbol = SYMBOL_MAP[symbolId];

  // Resolve display color
  let symbolColor: string;
  switch (symbol.colorKey) {
    case 'error':
      symbolColor = colors.semantic.error;
      break;
    case 'gold':
      symbolColor = colors.gold.primary;
      break;
    case 'purple':
      symbolColor = colors.jackpot.purple;
      break;
    default:
      symbolColor = colors.text.primary;
  }

  // Win glow animation
  useEffect(() => {
    if (isWinning) {
      winGlow.value = withRepeat(withTiming(1, { duration: 400 }), -1, true);
    } else {
      cancelAnimation(winGlow);
      winGlow.value = withTiming(0, { duration: 150 });
    }
  }, [isWinning, winGlow]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderWidth: winGlow.value * 2.5,
    borderColor: colors.gold.primary,
    opacity: isSpinning ? 0.6 : 1,
  }));

  const fontSize = size * 0.42;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: colors.bg.reel,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.inner}>
        <Text
          style={[
            styles.symbolText,
            {
              fontSize,
              color: symbolColor,
              lineHeight: size * 0.55,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {symbol.display}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  symbolText: {
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default SymbolView;
