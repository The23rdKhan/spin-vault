/**
 * SlotReel — One vertical reel column
 *
 * Scrolls continuously during 'spinning' phase, then staggered-snaps to the
 * target position during 'revealing'. Calls onReelSettled when animation
 * completes so the parent can detect all-three-settled.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/useTheme';
import type { ReelPosition, SymbolId } from '../../stores/gameSlice';
import { SymbolView } from './SymbolView';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SYMBOL_SIZE = 72;
const SYMBOL_GAP = 8;
const SYMBOL_HEIGHT = SYMBOL_SIZE + SYMBOL_GAP;
const VISIBLE_ROWS = 3;
// Extra symbols above/below the viewport for seamless scroll loop
const EXTRA_SYMBOLS = 2;
const STRIP_COUNT = VISIBLE_ROWS + EXTRA_SYMBOLS;

// Default reel shown before first spin
const DEFAULT_SYMBOL: SymbolId = 'cherry';
const DEFAULT_POSITIONS: ReelPosition[] = Array.from({ length: STRIP_COUNT }, (_, i) => ({
  symbolId: DEFAULT_SYMBOL,
  symbolIndex: i,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SlotReelProps {
  reelIndex: 0 | 1 | 2;
  positions: ReelPosition[];
  targetPositions: ReelPosition[] | null;
  isSpinning: boolean;
  isRevealing: boolean;
  winningRows: number[];
  onReelSettled: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the strip of symbols to display in the reel.
 * Always returns exactly STRIP_COUNT positions.
 */
function buildStrip(positions: ReelPosition[]): ReelPosition[] {
  if (positions.length === 0) return DEFAULT_POSITIONS;

  // Pad or trim to STRIP_COUNT
  const result: ReelPosition[] = [];
  for (let i = 0; i < STRIP_COUNT; i++) {
    result.push(positions[i % positions.length]);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SlotReel({
  reelIndex,
  positions,
  targetPositions,
  isSpinning,
  isRevealing,
  winningRows,
  onReelSettled,
}: SlotReelProps) {
  const { colors, radius, spacing } = useTheme();
  const translateY = useSharedValue(0);
  const settledRef = useRef(false);

  // Center reel is slightly larger for visual depth
  const isCenter = reelIndex === 1;
  const symbolSize = isCenter ? SYMBOL_SIZE + 4 : SYMBOL_SIZE;
  const containerHeight = symbolSize * VISIBLE_ROWS + SYMBOL_GAP * (VISIBLE_ROWS - 1);
  const containerWidth = symbolSize + spacing.sm;

  const displayStrip = buildStrip(positions.length > 0 ? positions : DEFAULT_POSITIONS);
  const targetStrip = targetPositions ? buildStrip(targetPositions) : displayStrip;

  // Which strip to show during the two phases
  const stripToRender = isRevealing && targetPositions ? targetStrip : displayStrip;

  useEffect(() => {
    if (isSpinning) {
      settledRef.current = false;
      translateY.value = 0;
      // Continuous downward scroll — stagger start slightly per reel
      translateY.value = withDelay(
        reelIndex * 60,
        withRepeat(
          withTiming(-(SYMBOL_HEIGHT * 20), {
            duration: 600 + reelIndex * 80,
          }),
          -1,
          false
        )
      );
    } else if (isRevealing) {
      // Cancel the spin loop and snap to rest position
      cancelAnimation(translateY);

      const handleSettled = () => {
        if (!settledRef.current) {
          settledRef.current = true;
          onReelSettled();
        }
      };

      translateY.value = withDelay(
        reelIndex * 220,
        withSpring(
          0,
          { damping: 20, stiffness: 130, mass: 0.8 },
          (finished) => {
            if (finished) {
              runOnJS(handleSettled)();
            }
          }
        )
      );
    } else if (!isSpinning && !isRevealing) {
      cancelAnimation(translateY);
      translateY.value = withTiming(0, { duration: 100 });
    }
  }, [isSpinning, isRevealing, reelIndex, translateY, onReelSettled]);

  const animatedStripStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View
      style={[
        styles.reelContainer,
        {
          width: containerWidth,
          height: containerHeight,
          borderRadius: radius.lg,
          backgroundColor: colors.bg.reel,
          borderColor: colors.border.strong,
        },
      ]}
    >
      <Animated.View style={[styles.strip, animatedStripStyle]}>
        {stripToRender.map((pos, index) => (
          <View key={`${reelIndex}-${index}`} style={{ marginBottom: index < stripToRender.length - 1 ? SYMBOL_GAP : 0 }}>
            <SymbolView
              symbolId={pos.symbolId}
              size={symbolSize}
              isWinning={winningRows.includes(index)}
              isSpinning={isSpinning}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  reelContainer: {
    overflow: 'hidden',
    borderWidth: 1,
    alignItems: 'center',
  },
  strip: {
    alignItems: 'center',
  },
});

export default SlotReel;
