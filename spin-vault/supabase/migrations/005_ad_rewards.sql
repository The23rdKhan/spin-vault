-- ============================================================================
-- Rewarded Ad Claims RPC
-- ============================================================================
-- Server-side validation for AppLovin MAX rewarded ad claims.
-- Prevents client-side manipulation and enforces daily limits.
-- ============================================================================

-- ============================================================================
-- Ad Rewards Table
-- ============================================================================
-- Tracks all ad reward claims for analytics and daily limit enforcement

CREATE TABLE IF NOT EXISTS public.ad_rewards (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ad_unit_id text NOT NULL,
    reward_amount bigint NOT NULL,
    claimed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ad_rewards IS 'Ad reward claims audit trail';

CREATE INDEX ad_rewards_user_id_idx ON public.ad_rewards(user_id);
CREATE INDEX ad_rewards_claimed_at_idx ON public.ad_rewards(claimed_at);

ALTER TABLE public.ad_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_rewards_select_own" ON public.ad_rewards
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- Claim Ad Reward RPC Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_ad_reward(
    ad_unit_id text,
    reward_amount bigint
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_ads_today int;
    v_daily_limit int := 10;  -- Maximum ads per day
    v_max_reward bigint := 50000;  -- Maximum reward per ad
    v_new_balance bigint;
    v_transaction_id uuid;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Validate reward amount (prevent client manipulation)
    IF reward_amount <= 0 OR reward_amount > v_max_reward THEN
        RAISE EXCEPTION 'INVALID_REWARD: Reward amount must be between 1 and %', v_max_reward;
    END IF;

    -- Count ads watched today
    SELECT COUNT(*) INTO v_ads_today
    FROM public.ad_rewards
    WHERE user_id = v_user_id
      AND claimed_at > CURRENT_DATE;

    -- Check daily limit
    IF v_ads_today >= v_daily_limit THEN
        RAISE EXCEPTION 'DAILY_LIMIT_EXCEEDED: Maximum % ads per day', v_daily_limit;
    END IF;

    -- Record ad reward claim
    INSERT INTO public.ad_rewards (
        user_id,
        ad_unit_id,
        reward_amount
    ) VALUES (
        v_user_id,
        claim_ad_reward.ad_unit_id,
        claim_ad_reward.reward_amount
    );

    -- Update wallet balance
    UPDATE public.wallets
    SET
        balance = balance + claim_ad_reward.reward_amount,
        lifetime_earnings = lifetime_earnings + claim_ad_reward.reward_amount,
        updated_at = now()
    WHERE user_id = v_user_id
    RETURNING balance INTO v_new_balance;

    -- Log transaction
    INSERT INTO public.transactions (user_id, type, amount, balance_after, metadata)
    VALUES (
        v_user_id,
        'ad_reward',
        claim_ad_reward.reward_amount,
        v_new_balance,
        json_build_object(
            'ad_unit_id', claim_ad_reward.ad_unit_id,
            'ads_today', v_ads_today + 1
        )
    )
    RETURNING id INTO v_transaction_id;

    -- Return success response
    RETURN json_build_object(
        'success', true,
        'coins_granted', claim_ad_reward.reward_amount,
        'new_balance', v_new_balance,
        'ads_watched_today', v_ads_today + 1,
        'daily_limit', v_daily_limit,
        'remaining_today', v_daily_limit - (v_ads_today + 1),
        'transaction_id', v_transaction_id
    );
END;
$$;

COMMENT ON FUNCTION public.claim_ad_reward IS 'Claims ad reward and enforces daily limits';

-- ============================================================================
-- Get Ad Stats RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_ad_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_ads_today int;
    v_total_ads int;
    v_total_earned bigint;
    v_daily_limit int := 10;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Count ads today
    SELECT COUNT(*) INTO v_ads_today
    FROM public.ad_rewards
    WHERE user_id = v_user_id
      AND claimed_at > CURRENT_DATE;

    -- Count total ads
    SELECT COUNT(*) INTO v_total_ads
    FROM public.ad_rewards
    WHERE user_id = v_user_id;

    -- Sum total earned from ads
    SELECT COALESCE(SUM(reward_amount), 0) INTO v_total_earned
    FROM public.ad_rewards
    WHERE user_id = v_user_id;

    RETURN json_build_object(
        'ads_watched_today', v_ads_today,
        'remaining_today', v_daily_limit - v_ads_today,
        'total_ads_watched', v_total_ads,
        'total_coins_earned', v_total_earned,
        'daily_limit', v_daily_limit
    );
END;
$$;

COMMENT ON FUNCTION public.get_ad_stats IS 'Gets user ad watching statistics';
