/**
 * walletSlice — Coin Balance & Betting
 *
 * Manages wallet balance, bet levels, and optimistic updates.
 * NEVER stores coin balance in AsyncStorage (server is source of truth).
 * Uses bigint for all coin amounts.
 */

import { create } from 'zustand';

import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const BET_LEVELS = [
  1000n,
  5000n,
  10000n,
  25000n,
  50000n,
  100000n,
  150000n,
  250000n,
] as const;

export const STARTING_COINS = 5_000_000n;
export const DEFAULT_BET = 5000n;
export const DAILY_FREE_COINS = 325_000n;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionType =
  | 'spin_bet'
  | 'spin_win'
  | 'daily_bonus'
  | 'ad_reward'
  | 'purchase'
  | 'refund'
  | 'admin_credit';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: bigint;
  createdAt: string;
}

interface WalletState {
  balance: bigint;
  previousBalance: bigint;
  currentBet: bigint;
  betLevelIndex: number;
  transactions: Transaction[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastDailyClaimAt: string | null;
  canClaimDaily: boolean;
  pendingSpinId: string | null;
  optimisticBalance: bigint | null;
}

interface WalletActions {
  // Init
  fetchBalance: () => Promise<void>;
  syncWithServer: () => Promise<void>;

  // Betting
  increaseBet: () => void;
  decreaseBet: () => void;
  setBetLevel: (index: number) => void;
  setMaxBet: () => void;
  canAffordBet: () => boolean;

  // Optimistic updates
  deductBet: (spinId: string) => void;
  creditWin: (amount: bigint) => void;
  reconcileBalance: (serverBalance: bigint, spinId: string) => void;
  rollbackOptimistic: (spinId: string) => void;

  // Daily bonus
  claimDailyBonus: () => Promise<boolean>;
  checkDailyBonusEligibility: () => void;

  // Transactions
  fetchTransactions: (limit?: number) => Promise<void>;

  reset: () => void;
}

type WalletStore = WalletState & WalletActions;

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialState: WalletState = {
  balance: 0n,
  previousBalance: 0n,
  currentBet: DEFAULT_BET,
  betLevelIndex: 1, // Index of DEFAULT_BET (5000n) in BET_LEVELS
  transactions: [],
  isLoading: false,
  isSyncing: false,
  error: null,
  lastDailyClaimAt: null,
  canClaimDaily: false,
  pendingSpinId: null,
  optimisticBalance: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useWalletStore = create<WalletStore>((set, get) => ({
  ...initialState,

  // ───────────────────────────────────────────────────────────────────────────
  // Init
  // ───────────────────────────────────────────────────────────────────────────

  fetchBalance: async () => {
    console.log('💰 [WALLET] Fetching balance from server...');
    set({ isLoading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error('❌ [WALLET] No authenticated user found');
        set({ isLoading: false, error: 'Not authenticated' });
        return;
      }

      console.log('🔍 [WALLET] Querying wallet for user:', user.id);
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('❌ [WALLET] Database query failed:', error);
        set({ isLoading: false, error: error.message });
        return;
      }

      const serverBalance = BigInt(data.balance);
      console.log('✅ [WALLET] Balance fetched:', serverBalance.toString(), 'coins');

      set({
        balance: serverBalance,
        previousBalance: serverBalance,
        isLoading: false,
      });
    } catch (err) {
      console.error('❌ [WALLET] Fetch balance error:', err);
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch balance',
      });
    }
  },

  syncWithServer: async () => {
    const { pendingSpinId } = get();

    // Don't sync while a spin is pending
    if (pendingSpinId !== null) return;

    set({ isSyncing: true });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({ isSyncing: false });
        return;
      }

      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (error === null && data !== null) {
        const serverBalance = BigInt(data.balance);
        set((state) => ({
          balance: serverBalance,
          previousBalance: state.balance,
          isSyncing: false,
        }));
      } else {
        set({ isSyncing: false });
      }
    } catch {
      set({ isSyncing: false });
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Betting
  // ───────────────────────────────────────────────────────────────────────────

  increaseBet: () => {
    const { betLevelIndex, balance } = get();
    const nextIndex = Math.min(betLevelIndex + 1, BET_LEVELS.length - 1);
    const nextBet = BET_LEVELS[nextIndex];

    // Only increase if we can afford it
    if (nextBet <= balance) {
      set({
        betLevelIndex: nextIndex,
        currentBet: nextBet,
      });
    }
  },

  decreaseBet: () => {
    const { betLevelIndex } = get();
    const nextIndex = Math.max(betLevelIndex - 1, 0);

    set({
      betLevelIndex: nextIndex,
      currentBet: BET_LEVELS[nextIndex],
    });
  },

  setBetLevel: (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, BET_LEVELS.length - 1));
    const bet = BET_LEVELS[clampedIndex];
    const { balance } = get();

