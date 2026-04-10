-- ============================================================================
-- Spin Vault: Spin RPC Function
-- ============================================================================
-- Server-side RNG slot machine spin with atomic balance updates.
-- Prevents double-spend via SELECT FOR UPDATE on wallet row.
-- ============================================================================

-- ============================================================================
-- CONSTANTS: Valid bet levels
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_valid_bet_levels()
RETURNS bigint[] AS $$
BEGIN
    RETURN ARRAY[1000, 5000, 10000, 25000, 50000, 100000, 150000, 250000]::bigint[];
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================================
-- CONSTANTS: Symbol weights and payouts
-- ============================================================================
-- RTP target: 92%
-- Symbols ordered by rarity (most common first)

CREATE TYPE public.slot_symbol AS ENUM (
    'skull',    -- Most common (filler)
    'grape',
    'orange',
    'lemon',
    'cherry',
    'scatter',
    'diamond',
    'bell',
    'star',
    'seven'     -- Rarest (jackpot)
);

-- Symbol weights (higher = more common, total pool = 500)
CREATE OR REPLACE FUNCTION public.get_symbol_weights()
RETURNS TABLE (symbol public.slot_symbol, weight int) AS $$
BEGIN
    RETURN QUERY SELECT * FROM (VALUES
        ('skull'::public.slot_symbol,   293),  -- Filler (no win)
        ('grape'::public.slot_symbol,    60),
        ('orange'::public.slot_symbol,   50),
        ('lemon'::public.slot_symbol,    40),
        ('cherry'::public.slot_symbol,   30),
        ('scatter'::public.slot_symbol,  20),  -- Bonus trigger
        ('diamond'::public.slot_symbol,  15),
        ('bell'::public.slot_symbol,      8),
        ('star'::public.slot_symbol,      3),
        ('seven'::public.slot_symbol,     1)   -- Jackpot
    ) AS t(symbol, weight);
    -- Total: 293+60+50+40+30+20+15+8+3+1 = 500
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Payout multipliers for 3 matching symbols
CREATE OR REPLACE FUNCTION public.get_symbol_payout(sym public.slot_symbol)
RETURNS numeric AS $$
BEGIN
    RETURN CASE sym
        WHEN 'skull'   THEN 0.0    -- No payout (filler)
        WHEN 'grape'   THEN 2.0
        WHEN 'orange'  THEN 3.0
        WHEN 'lemon'   THEN 4.0
        WHEN 'cherry'  THEN 5.0
        WHEN 'scatter' THEN 0.0    -- Triggers bonus, no direct payout
        WHEN 'diamond' THEN 10.0
        WHEN 'bell'    THEN 25.0
        WHEN 'star'    THEN 50.0
        WHEN 'seven'   THEN 100.0  -- Jackpot
        ELSE 0.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================================
-- HELPER: Pick random symbol based on weights
-- ============================================================================

CREATE OR REPLACE FUNCTION public.pick_random_symbol()
RETURNS public.slot_symbol AS $$
DECLARE
    v_roll int;
    v_cumulative int := 0;
    v_symbol public.slot_symbol;
    v_weight int;
BEGIN
    -- Roll 1-500 (total weight pool = 500)
    v_roll := floor(random() * 500)::int + 1;

    -- Walk through weights until we hit the roll
    FOR v_symbol, v_weight IN SELECT * FROM public.get_symbol_weights() LOOP
        v_cumulative := v_cumulative + v_weight;
        IF v_roll <= v_cumulative THEN
            RETURN v_symbol;
        END IF;
    END LOOP;

    -- Fallback (should never happen if weights sum to 500)
    RETURN 'skull'::public.slot_symbol;
END;
$$ LANGUAGE plpgsql VOLATILE;


-- ============================================================================
-- HELPER: Calculate win from 3 symbols
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_spin_win(
    p_symbols public.slot_symbol[],
    p_bet_amount bigint
)
RETURNS TABLE (
    win_amount bigint,
    multiplier numeric,
    is_bonus_trigger boolean
) AS $$
DECLARE
    v_s1 public.slot_symbol := p_symbols[1];
    v_s2 public.slot_symbol := p_symbols[2];
    v_s3 public.slot_symbol := p_symbols[3];
    v_scatter_count int := 0;
    v_multiplier numeric := 0.0;
    v_is_bonus boolean := false;
