/**
 * gameSlice — Spin State & Reels
 *
 * Manages game phases, reel animations, and server RNG integration.
 * NEVER runs RNG on the client — all results come from Supabase RPC.
 */

import { create } from 'zustand';

import { supabase } from '../lib/supabase';
import { useWalletStore } from './walletSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SymbolId =
  | 'seven'
  | 'bar'
  | 'bell'
  | 'cherry'
  | 'lemon'
  | 'orange'
  | 'grape'
  | 'wild'
  | 'scatter';

export type GamePhase =
  | 'idle'
  | 'betting'
  | 'spinning'
  | 'revealing'
  | 'celebrating'
  | 'free_spins';

export interface ReelPosition {
  symbolId: SymbolId;
  symbolIndex: number;
}

export type ReelGrid = [ReelPosition[], ReelPosition[], ReelPosition[]];

export interface WinLine {
  lineIndex: number;
  symbols: SymbolId[];
  payout: bigint;
}

export interface SpinResult {
  spinId: string;
  reelPositions: ReelGrid;
  winAmount: bigint;
  winLines: WinLine[];
  isJackpot: boolean;
  multiplier: number;
  freeSpinsAwarded: number;
}

interface GameState {
  phase: GamePhase;
  displayedReels: ReelGrid | null;
  targetReels: ReelGrid | null;
  currentSpinId: string | null;
  lastSpinResult: SpinResult | null;
  currentWin: bigint;
  totalSessionWins: bigint;
  totalSessionLosses: bigint;
  spinCount: number;
  freeSpinsRemaining: number;
  freeSpinsTotal: number;
  freeSpinsTotalWin: bigint;
  isJackpotWin: boolean;
  jackpotAmount: bigint;
  isAutoSpinEnabled: boolean;
  autoSpinCount: number;
  isSpinning: boolean;
  error: string | null;
}

interface GameActions {
  // Core spin
  requestSpin: () => Promise<void>;
  handleSpinResult: (result: SpinResult) => void;
  handleSpinError: (error: string) => void;

  // Phase control
  setPhase: (phase: GamePhase) => void;
  startRevealing: () => void;
  startCelebrating: () => void;
  completeWinCycle: () => void;

  // Reel animation hooks
  setDisplayedReels: (reels: ReelGrid) => void;
  setTargetReels: (reels: ReelGrid) => void;

  // Free spins
  startFreeSpins: (count: number) => void;
  decrementFreeSpin: () => void;
  endFreeSpins: () => void;

  // Auto spin
  toggleAutoSpin: () => void;
  setAutoSpinCount: (count: number) => void;
  decrementAutoSpin: () => void;

  resetSessionStats: () => void;
  reset: () => void;
}

