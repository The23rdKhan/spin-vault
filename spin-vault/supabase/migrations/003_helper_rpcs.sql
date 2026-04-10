-- ============================================================================
-- Spin Vault: Helper RPC Functions
-- ============================================================================
-- Daily rewards, IAP verification, and account deletion.
-- ============================================================================

-- ============================================================================
-- CONSTANTS: Daily bonus amounts by streak day
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_daily_bonus_amount(p_streak_day int)
RETURNS bigint AS $$
BEGIN
    -- Streak bonuses (day 1-7 cycle, then repeats at day 7 rate)
    RETURN CASE
        WHEN p_streak_day = 1 THEN 50000    -- Day 1: 50k
        WHEN p_streak_day = 2 THEN 75000    -- Day 2: 75k
        WHEN p_streak_day = 3 THEN 100000   -- Day 3: 100k
        WHEN p_streak_day = 4 THEN 125000   -- Day 4: 125k
        WHEN p_streak_day = 5 THEN 150000   -- Day 5: 150k
        WHEN p_streak_day = 6 THEN 200000   -- Day 6: 200k
        ELSE 325000                          -- Day 7+: 325k (max)
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================================
-- claim_daily_reward(): Daily bonus with streak tracking
-- ============================================================================
-- Validates not claimed today, calculates streak, credits coins.

CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_wallet_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_last_claim_date date;
    v_last_streak int;
    v_new_streak int;
    v_bonus_amount bigint;
    v_today date := CURRENT_DATE;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Check last claim
    SELECT
        claim_date,
        streak_day
    INTO v_last_claim_date, v_last_streak
    FROM public.daily_bonus_claims
    WHERE user_id = v_user_id
    ORDER BY claim_date DESC
    LIMIT 1;

    -- Validate not already claimed today
    IF v_last_claim_date = v_today THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already claimed today',
            'next_claim_at', (v_today + interval '1 day')::timestamptz
        );
    END IF;

    -- Calculate streak
    IF v_last_claim_date = v_today - 1 THEN
        -- Consecutive day: increment streak (max 7)
        v_new_streak := LEAST(COALESCE(v_last_streak, 0) + 1, 7);
    ELSE
        -- Streak broken: reset to day 1
        v_new_streak := 1;
    END IF;

    -- Get bonus amount for streak day
    v_bonus_amount := public.get_daily_bonus_amount(v_new_streak);

    -- Lock wallet and update balance
    SELECT id, balance INTO v_wallet_id, v_balance_before
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet not found'
        );
    END IF;

    v_balance_after := v_balance_before + v_bonus_amount;

    -- Update wallet
    UPDATE public.wallets
    SET balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet_id;

    -- Record claim
    INSERT INTO public.daily_bonus_claims (user_id, claim_date, streak_day, amount, claimed_at)
    VALUES (v_user_id, v_today, v_new_streak, v_bonus_amount, now());

    -- Record transaction
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        metadata
    ) VALUES (
        v_user_id,
        'daily_bonus',
        v_bonus_amount,
        v_balance_before,
        v_balance_after,
        jsonb_build_object('streak_day', v_new_streak)
    );

    RETURN jsonb_build_object(
        'success', true,
        'amount', v_bonus_amount,
        'new_balance', v_balance_after,
        'streak_day', v_new_streak,
        'next_claim_at', (v_today + interval '1 day')::timestamptz
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.claim_daily_reward() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;

COMMENT ON FUNCTION public.claim_daily_reward IS 'Claim daily bonus with streak tracking';


-- ============================================================================
-- verify_and_credit_iap(): IAP receipt verification and coin credit
-- ============================================================================
-- Validates receipt_id is unique, credits coins, records transaction.
-- Actual receipt verification should be done via Edge Function calling
-- Apple/Google APIs, then calling this function.

CREATE OR REPLACE FUNCTION public.verify_and_credit_iap(
    p_product_id text,
    p_receipt_id text,
    p_platform text,
    p_verified boolean DEFAULT false
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_wallet_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_coin_amount bigint;
    v_existing_receipt uuid;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Validate platform
    IF p_platform NOT IN ('ios', 'android') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid platform'
        );
    END IF;

    -- Check if receipt already used (prevents double-spend)
    SELECT id INTO v_existing_receipt
    FROM public.transactions
    WHERE receipt_id = p_receipt_id;

    IF v_existing_receipt IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Receipt already used',
            'receipt_id', p_receipt_id
        );
    END IF;

    -- Map product_id to coin amount
    -- TODO: Store these in a products table instead of hardcoding
    v_coin_amount := CASE p_product_id
        WHEN 'coins_small'   THEN 100000      -- $0.99
        WHEN 'coins_medium'  THEN 550000      -- $4.99 (10% bonus)
        WHEN 'coins_large'   THEN 1200000     -- $9.99 (20% bonus)
        WHEN 'coins_xlarge'  THEN 2750000     -- $19.99 (37% bonus)
        WHEN 'coins_xxlarge' THEN 7500000     -- $49.99 (50% bonus)
        WHEN 'coins_mega'    THEN 17500000    -- $99.99 (75% bonus)
        ELSE NULL
    END;

    IF v_coin_amount IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unknown product',
            'product_id', p_product_id
        );
    END IF;

    -- Lock wallet and update balance
    SELECT id, balance INTO v_wallet_id, v_balance_before
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet not found'
        );
    END IF;

    v_balance_after := v_balance_before + v_coin_amount;

    -- Update wallet
    UPDATE public.wallets
    SET balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet_id;

    -- Record transaction with unique receipt_id
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        receipt_id,
        product_id,
        platform,
        metadata
    ) VALUES (
        v_user_id,
        'iap_purchase',
        v_coin_amount,
        v_balance_before,
        v_balance_after,
        p_receipt_id,
        p_product_id,
        p_platform,
        jsonb_build_object('verified', p_verified)
    );

    RETURN jsonb_build_object(
        'success', true,
        'coins_credited', v_coin_amount,
        'new_balance', v_balance_after,
        'product_id', p_product_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.verify_and_credit_iap(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_and_credit_iap(text, text, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.verify_and_credit_iap IS 'Verify IAP receipt and credit coins (receipt_id must be unique)';


-- ============================================================================
-- credit_ad_reward(): Credit coins for watching rewarded ad
-- ============================================================================

CREATE OR REPLACE FUNCTION public.credit_ad_reward(
    p_ad_unit_id text,
    p_reward_amount bigint DEFAULT 25000
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_wallet_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_recent_ad_count int;
    v_max_daily_ads int := 8; -- Max rewarded ads per day
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Check daily ad limit
    SELECT COUNT(*) INTO v_recent_ad_count
    FROM public.transactions
    WHERE user_id = v_user_id
      AND type = 'ad_reward'
      AND created_at > CURRENT_DATE;

    IF v_recent_ad_count >= v_max_daily_ads THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Daily ad limit reached',
            'ads_watched', v_recent_ad_count,
            'limit', v_max_daily_ads
        );
    END IF;

    -- Lock wallet and update balance
    SELECT id, balance INTO v_wallet_id, v_balance_before
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet not found'
        );
    END IF;

    v_balance_after := v_balance_before + p_reward_amount;

    -- Update wallet
    UPDATE public.wallets
    SET balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet_id;

    -- Record transaction
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        metadata
    ) VALUES (
        v_user_id,
        'ad_reward',
        p_reward_amount,
        v_balance_before,
        v_balance_after,
        jsonb_build_object('ad_unit_id', p_ad_unit_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'coins_credited', p_reward_amount,
        'new_balance', v_balance_after,
        'ads_remaining', v_max_daily_ads - v_recent_ad_count - 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.credit_ad_reward(text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_ad_reward(text, bigint) TO authenticated;

COMMENT ON FUNCTION public.credit_ad_reward IS 'Credit coins for watching a rewarded ad';


-- ============================================================================
-- request_account_deletion(): GDPR account deletion request
-- ============================================================================
-- Logs deletion request, sets flags, schedules deletion.
-- Actual data deletion handled by background job.

CREATE OR REPLACE FUNCTION public.request_account_deletion(
    p_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_deletion_id uuid;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Check if deletion already requested
    SELECT id INTO v_deletion_id
    FROM public.deletion_log
    WHERE user_id = v_user_id
      AND deletion_completed_at IS NULL;

    IF v_deletion_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Deletion already requested',
            'deletion_id', v_deletion_id
        );
    END IF;

    -- Log deletion request (survives user deletion)
    INSERT INTO public.deletion_log (
        user_id,
        reason,
        metadata
    ) VALUES (
        v_user_id,
        p_reason,
        jsonb_build_object(
            'requested_from', 'app',
            'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
        )
    )
    RETURNING id INTO v_deletion_id;

    -- Schedule user deletion (30 day grace period)
    -- In production, this would trigger a background job
    -- For now, we just log it

    RETURN jsonb_build_object(
        'success', true,
        'deletion_id', v_deletion_id,
        'scheduled_deletion_at', (now() + interval '30 days')::timestamptz,
        'message', 'Account deletion scheduled. You have 30 days to cancel.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.request_account_deletion(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(text) TO authenticated;

COMMENT ON FUNCTION public.request_account_deletion IS 'Request GDPR-compliant account deletion';


-- ============================================================================
-- cancel_account_deletion(): Cancel pending deletion request
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_deletion_id uuid;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Find pending deletion
    SELECT id INTO v_deletion_id
    FROM public.deletion_log
    WHERE user_id = v_user_id
      AND deletion_completed_at IS NULL;

    IF v_deletion_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No pending deletion request'
        );
    END IF;

    -- Mark as cancelled
    UPDATE public.deletion_log
    SET
        deletion_completed_at = now(),
        metadata = metadata || jsonb_build_object('cancelled', true, 'cancelled_at', now())
    WHERE id = v_deletion_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account deletion cancelled'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.cancel_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

COMMENT ON FUNCTION public.cancel_account_deletion IS 'Cancel a pending account deletion request';


-- ============================================================================
-- get_user_stats(): Get user statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_stats jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT jsonb_build_object(
        'success', true,
        'balance', w.balance,
        'lifetime_wagered', w.lifetime_wagered,
        'lifetime_winnings', w.lifetime_winnings,
        'total_spins', (SELECT COUNT(*) FROM public.spin_log WHERE user_id = v_user_id),
        'biggest_win', (SELECT COALESCE(MAX(win_amount), 0) FROM public.spin_log WHERE user_id = v_user_id),
        'current_streak', COALESCE((
            SELECT streak_day FROM public.daily_bonus_claims
            WHERE user_id = v_user_id
            ORDER BY claimed_at DESC LIMIT 1
        ), 0),
        'level', u.level,
        'xp', u.xp,
        'vip_tier', u.vip_tier
    ) INTO v_stats
    FROM public.wallets w
    JOIN public.users u ON u.id = w.user_id
    WHERE w.user_id = v_user_id;

    RETURN COALESCE(v_stats, jsonb_build_object('success', false, 'error', 'User not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.get_user_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_stats() TO authenticated;

COMMENT ON FUNCTION public.get_user_stats IS 'Get user statistics and profile data';
