-- ============================================================================
-- Spin Vault: Initial Schema Migration
-- ============================================================================
-- Creates all 9 tables with Row Level Security policies.
-- Tables ordered for foreign key dependencies.
-- ============================================================================

-- ============================================================================
-- 1. USERS (extends auth.users)
-- ============================================================================
-- Public profile data linked to Supabase Auth.
-- Created automatically on first sign-in via trigger.

CREATE TABLE public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE,
    avatar_url text,
    level int NOT NULL DEFAULT 1,
    xp bigint NOT NULL DEFAULT 0,
    vip_tier int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Public user profiles extending auth.users';

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- 2. WALLETS (one per user)
-- ============================================================================
-- Coin balance with starting balance of 5,000,000.
-- Balance must never go negative.

CREATE TABLE public.wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    balance bigint NOT NULL DEFAULT 5000000 CHECK (balance >= 0),
    lifetime_winnings bigint NOT NULL DEFAULT 0,
    lifetime_wagered bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.wallets IS 'User coin wallets with balance tracking';
COMMENT ON COLUMN public.wallets.balance IS 'Current coin balance, minimum 0, starting 5000000';

CREATE INDEX wallets_user_id_idx ON public.wallets(user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_select_own" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wallets_insert_own" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wallets_update_own" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- 3. DEVICES (one user, many devices)
-- ============================================================================
-- Tracks devices for session management and fraud detection.

CREATE TABLE public.devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_fingerprint text NOT NULL,
    device_name text,
    platform text NOT NULL, -- 'ios', 'android', 'web'
    app_version text,
    push_token text,
    last_active_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, device_fingerprint)
);

COMMENT ON TABLE public.devices IS 'User devices for multi-device support';

CREATE INDEX devices_user_id_idx ON public.devices(user_id);
CREATE INDEX devices_push_token_idx ON public.devices(push_token) WHERE push_token IS NOT NULL;

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devices_select_own" ON public.devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "devices_insert_own" ON public.devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "devices_update_own" ON public.devices
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "devices_delete_own" ON public.devices
    FOR DELETE USING (auth.uid() = user_id);


-- ============================================================================
-- 4. USER_PREFERENCES (one per user)
-- ============================================================================
-- User settings synced to server.

CREATE TABLE public.user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    sound_enabled boolean NOT NULL DEFAULT true,
    music_enabled boolean NOT NULL DEFAULT true,
    haptics_enabled boolean NOT NULL DEFAULT true,
    notifications_enabled boolean NOT NULL DEFAULT false,
    daily_reminder_time time,
    reduce_motion boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_preferences IS 'User preference settings';

CREATE INDEX user_preferences_user_id_idx ON public.user_preferences(user_id);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_select_own" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert_own" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update_own" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- 5. SESSIONS (login streaks, play sessions)
-- ============================================================================
-- Tracks app sessions for analytics and streak calculations.

CREATE TABLE public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    duration_seconds int GENERATED ALWAYS AS (
        CASE
            WHEN ended_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (ended_at - started_at))::int
            ELSE NULL
        END
    ) STORED,
    spins_count int NOT NULL DEFAULT 0,
    coins_won bigint NOT NULL DEFAULT 0,
    coins_wagered bigint NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.sessions IS 'App play sessions for analytics';

CREATE INDEX sessions_user_id_idx ON public.sessions(user_id);
CREATE INDEX sessions_started_at_idx ON public.sessions(started_at DESC);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_own" ON public.sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON public.sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own" ON public.sessions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- 6. SPIN_LOG (immutable audit trail — append only)
-- ============================================================================
-- Complete history of all spins. NEVER update or delete.
-- Used for RTP calculations, fraud detection, and auditing.

CREATE TABLE public.spin_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
    bet_amount bigint NOT NULL CHECK (bet_amount > 0),
    win_amount bigint NOT NULL DEFAULT 0 CHECK (win_amount >= 0),
    symbols jsonb NOT NULL, -- Array of 3 symbol IDs
    multiplier numeric(10,2) NOT NULL DEFAULT 1.0,
    is_free_spin boolean NOT NULL DEFAULT false,
    is_bonus_trigger boolean NOT NULL DEFAULT false,
    balance_before bigint NOT NULL,
    balance_after bigint NOT NULL,
    rng_seed text, -- For audit/verification
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.spin_log IS 'Immutable audit log of all spins - append only';
COMMENT ON COLUMN public.spin_log.symbols IS 'JSON array of 3 symbol IDs from spin result';

CREATE INDEX spin_log_user_id_idx ON public.spin_log(user_id);
CREATE INDEX spin_log_created_at_idx ON public.spin_log(created_at DESC);
CREATE INDEX spin_log_user_created_idx ON public.spin_log(user_id, created_at DESC);