BEGIN
    -- Count scatters
    v_scatter_count := (
        CASE WHEN v_s1 = 'scatter' THEN 1 ELSE 0 END +
        CASE WHEN v_s2 = 'scatter' THEN 1 ELSE 0 END +
        CASE WHEN v_s3 = 'scatter' THEN 1 ELSE 0 END
    );

    -- Bonus trigger: 3 scatters
    IF v_scatter_count >= 3 THEN
        v_is_bonus := true;
        v_multiplier := 5.0; -- Scatter bonus payout

    -- 3 of a kind (all same symbol)
    ELSIF v_s1 = v_s2 AND v_s2 = v_s3 THEN
        -- Get payout for matching symbol (skull = 0, scatter = 0)
        v_multiplier := public.get_symbol_payout(v_s1);

    -- 2 cherries anywhere = small win
    ELSIF (v_s1 = 'cherry' AND v_s2 = 'cherry') OR
          (v_s2 = 'cherry' AND v_s3 = 'cherry') OR
          (v_s1 = 'cherry' AND v_s3 = 'cherry') THEN
        v_multiplier := 1.5;

    -- 2 scatters = partial bonus (not full trigger)
    ELSIF v_scatter_count = 2 THEN
        v_multiplier := 2.0;

    END IF;

    RETURN QUERY SELECT
        (p_bet_amount * v_multiplier)::bigint AS win_amount,
        v_multiplier AS multiplier,
        v_is_bonus AS is_bonus_trigger;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================================
-- MAIN: spin() RPC function
-- ============================================================================
-- Atomic spin execution with balance protection.
-- SECURITY DEFINER allows RPC to update wallet regardless of RLS.

CREATE OR REPLACE FUNCTION public.spin(
    p_bet_amount bigint,
    p_session_spin_count int DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_wallet_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_symbols public.slot_symbol[];
    v_win_amount bigint;
    v_multiplier numeric;
    v_is_bonus_trigger boolean;
    v_spin_id uuid;
    v_rng_seed text;
    v_valid_bets bigint[];
    v_consecutive_losses int := 0;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Validate bet amount
    v_valid_bets := public.get_valid_bet_levels();
    IF NOT (p_bet_amount = ANY(v_valid_bets)) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid bet amount',
            'valid_bets', v_valid_bets
        );
    END IF;

    -- Lock wallet row and check balance (prevents double-spend)
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

    IF v_balance_before < p_bet_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient balance',
            'balance', v_balance_before,
            'bet_amount', p_bet_amount
        );
    END IF;

    -- Generate RNG seed for audit trail
    v_rng_seed := encode(gen_random_bytes(16), 'hex');

    -- Set random seed for reproducibility (optional audit feature)
    PERFORM setseed(('0.' || substring(v_rng_seed, 1, 15))::double precision);

    -- Pick 3 random symbols
    v_symbols := ARRAY[
        public.pick_random_symbol(),
        public.pick_random_symbol(),
        public.pick_random_symbol()
    ];

    -- Calculate win
    SELECT * INTO v_win_amount, v_multiplier, v_is_bonus_trigger
    FROM public.calculate_spin_win(v_symbols, p_bet_amount);

    -- Calculate new balance
    v_balance_after := v_balance_before - p_bet_amount + v_win_amount;

    -- Update wallet atomically
    UPDATE public.wallets
    SET
        balance = v_balance_after,
        lifetime_wagered = lifetime_wagered + p_bet_amount,
        lifetime_winnings = lifetime_winnings + v_win_amount,
        updated_at = now()
    WHERE id = v_wallet_id;

    -- Generate spin ID
    v_spin_id := gen_random_uuid();

    -- Insert spin log (append-only audit trail)
    INSERT INTO public.spin_log (
        id,
        user_id,
        bet_amount,
        win_amount,
        symbols,
        multiplier,
        is_free_spin,
        is_bonus_trigger,
        balance_before,
        balance_after,
        rng_seed,
        created_at
    ) VALUES (
        v_spin_id,
        v_user_id,
        p_bet_amount,
        v_win_amount,
        to_jsonb(v_symbols),
        v_multiplier,
        false,
        v_is_bonus_trigger,
        v_balance_before,
        v_balance_after,
        v_rng_seed,
        now()
    );

    -- Calculate consecutive losses (for near-miss/pity mechanics)
    IF v_win_amount = 0 THEN
        SELECT COUNT(*) INTO v_consecutive_losses
        FROM (
            SELECT id FROM public.spin_log
            WHERE user_id = v_user_id AND win_amount = 0
            ORDER BY created_at DESC
            LIMIT 20
        ) AS recent_losses;
    END IF;

    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'spin_id', v_spin_id,
        'symbols', v_symbols,
        'win_amount', v_win_amount,
        'multiplier', v_multiplier,
        'new_balance', v_balance_after,
        'is_bonus_trigger', v_is_bonus_trigger,
        'consecutive_losses', v_consecutive_losses
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.spin(bigint, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spin(bigint, int) TO authenticated;

COMMENT ON FUNCTION public.spin IS 'Execute a slot spin with server-side RNG and atomic balance updates';
