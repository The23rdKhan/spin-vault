/**
 * settingsSlice — User Preferences
 *
 * Manages audio, haptics, notifications, and display preferences.
 * Uses AsyncStorage for local settings via Zustand persist.
 * Syncs critical settings to Supabase.
 *
 * NEVER stores coin balance in AsyncStorage.
 *
 * reduceMotion behavior:
 * - Initialized from AccessibilityInfo.isReduceMotionEnabled() on boot
 * - User can explicitly override via reduceMotionOverride
 * - If override is null, system setting is used
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';

import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type HapticIntensity = 'light' | 'medium' | 'heavy';

type SyncableField = 'sound_enabled' | 'haptics_enabled' | 'notifications_enabled';

interface SettingsState {
  // Audio
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;

  // Haptics
  hapticsEnabled: boolean;
  hapticIntensity: HapticIntensity;

  // Notifications
  notificationsEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string | null;
  promotionalNotifications: boolean;

  // Display
  systemReduceMotion: boolean;
  reduceMotionOverride: boolean | null; // null = follow system
  highContrast: boolean;

  // Privacy
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;

  // Sync
  isSyncing: boolean;
  lastSyncedAt: string | null;
  hasUnsyncedChanges: boolean;
  error: string | null;
}

interface SettingsActions {
  // Init
  loadSettings: () => Promise<void>;
  initializeReduceMotion: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  syncFieldToServer: (field: SyncableField, value: boolean) => Promise<void>;

  // Audio
  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  toggleSound: () => void;
  toggleMusic: () => void;

  // Haptics
  setHapticsEnabled: (enabled: boolean) => void;
  setHapticIntensity: (intensity: HapticIntensity) => void;
  toggleHaptics: () => void;

  // Notifications
  setNotificationsEnabled: (enabled: boolean) => void;
  requestNotificationPermission: () => Promise<boolean>;

  // Display
  setReduceMotion: (enabled: boolean) => void;
  clearReduceMotionOverride: () => void;

  // Computed
  getReduceMotion: () => boolean;

  resetToDefaults: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialState: SettingsState = {
  // Audio
  soundEnabled: true,
  musicEnabled: true,
  soundVolume: 0.8,
  musicVolume: 0.5,

  // Haptics
  hapticsEnabled: true,
  hapticIntensity: 'medium',

  // Notifications
  notificationsEnabled: false,
  dailyReminderEnabled: false,
  dailyReminderTime: null,
  promotionalNotifications: false,

  // Display
  systemReduceMotion: false,
  reduceMotionOverride: null,
  highContrast: false,

  // Privacy
  analyticsEnabled: true,
  crashReportingEnabled: true,

  // Sync
  isSyncing: false,
  lastSyncedAt: null,
  hasUnsyncedChanges: false,
  error: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ─────────────────────────────────────────────────────────────────────────
      // Init
      // ─────────────────────────────────────────────────────────────────────────

      loadSettings: async () => {
        // Initialize reduce motion from system
        await get().initializeReduceMotion();

        // Sync with server if authenticated
        await get().syncWithServer();
      },

      initializeReduceMotion: async () => {
        try {
          const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();

          set({ systemReduceMotion: isReduceMotionEnabled });

          // Subscribe to changes
          const subscription = AccessibilityInfo.addEventListener(
            'reduceMotionChanged',
            (enabled) => {
              set({ systemReduceMotion: enabled });
            }
          );

          // Note: In a real app, you'd want to store and clean up this subscription
          // For now, we keep it active for the lifetime of the app
          void subscription;
        } catch {
          // Fallback to false if API not available
          set({ systemReduceMotion: false });
        }
      },

      syncWithServer: async () => {
        set({ isSyncing: true, error: null });

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            set({ isSyncing: false });
            return;
          }

          // Fetch server preferences
          const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows found (new user)
            throw error;
          }

          if (data) {
            // Merge server settings (server wins for synced fields)
            set({
              soundEnabled: data.sound_enabled,
              hapticsEnabled: data.haptics_enabled,
              notificationsEnabled: data.notifications_enabled,
              isSyncing: false,
              lastSyncedAt: new Date().toISOString(),
              hasUnsyncedChanges: false,
            });
          } else {
            // Create initial server preferences
            const { soundEnabled, hapticsEnabled, notificationsEnabled } = get();

            await supabase.from('user_preferences').insert({
              user_id: user.id,
              sound_enabled: soundEnabled,
              haptics_enabled: hapticsEnabled,
              notifications_enabled: notificationsEnabled,
            });

            set({
              isSyncing: false,
              lastSyncedAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          set({
            isSyncing: false,
            error: err instanceof Error ? err.message : 'Sync failed',
          });
        }
      },

      syncFieldToServer: async (field: SyncableField, value: boolean) => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) return;

          // Create typed update object based on field
          const updateData =
            field === 'sound_enabled'
              ? { sound_enabled: value }
              : field === 'haptics_enabled'
                ? { haptics_enabled: value }
                : { notifications_enabled: value };

          await supabase.from('user_preferences').update(updateData).eq('user_id', user.id);
        } catch {
          // Silent fail for individual sync
        }
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Audio
      // ─────────────────────────────────────────────────────────────────────────

      setSoundEnabled: (enabled: boolean) => {
        set({ soundEnabled: enabled, hasUnsyncedChanges: true });
        void get().syncFieldToServer('sound_enabled', enabled);
      },

      setMusicEnabled: (enabled: boolean) => {
        set({ musicEnabled: enabled });
      },

      setSoundVolume: (volume: number) => {
        set({ soundVolume: Math.max(0, Math.min(1, volume)) });
      },

      setMusicVolume: (volume: number) => {
        set({ musicVolume: Math.max(0, Math.min(1, volume)) });
      },

      toggleSound: () => {
        const { soundEnabled } = get();
        get().setSoundEnabled(!soundEnabled);
      },

      toggleMusic: () => {
        const { musicEnabled } = get();
        set({ musicEnabled: !musicEnabled });
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Haptics
      // ─────────────────────────────────────────────────────────────────────────

      setHapticsEnabled: (enabled: boolean) => {
        set({ hapticsEnabled: enabled, hasUnsyncedChanges: true });
        void get().syncFieldToServer('haptics_enabled', enabled);
      },

      setHapticIntensity: (intensity: HapticIntensity) => {
        set({ hapticIntensity: intensity });
      },

      toggleHaptics: () => {
        const { hapticsEnabled } = get();
        get().setHapticsEnabled(!hapticsEnabled);
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Notifications
      // ─────────────────────────────────────────────────────────────────────────

      setNotificationsEnabled: (enabled: boolean) => {
        set({ notificationsEnabled: enabled, hasUnsyncedChanges: true });
        void get().syncFieldToServer('notifications_enabled', enabled);
      },

      requestNotificationPermission: async () => {
        // TODO: Implement with expo-notifications
        // For now, just set to true
        set({ notificationsEnabled: true });
        return true;
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Display
      // ─────────────────────────────────────────────────────────────────────────

      setReduceMotion: (enabled: boolean) => {
        // User explicitly overrides system setting
        set({ reduceMotionOverride: enabled });
      },

      clearReduceMotionOverride: () => {
        // Reset to follow system setting
        set({ reduceMotionOverride: null });
      },

      getReduceMotion: () => {
        const { reduceMotionOverride, systemReduceMotion } = get();
        // User override takes precedence, otherwise use system setting
        return reduceMotionOverride ?? systemReduceMotion;
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Reset
      // ─────────────────────────────────────────────────────────────────────────

      resetToDefaults: () => {
        const { systemReduceMotion } = get();
        set({
          ...initialState,
          systemReduceMotion, // Preserve system setting
        });
      },
    }),
    {
      name: 'spin-vault-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields to AsyncStorage
        // NEVER persist coin balance
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        soundVolume: state.soundVolume,
        musicVolume: state.musicVolume,
        hapticsEnabled: state.hapticsEnabled,
        hapticIntensity: state.hapticIntensity,
        notificationsEnabled: state.notificationsEnabled,
        dailyReminderEnabled: state.dailyReminderEnabled,
        dailyReminderTime: state.dailyReminderTime,
        promotionalNotifications: state.promotionalNotifications,
        reduceMotionOverride: state.reduceMotionOverride,
        highContrast: state.highContrast,
        analyticsEnabled: state.analyticsEnabled,
        crashReportingEnabled: state.crashReportingEnabled,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

export default useSettingsStore;