ALTER TABLE public.spin_log ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT and INSERT their own rows
-- NO UPDATE or DELETE policies — append only
CREATE POLICY "spin_log_select_own" ON public.spin_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "spin_log_insert_own" ON public.spin_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Explicitly deny UPDATE and DELETE by not creating policies for them
-- RLS is enabled, so without policies these operations are blocked


-- ============================================================================
-- 7. TRANSACTIONS (coin credits — IAP, ads, rewards)
-- ============================================================================
-- All coin additions from external sources.
-- receipt_id UNIQUE prevents double-spending IAP receipts.

CREATE TYPE public.transaction_type AS ENUM (
    'daily_bonus',
    'hourly_bonus',
    'ad_reward',
    'iap_purchase',
    'level_up_bonus',
    'achievement_reward',
    'referral_bonus',
    'admin_credit',
    'refund'
);

CREATE TABLE public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type public.transaction_type NOT NULL,
    amount bigint NOT NULL CHECK (amount != 0),
    balance_before bigint NOT NULL,
    balance_after bigint NOT NULL,
    receipt_id text UNIQUE, -- IAP receipt ID, must be unique
    product_id text, -- IAP product ID
    platform text, -- 'ios', 'android', 'web'
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'All coin credits from external sources';
COMMENT ON COLUMN public.transactions.receipt_id IS 'Unique IAP receipt ID to prevent double-spend';

CREATE INDEX transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX transactions_created_at_idx ON public.transactions(created_at DESC);
CREATE INDEX transactions_user_created_idx ON public.transactions(user_id, created_at DESC);
CREATE INDEX transactions_type_idx ON public.transactions(type);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT and INSERT their own rows
-- NO UPDATE or DELETE policies
CREATE POLICY "transactions_select_own" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- 8. ACHIEVEMENTS (unlocked achievements per user)
-- ============================================================================
-- Tracks which achievements each user has unlocked.

CREATE TABLE public.achievements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_type text NOT NULL,
    progress int NOT NULL DEFAULT 0,
    unlocked_at timestamptz,
    reward_claimed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, achievement_type)
);

COMMENT ON TABLE public.achievements IS 'User achievement progress and unlocks';

CREATE INDEX achievements_user_id_idx ON public.achievements(user_id);
CREATE INDEX achievements_type_idx ON public.achievements(achievement_type);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_select_own" ON public.achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "achievements_insert_own" ON public.achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "achievements_update_own" ON public.achievements
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- 9. DELETION_LOG (GDPR — survives user deletion)
-- ============================================================================
-- Records account deletion requests for compliance.
-- user_id is NOT a foreign key so it survives user deletion.

CREATE TABLE public.deletion_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL, -- NOT a foreign key - must survive deletion
    deletion_requested_at timestamptz NOT NULL DEFAULT now(),
    deletion_completed_at timestamptz,
    reason text,
    metadata jsonb DEFAULT '{}'
);

COMMENT ON TABLE public.deletion_log IS 'GDPR deletion log - survives user deletion';
COMMENT ON COLUMN public.deletion_log.user_id IS 'Not a FK - must persist after user deletion';

CREATE INDEX deletion_log_user_id_idx ON public.deletion_log(user_id);
CREATE INDEX deletion_log_requested_at_idx ON public.deletion_log(deletion_requested_at DESC);

ALTER TABLE public.deletion_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access deletion_log for GDPR compliance
-- No user-facing policies - admin access only via service role
CREATE POLICY "deletion_log_service_role_only" ON public.deletion_log
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');


-- ============================================================================
-- TRIGGER: Auto-create user profile and wallet on auth signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.users (id)
    VALUES (NEW.id);

    -- Create wallet with starting balance
    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 5000000);

    -- Create default preferences
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- HELPER: Daily bonus tracking table
-- ============================================================================
-- Tracks daily bonus claims for streak calculations.

CREATE TABLE public.daily_bonus_claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    claim_date date NOT NULL DEFAULT CURRENT_DATE,
    claimed_at timestamptz NOT NULL DEFAULT now(),
    streak_day int NOT NULL DEFAULT 1,
    amount bigint NOT NULL,
    UNIQUE(user_id, claim_date)
);

COMMENT ON TABLE public.daily_bonus_claims IS 'Daily bonus claim history for streak tracking';

CREATE INDEX daily_bonus_claims_user_id_idx ON public.daily_bonus_claims(user_id);
CREATE INDEX daily_bonus_claims_claimed_at_idx ON public.daily_bonus_claims(claimed_at DESC);

ALTER TABLE public.daily_bonus_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_bonus_claims_select_own" ON public.daily_bonus_claims
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_bonus_claims_insert_own" ON public.daily_bonus_claims
    FOR INSERT WITH CHECK (auth.uid() = user_id);
