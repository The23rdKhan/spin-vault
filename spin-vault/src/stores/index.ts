/**
 * Zustand Stores Index
 *
 * Re-exports all stores and types for easy importing.
 *
 * Usage:
 *   import { useWalletStore, useGameStore } from '@/stores';
 *   import type { GamePhase, SymbolId } from '@/stores';
 */

// ─────────────────────────────────────────────────────────────────────────────
// Stores
// ─────────────────────────────────────────────────────────────────────────────

export { useWalletStore } from './walletSlice';
export { useGameStore } from './gameSlice';
export { useSessionStore } from './sessionSlice';
export { useUIStore } from './uiSlice';
export { useSettingsStore } from './settingsSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export { BET_LEVELS, STARTING_COINS, DEFAULT_BET, DAILY_FREE_COINS } from './walletSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Types — Wallet
// ─────────────────────────────────────────────────────────────────────────────

export type { TransactionType, Transaction } from './walletSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Types — Game
// ─────────────────────────────────────────────────────────────────────────────

export type { SymbolId, GamePhase, ReelPosition, ReelGrid, WinLine, SpinResult } from './gameSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Types — Session
// ─────────────────────────────────────────────────────────────────────────────

export type { AuthStatus } from './sessionSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Types — UI
// ─────────────────────────────────────────────────────────────────────────────

export type { ModalType, ToastType, Toast, ModalData } from './uiSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Types — Settings
// ─────────────────────────────────────────────────────────────────────────────

export type { HapticIntensity } from './settingsSlice';