type GameStore = GameState & GameActions;

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialState: GameState = {
  phase: 'idle',
  displayedReels: null,
  targetReels: null,
  currentSpinId: null,
  lastSpinResult: null,
  currentWin: 0n,
  totalSessionWins: 0n,
  totalSessionLosses: 0n,
  spinCount: 0,
  freeSpinsRemaining: 0,
  freeSpinsTotal: 0,
  freeSpinsTotalWin: 0n,
  isJackpotWin: false,
  jackpotAmount: 0n,
  isAutoSpinEnabled: false,
  autoSpinCount: 0,
  isSpinning: false,
  error: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateSpinId(): string {
  return `spin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

interface ServerSpinResponse {
  spin_id: string;
  reel_positions: { symbol_id: string; symbol_index: number }[][];
  win_amount: string | number;
  win_lines: {
    line_index: number;
    symbols: string[];
    payout: string | number;
  }[];
  is_jackpot: boolean;
  multiplier: number;
  free_spins_awarded: number;
  new_balance: string | number;
}

function parseServerSpinResult(data: ServerSpinResponse): SpinResult {
  return {
    spinId: data.spin_id,
    reelPositions: data.reel_positions.map((reel) =>
      reel.map((pos) => ({
        symbolId: pos.symbol_id as SymbolId,
        symbolIndex: pos.symbol_index,
      }))
    ) as ReelGrid,
    winAmount: BigInt(data.win_amount),
    winLines: data.win_lines.map((line) => ({
      lineIndex: line.line_index,
      symbols: line.symbols as SymbolId[],
      payout: BigInt(line.payout),
    })),
    isJackpot: data.is_jackpot,
    multiplier: data.multiplier,
    freeSpinsAwarded: data.free_spins_awarded,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  // ───────────────────────────────────────────────────────────────────────────
  // Core Spin
  // ───────────────────────────────────────────────────────────────────────────

  requestSpin: async () => {
    const wallet = useWalletStore.getState();
    const { freeSpinsRemaining, isSpinning } = get();

    // Prevent double spins
    if (isSpinning) return;

    // Check if we can afford the bet (unless in free spins)
    if (freeSpinsRemaining === 0 && !wallet.canAffordBet()) {
      set({ error: 'Insufficient coins' });
      return;
    }

    const spinId = generateSpinId();

    set({
      isSpinning: true,
      phase: 'spinning',
      currentSpinId: spinId,
      error: null,
      currentWin: 0n,
      isJackpotWin: false,
    });

    // Optimistic deduction (only if not free spin)
    if (freeSpinsRemaining === 0) {
      wallet.deductBet(spinId);
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Server-side RNG via Supabase RPC
      const { data, error } = await supabase.rpc('execute_spin', {
        p_user_id: user.id,
        p_bet_amount: freeSpinsRemaining > 0 ? 0 : Number(wallet.currentBet),
        p_is_free_spin: freeSpinsRemaining > 0,
        p_client_spin_id: spinId,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Cast the RPC response through unknown
      const serverResponse = data as unknown as ServerSpinResponse;
      const result = parseServerSpinResult(serverResponse);

      // Reconcile wallet balance with server
      wallet.reconcileBalance(BigInt(serverResponse.new_balance), spinId);

      // Handle the result
      get().handleSpinResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Spin failed';
      get().handleSpinError(errorMessage);

      // Rollback optimistic update
      if (freeSpinsRemaining === 0) {
        wallet.rollbackOptimistic(spinId);
      }
    }
  },

  handleSpinResult: (result: SpinResult) => {
    const { freeSpinsRemaining } = get();

    set((state) => {
      const isWin = result.winAmount > 0n;
      const betAmount = useWalletStore.getState().currentBet;

      return {
        lastSpinResult: result,
        targetReels: result.reelPositions,
        currentWin: result.winAmount,
        isJackpotWin: result.isJackpot,
        jackpotAmount: result.isJackpot ? result.winAmount : 0n,
        spinCount: state.spinCount + 1,
        totalSessionWins: isWin
          ? state.totalSessionWins + result.winAmount
          : state.totalSessionWins,
        totalSessionLosses:
          !isWin && freeSpinsRemaining === 0
            ? state.totalSessionLosses + betAmount
            : state.totalSessionLosses,
        freeSpinsTotalWin:
          freeSpinsRemaining > 0
            ? state.freeSpinsTotalWin + result.winAmount
            : state.freeSpinsTotalWin,
        isSpinning: false,
        phase: 'revealing',
      };
    });

    // Queue free spins if awarded
    if (result.freeSpinsAwarded > 0) {
      get().startFreeSpins(result.freeSpinsAwarded);
    }
  },

  handleSpinError: (error: string) => {
    set({
      error,
      isSpinning: false,
      phase: 'idle',
      currentSpinId: null,
    });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Phase Control
  // ───────────────────────────────────────────────────────────────────────────

  setPhase: (phase: GamePhase) => {
    set({ phase });
  },

  startRevealing: () => {
    set({ phase: 'revealing' });
  },

  startCelebrating: () => {
    const { currentWin } = get();
    if (currentWin > 0n) {
      set({ phase: 'celebrating' });
    } else {
      get().completeWinCycle();
    }
  },

  completeWinCycle: () => {
    const { freeSpinsRemaining, isAutoSpinEnabled, autoSpinCount } = get();

    // Decrement free spin if applicable
    if (freeSpinsRemaining > 0) {
      get().decrementFreeSpin();
      return;
    }

    // Handle auto spin
    if (isAutoSpinEnabled && autoSpinCount > 0) {
      get().decrementAutoSpin();
      // Auto spin will be triggered by the component
    }

    set({
      phase: 'idle',
      currentSpinId: null,
    });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Reel Animation Hooks
  // ───────────────────────────────────────────────────────────────────────────

  setDisplayedReels: (reels: ReelGrid) => {
    set({ displayedReels: reels });
  },

  setTargetReels: (reels: ReelGrid) => {
    set({ targetReels: reels });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Free Spins
  // ───────────────────────────────────────────────────────────────────────────

  startFreeSpins: (count: number) => {
    set({
      phase: 'free_spins',
      freeSpinsRemaining: count,
      freeSpinsTotal: count,
      freeSpinsTotalWin: 0n,
    });
  },

  decrementFreeSpin: () => {
    set((state) => {
      const remaining = state.freeSpinsRemaining - 1;

      if (remaining <= 0) {
        // Free spins complete — will trigger end celebration
        return {
          freeSpinsRemaining: 0,
          phase: 'celebrating', // Will show free spins end modal
        };
      }

      return {
        freeSpinsRemaining: remaining,
        phase: 'free_spins',
      };
    });
  },

  endFreeSpins: () => {
    set({
      freeSpinsRemaining: 0,
      freeSpinsTotal: 0,
      freeSpinsTotalWin: 0n,
      phase: 'idle',
    });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Auto Spin
  // ───────────────────────────────────────────────────────────────────────────

  toggleAutoSpin: () => {
    set((state) => ({
      isAutoSpinEnabled: !state.isAutoSpinEnabled,
      autoSpinCount: state.isAutoSpinEnabled ? 0 : state.autoSpinCount,
    }));
  },

  setAutoSpinCount: (count: number) => {
    set({
      autoSpinCount: Math.max(0, count),
      isAutoSpinEnabled: count > 0,
    });
  },

  decrementAutoSpin: () => {
    set((state) => {
      const remaining = state.autoSpinCount - 1;

      if (remaining <= 0) {
        return {
          autoSpinCount: 0,
          isAutoSpinEnabled: false,
        };
      }

      return {
        autoSpinCount: remaining,
      };
    });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Reset
  // ───────────────────────────────────────────────────────────────────────────

  resetSessionStats: () => {
    set({
      totalSessionWins: 0n,
      totalSessionLosses: 0n,
      spinCount: 0,
    });
  },

  reset: () => {
    set(initialState);
  },
}));

export default useGameStore;
