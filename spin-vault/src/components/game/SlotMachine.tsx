/**
 * SlotMachine — Orchestrates 3 reels and drives phase transitions
 *
 * Reads game state from gameSlice. When all 3 reels finish their settle
 * animation, calls setDisplayedReels + startCelebrating to advance the phase.
 *
 * NEVER runs RNG — all reel positions come from the server via gameSlice.
 */

import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { useGameStore } from '../../stores/gameSlice';
import type { ReelPosition, SymbolId } from '../../stores/gameSlice';
import { SlotReel } from './SlotReel';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const REEL_COUNT = 3;
const VISIBLE_ROWS = 3;

// Map lineIndex → row (0=top, 1=middle, 2=bottom)
const LINE_ROW_MAP: Record<number, number> = {
  0: 1, // Main payline (middle row)
  1: 0, // Top row
  2: 2, // Bottom row
};

const DEFAULT_SYMBOL: SymbolId = 'cherry';

function makeDefaultReel(): ReelPosition[] {
  return Array.from({ length: VISIBLE_ROWS }, (_, i) => ({
    symbolId: DEFAULT_SYMBOL,
    symbolIndex: i,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SlotMachine() {
  const { colors, radius, spacing } = useTheme();

  const phase = useGameStore((s) => s.phase);
  const displayedReels = useGameStore((s) => s.displayedReels);
  const targetReels = useGameStore((s) => s.targetReels);
  const lastSpinResult = useGameStore((s) => s.lastSpinResult);
  const setDisplayedReels = useGameStore((s) => s.setDisplayedReels);
  const startCelebrating = useGameStore((s) => s.startCelebrating);

  const settledCount = useRef(0);

  const isSpinning = phase === 'spinning';
  const isRevealing = phase === 'revealing';

  // Build reel data — fall back to defaults if null
  const defaultReel = makeDefaultReel();
  const reel0 = displayedReels?.[0] ?? defaultReel;
  const reel1 = displayedReels?.[1] ?? defaultReel;
  const reel2 = displayedReels?.[2] ?? defaultReel;
  const reels: [ReelPosition[], ReelPosition[], ReelPosition[]] = [reel0, reel1, reel2];

  const targetReel0 = targetReels?.[0] ?? null;
  const targetReel1 = targetReels?.[1] ?? null;
  const targetReel2 = targetReels?.[2] ?? null;
  const targetReelsSplit: [ReelPosition[] | null, ReelPosition[] | null, ReelPosition[] | null] = [
    targetReel0,
    targetReel1,
    targetReel2,
  ];

  // Derive winning rows per reel from win lines
  const winningRowsByReel: [number[], number[], number[]] = [[], [], []];
  if (lastSpinResult) {
    for (const line of lastSpinResult.winLines) {
      const row = LINE_ROW_MAP[line.lineIndex] ?? 1;
      winningRowsByReel[0].push(row);
      winningRowsByReel[1].push(row);
      winningRowsByReel[2].push(row);
    }
  }

  const handleReelSettled = useCallback(() => {
    settledCount.current += 1;

    if (settledCount.current >= REEL_COUNT) {
      settledCount.current = 0;

      // Persist final reel positions from server result
      if (targetReels) {
        setDisplayedReels(targetReels);
      }

      // Advance phase — startCelebrating checks if win > 0
      startCelebrating();
    }
  }, [targetReels, setDisplayedReels, startCelebrating]);

  // Reset settled count on new spin
  React.useEffect(() => {
    if (phase === 'spinning') {
      settledCount.current = 0;
    }
  }, [phase]);

  return (
    <View
      style={[
        styles.machine,
        {
          backgroundColor: colors.bg.machine,
          borderRadius: radius.xl,
          padding: spacing.xl,
        },
      ]}
    >
      {/* Gold border ring */}
      <View
        style={[
          styles.borderRing,
          {
            borderColor: colors.gold.primary,
            borderRadius: radius.xl - 4,
          },
        ]}
      >
        {/* Reels row */}
        <View style={styles.reelsRow}>
          {([0, 1, 2] as const).map((i) => (
            <SlotReel
              key={i}
              reelIndex={i}
              positions={reels[i]}
              targetPositions={targetReelsSplit[i]}
              isSpinning={isSpinning}
              isRevealing={isRevealing}
              winningRows={winningRowsByReel[i]}
              onReelSettled={handleReelSettled}
            />
          ))}
        </View>

        {/* Center payline indicator */}
        <View
          style={[
            styles.paylineIndicator,
            { backgroundColor: colors.gold.primary },
          ]}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  machine: {
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  borderRing: {
    borderWidth: 2,
    padding: 12,
    position: 'relative',
    alignItems: 'center',
  },
  reelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paylineIndicator: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    opacity: 0.5,
    // Centered vertically on the middle row — offset manually
    top: '50%',
    marginTop: -1,
  },
});

export default SlotMachine;
