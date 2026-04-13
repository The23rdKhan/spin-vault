/**
 * uiSlice — Modals, Toasts, Loading
 *
 * Manages UI state including modal queue, toast notifications,
 * loading states, and navigation control.
 */

import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ModalType =
  | 'none'
  | 'daily_bonus'
  | 'win_celebration'
  | 'jackpot'
  | 'free_spins_start'
  | 'free_spins_end'
  | 'level_up'
  | 'achievement'
  | 'insufficient_coins'
  | 'shop'
  | 'settings'
  | 'confirm_exit'
  | 'link_account'
  | 'delete_account'
  | 'error';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export interface ModalData {
  winAmount?: bigint;
  achievementType?: string;
  freeSpinsCount?: number;
  level?: number;
  bonusCoins?: bigint;
  errorMessage?: string;
  jackpotAmount?: bigint;
}

interface QueuedModal {
  type: ModalType;
  data: ModalData | null;
}

interface UIState {
  activeModal: ModalType;
  modalData: ModalData | null;
  modalQueue: QueuedModal[];
  toasts: Toast[];
  isAppLoading: boolean;
  loadingMessage: string | null;
  activeTab: string;
  canNavigate: boolean;
  isLandscapeLocked: boolean;
  hasCompletedOnboarding: boolean;
  currentTutorialStep: number | null;
  isBalanceHidden: boolean;
  showWinAnimations: boolean;
}

interface UIActions {
  // Modals
  showModal: (type: ModalType, data?: ModalData) => void;
  hideModal: () => void;
  queueModal: (type: ModalType, data?: ModalData) => void;
  processModalQueue: () => void;

  // Toasts
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;

  // Loading
  setAppLoading: (loading: boolean, message?: string) => void;

  // Navigation
  setActiveTab: (tab: string) => void;
  setCanNavigate: (canNavigate: boolean) => void;

  // Onboarding
  setOnboardingComplete: () => void;
  setTutorialStep: (step: number | null) => void;

  toggleBalanceVisibility: () => void;
  reset: () => void;
}

type UIStore = UIState & UIActions;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TOASTS = 3;
const DEFAULT_TOAST_DURATION = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialState: UIState = {
  activeModal: 'none',
  modalData: null,
  modalQueue: [],
  toasts: [],
  isAppLoading: true,
  loadingMessage: null,
  activeTab: 'index',
  canNavigate: true,
  isLandscapeLocked: false,
  hasCompletedOnboarding: false,
  currentTutorialStep: null,
  isBalanceHidden: false,
  showWinAnimations: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateToastId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIStore>((set, get) => ({
  ...initialState,

  // ───────────────────────────────────────────────────────────────────────────
  // Modals
  // ───────────────────────────────────────────────────────────────────────────

  showModal: (type: ModalType, data?: ModalData) => {
    const { activeModal } = get();

    // If a modal is already showing, queue this one
    if (activeModal !== 'none') {
      get().queueModal(type, data);
      return;
    }

    set({
      activeModal: type,
      modalData: data ?? null,
    });
  },

  hideModal: () => {
    set({
      activeModal: 'none',
      modalData: null,
    });

    // Process queue after hiding
    setTimeout(() => {
      get().processModalQueue();
    }, 300); // Allow modal animation to complete
  },

  queueModal: (type: ModalType, data?: ModalData) => {
    set((state) => ({
      modalQueue: [...state.modalQueue, { type, data: data ?? null }],
    }));
  },

  processModalQueue: () => {
    const { modalQueue, activeModal } = get();

    // Don't process if a modal is active or queue is empty
    if (activeModal !== 'none' || modalQueue.length === 0) return;

    const [nextModal, ...remaining] = modalQueue;

    set({
      activeModal: nextModal.type,
      modalData: nextModal.data,
      modalQueue: remaining,
    });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Toasts
  // ───────────────────────────────────────────────────────────────────────────

  showToast: (toast: Omit<Toast, 'id'>) => {
    const id = generateToastId();
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || DEFAULT_TOAST_DURATION,
    };

    set((state) => {
      // Limit to MAX_TOASTS (remove oldest if needed)
      const existingToasts =
        state.toasts.length >= MAX_TOASTS ? state.toasts.slice(1) : state.toasts;

      return {
        toasts: [...existingToasts, newToast],
      };
    });

    // Auto-dismiss
    setTimeout(() => {
      get().dismissToast(id);
    }, newToast.duration);
  },

  showSuccess: (message: string) => {
    get().showToast({ type: 'success', message, duration: DEFAULT_TOAST_DURATION });
  },

  showError: (message: string) => {
    get().showToast({ type: 'error', message, duration: DEFAULT_TOAST_DURATION + 1000 });
  },

  showWarning: (message: string) => {
    get().showToast({ type: 'warning', message, duration: DEFAULT_TOAST_DURATION });
  },

  showInfo: (message: string) => {
    get().showToast({ type: 'info', message, duration: DEFAULT_TOAST_DURATION });
  },

  dismissToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Loading
  // ───────────────────────────────────────────────────────────────────────────

  setAppLoading: (loading: boolean, message?: string) => {
    set({
      isAppLoading: loading,
      loadingMessage: message ?? null,
    });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Navigation
  // ───────────────────────────────────────────────────────────────────────────

  setActiveTab: (tab: string) => {
    set({ activeTab: tab });
  },

  setCanNavigate: (canNavigate: boolean) => {
    set({ canNavigate });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Onboarding
  // ───────────────────────────────────────────────────────────────────────────

  setOnboardingComplete: () => {
    set({
      hasCompletedOnboarding: true,
      currentTutorialStep: null,
    });
  },

  setTutorialStep: (step: number | null) => {
    set({ currentTutorialStep: step });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Misc
  // ───────────────────────────────────────────────────────────────────────────

  toggleBalanceVisibility: () => {
    set((state) => ({
      isBalanceHidden: !state.isBalanceHidden,
    }));
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Reset
  // ───────────────────────────────────────────────────────────────────────────

  reset: () => {
    set(initialState);
  },
}));

export default useUIStore;
