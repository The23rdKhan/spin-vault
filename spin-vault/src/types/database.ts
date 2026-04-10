/**
 * Supabase Database Types
 * TODO: Generate with `npx supabase gen types typescript`
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      spin_log: {
        Row: {
          id: string;
          user_id: string;
          bet_amount: number;
          win_amount: number;
          result: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bet_amount: number;
          win_amount: number;
          result: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bet_amount?: number;
          win_amount?: number;
          result?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'spin_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_id: string;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_id?: string;
          started_at?: string;
          ended_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_device_id_fkey';
            columns: ['device_id'];
            isOneToOne: false;
            referencedRelation: 'devices';
            referencedColumns: ['id'];
          },
        ];
      };
      devices: {
        Row: {
          id: string;
          user_id: string;
          device_info: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_info: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_info?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_type: string;
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_type?: string;
          unlocked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'achievements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          sound_enabled: boolean;
          haptics_enabled: boolean;
          notifications_enabled: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          sound_enabled?: boolean;
          haptics_enabled?: boolean;
          notifications_enabled?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          sound_enabled?: boolean;
          haptics_enabled?: boolean;
          notifications_enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'user_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      deletion_log: {
        Row: {
          id: string;
          user_id: string;
          deleted_at: string;
          reason: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          deleted_at?: string;
          reason?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          deleted_at?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'deletion_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_daily_bonus: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      execute_spin: {
        Args: {
          p_user_id: string;
          p_bet_amount: number;
          p_is_free_spin: boolean;
          p_client_spin_id: string;
        };
        Returns: Json;
      };
      request_account_deletion: {
        Args: {
          p_user_id: string;
          p_reason: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for convenience
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
