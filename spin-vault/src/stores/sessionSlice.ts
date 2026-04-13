/**
 * sessionSlice — Auth & User Session
 *
 * Manages anonymous-first auth, session tracking, and achievements.
 * Primary auth method: supabase.auth.signInAnonymously()
 */

import { create } from 'zustand';
import type { Session as SupabaseSession, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuthStatus = 'unknown' | 'loading' | 'unauthenticated' | 'authenticated' | 'error';

type UserRow = Database['public']['Tables']['users']['Row'];
type DeviceRow = Database['public']['Tables']['devices']['Row'];
type SessionRow = Database['public']['Tables']['sessions']['Row'];
type AchievementRow = Database['public']['Tables']['achievements']['Row'];

interface SessionState {
  authStatus: AuthStatus;
  supabaseSession: SupabaseSession | null;
  user: User | null;
  userProfile: UserRow | null;
  currentDevice: DeviceRow | null;
  deviceId: string | null;
  currentAppSession: SessionRow | null;
  sessionStartedAt: string | null;
  achievements: AchievementRow[];
  unlockedAchievementTypes: Set<string>;
  isAnonymous: boolean;
  linkedEmail: string | null;
  isInitializing: boolean;
  isLinking: boolean;
  error: string | null;
}

interface SessionActions {
  // Init
  initialize: () => Promise<void>;
  checkSession: () => Promise<void>;

  // Anonymous auth (primary)
  signInAnonymously: () => Promise<void>;

  // Account linking
  linkWithEmail: (email: string, password: string) => Promise<boolean>;
  linkWithGoogle: () => Promise<boolean>;
  linkWithApple: () => Promise<boolean>;

  signOut: () => Promise<void>;

  // Device tracking
  registerDevice: (deviceInfo: string) => Promise<void>;

  // Session tracking
  startAppSession: () => Promise<void>;
  endAppSession: () => Promise<void>;
  heartbeat: () => Promise<void>;

  // Achievements
  fetchAchievements: () => Promise<void>;
  unlockAchievement: (type: string) => Promise<void>;
  checkAchievementUnlocked: (type: string) => boolean;

  // Account deletion
  requestAccountDeletion: (reason?: string) => Promise<void>;

  reset: () => void;
}

type SessionStore = SessionState & SessionActions;

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialState: SessionState = {
  authStatus: 'unknown',
  supabaseSession: null,
  user: null,
  userProfile: null,
  currentDevice: null,
  deviceId: null,
  currentAppSession: null,
  sessionStartedAt: null,
  achievements: [],
  unlockedAchievementTypes: new Set(),
  isAnonymous: true,
  linkedEmail: null,
  isInitializing: true,
  isLinking: false,
  error: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  // ───────────────────────────────────────────────────────────────────────────
  // Init
  // ───────────────────────────────────────────────────────────────────────────

  initialize: async () => {
    set({ isInitializing: true, authStatus: 'loading' });

    try {
      // Check for existing session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (session) {
        const user = session.user;
        const isAnonymous = user.is_anonymous ?? true;
        const linkedEmail = user.email ?? null;

        set({
          supabaseSession: session,
          user,
          isAnonymous,
          linkedEmail,
          authStatus: 'authenticated',
          isInitializing: false,
        });

        // Fetch user profile and achievements
        await get().fetchAchievements();
      } else {
        // No session — sign in anonymously
        await get().signInAnonymously();
      }
    } catch (err) {
      set({
        authStatus: 'error',
        isInitializing: false,
        error: err instanceof Error ? err.message : 'Initialization failed',
      });
    }
  },

  checkSession: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const user = session.user;
        const isAnonymous = user.is_anonymous ?? true;
        const linkedEmail = user.email ?? null;

        set({
          supabaseSession: session,
          user,
          isAnonymous,
          linkedEmail,
          authStatus: 'authenticated',
        });
      } else {
        set({
          supabaseSession: null,
          user: null,
          authStatus: 'unauthenticated',
        });
      }
    } catch {
      // Silent fail for session check
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Anonymous Auth
  // ───────────────────────────────────────────────────────────────────────────

  signInAnonymously: async () => {
    set({ authStatus: 'loading', error: null });

    try {
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        throw error;
      }

      if (data.session) {
        set({
          supabaseSession: data.session,
          user: data.user,
          isAnonymous: true,
          linkedEmail: null,
          authStatus: 'authenticated',
          isInitializing: false,
        });
      }
    } catch (err) {
      set({
        authStatus: 'error',
        isInitializing: false,
        error: err instanceof Error ? err.message : 'Anonymous sign-in failed',
      });
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Account Linking
  // ───────────────────────────────────────────────────────────────────────────

  linkWithEmail: async (email: string, password: string) => {
    set({ isLinking: true, error: null });

    try {
      const { data, error } = await supabase.auth.updateUser({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      set({
        user: data.user,
        isAnonymous: false,
        linkedEmail: email,
        isLinking: false,
      });

      return true;
    } catch (err) {
      set({
        isLinking: false,
        error: err instanceof Error ? err.message : 'Email linking failed',
      });
      return false;
    }
  },

  linkWithGoogle: async () => {
    set({ isLinking: true, error: null });

    try {
      const redirectTo = Linking.createURL('auth/callback');
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo },
      });

      if (error) {
        throw error;
      }

      // The OAuth flow will redirect, so we update state on return
      set({ isLinking: false });
      return true;
    } catch (err) {
      set({
        isLinking: false,
        error: err instanceof Error ? err.message : 'Google linking failed',
      });
      return false;
    }
  },

  linkWithApple: async () => {
    set({ isLinking: true, error: null });

    try {
      const redirectTo = Linking.createURL('auth/callback');
      const { error } = await supabase.auth.linkIdentity({
        provider: 'apple',
        options: { redirectTo },
      });

      if (error) {
        throw error;
      }

      set({ isLinking: false });
      return true;
    } catch (err) {
      set({
        isLinking: false,
        error: err instanceof Error ? err.message : 'Apple linking failed',
      });
      return false;
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();

      set({
        supabaseSession: null,
        user: null,
        userProfile: null,
        authStatus: 'unauthenticated',
        isAnonymous: true,
        linkedEmail: null,
        achievements: [],
        unlockedAchievementTypes: new Set(),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Sign out failed',
      });
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Device Tracking
  // ───────────────────────────────────────────────────────────────────────────

  registerDevice: async (deviceInfo: string) => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('devices')
        .upsert(
          {
            user_id: user.id,
            device_info: deviceInfo,
          },
          {
            onConflict: 'user_id,device_info',
          }
        )
        .select()
        .single();

      if (error === null && data !== null) {
        set({
          currentDevice: data,
          deviceId: data.id,
        });
      }
    } catch {
      // Silent fail for device registration
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Session Tracking
  // ───────────────────────────────────────────────────────────────────────────

  startAppSession: async () => {
    const { user, deviceId } = get();
    if (user === null || deviceId === null) return;

    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          device_id: deviceId,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error === null && data !== null) {
        set({
          currentAppSession: data,
          sessionStartedAt: data.started_at,
        });
      }
    } catch {
      // Silent fail for session start
    }
  },

  endAppSession: async () => {
    const { currentAppSession } = get();
    if (!currentAppSession) return;

    try {
      await supabase
        .from('sessions')
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq('id', currentAppSession.id);

      set({
        currentAppSession: null,
        sessionStartedAt: null,
      });
    } catch {
      // Silent fail for session end
    }
  },

  heartbeat: async () => {
    const { currentAppSession } = get();
    if (!currentAppSession) return;

    // Heartbeat can be used to update session activity
    // Implementation depends on server-side requirements
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Achievements
  // ───────────────────────────────────────────────────────────────────────────

  fetchAchievements: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id);

      if (error === null && data !== null) {
        const unlockedTypes = new Set(data.map((a) => a.achievement_type));

        set({
          achievements: data,
          unlockedAchievementTypes: unlockedTypes,
        });
      }
    } catch {
      // Silent fail for achievements fetch
    }
  },

  unlockAchievement: async (type: string) => {
    const { user, unlockedAchievementTypes } = get();

    // Already unlocked
    if (unlockedAchievementTypes.has(type)) return;
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('achievements')
        .insert({
          user_id: user.id,
          achievement_type: type,
        })
        .select()
        .single();

      if (error === null && data !== null) {
        set((state) => ({
          achievements: [...state.achievements, data],
          unlockedAchievementTypes: new Set([...state.unlockedAchievementTypes, type]),
        }));
      }
    } catch {
      // Silent fail for achievement unlock
    }
  },

  checkAchievementUnlocked: (type: string) => {
    return get().unlockedAchievementTypes.has(type);
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Account Deletion
  // ───────────────────────────────────────────────────────────────────────────

  requestAccountDeletion: async (reason?: string) => {
    const { user } = get();
    if (!user) return;

    try {
      // Log deletion request
      await supabase.from('deletion_log').insert({
        user_id: user.id,
        reason: reason ?? null,
      });

      // Call server-side deletion RPC
      await supabase.rpc('request_account_deletion', {
        p_user_id: user.id,
        p_reason: reason ?? null,
      });

      // Sign out after deletion request
      await get().signOut();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Account deletion failed',
      });
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Reset
  // ───────────────────────────────────────────────────────────────────────────

  reset: () => {
    set(initialState);
  },
}));

export default useSessionStore;