    if (bet <= balance) {
      set({
        betLevelIndex: clampedIndex,
        currentBet: bet,
      });
    }
  },

  setMaxBet: () => {
    const { balance } = get();

    // Find highest bet level we can afford
    for (let i = BET_LEVELS.length - 1; i >= 0; i--) {
      if (BET_LEVELS[i] <= balance) {
        set({
          betLevelIndex: i,
          currentBet: BET_LEVELS[i],
        });
        return;
      }
    }
  },

  canAffordBet: () => {
    const { balance, currentBet } = get();
    return balance >= currentBet;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Optimistic Updates
  // ───────────────────────────────────────────────────────────────────────────

  deductBet: (spinId: string) => {
    const { balance, currentBet } = get();

    set({
      optimisticBalance: balance,
      pendingSpinId: spinId,
      previousBalance: balance,
      balance: balance - currentBet,
    });
  },

  creditWin: (amount: bigint) => {
    set((state) => ({
      balance: state.balance + amount,
    }));
  },

  reconcileBalance: (serverBalance: bigint, spinId: string) => {
    const { pendingSpinId } = get();

    // Only reconcile if this is the pending spin
    if (pendingSpinId === spinId) {
      set({
        balance: serverBalance,
        pendingSpinId: null,
        optimisticBalance: null,
      });
    }
  },

  rollbackOptimistic: (spinId: string) => {
    const { pendingSpinId, optimisticBalance } = get();

    // Only rollback if this is the pending spin
    if (pendingSpinId === spinId && optimisticBalance !== null) {
      set({
        balance: optimisticBalance,
        pendingSpinId: null,
        optimisticBalance: null,
      });
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Daily Bonus
  // ───────────────────────────────────────────────────────────────────────────

  claimDailyBonus: async () => {
    set({ isLoading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({ isLoading: false, error: 'Not authenticated' });
        return false;
      }

      // Call RPC function for daily bonus claim
      const { data, error } = await supabase.rpc('claim_daily_bonus', {
        p_user_id: user.id,
      });

      if (error) {
        set({ isLoading: false, error: error.message });
        return false;
      }

      // Cast the RPC response
      const response = data as unknown as {
        success: boolean;
        new_balance: string;
        error?: string;
      } | null;

      if (response !== null && response.success === true) {
        const newBalance = BigInt(response.new_balance);
        set((state) => ({
          balance: newBalance,
          previousBalance: state.balance,
          lastDailyClaimAt: new Date().toISOString(),
          canClaimDaily: false,
          isLoading: false,
        }));
        return true;
      }

      set({
        isLoading: false,
        error: response?.error ?? 'Failed to claim bonus',
      });
      return false;
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to claim daily bonus',
      });
      return false;
    }
  },

  checkDailyBonusEligibility: () => {
    const { lastDailyClaimAt } = get();

    if (lastDailyClaimAt === null) {
      set({ canClaimDaily: true });
      return;
    }

    const lastClaim = new Date(lastDailyClaimAt);
    const now = new Date();

    // Check if it's a new day (UTC)
    const lastClaimDay = lastClaim.toISOString().split('T')[0];
    const todayDay = now.toISOString().split('T')[0];

    set({ canClaimDaily: lastClaimDay !== todayDay });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Transactions
  // ───────────────────────────────────────────────────────────────────────────

  fetchTransactions: async (limit = 50) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('id, type, amount, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error === null && data !== null) {
        const transactions: Transaction[] = data.map((t) => ({
          id: t.id,
          type: t.type as TransactionType,
          amount: BigInt(t.amount),
          createdAt: t.created_at,
        }));

        set({ transactions });
      }
    } catch {
      // Silent fail for transactions fetch
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Reset
  // ───────────────────────────────────────────────────────────────────────────

  reset: () => {
    set(initialState);
  },
}));

export default useWalletStore;
