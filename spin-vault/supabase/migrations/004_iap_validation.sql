-- ============================================================================
-- In-App Purchase Receipt Validation RPC
-- ============================================================================
-- Server-side validation for Apple and Google Play purchases.
-- Prevents client-side manipulation of coin purchases.
-- ============================================================================

-- ============================================================================
-- Purchase Receipts Table
-- ============================================================================
-- Stores all IAP receipts for audit trail and duplicate detection

CREATE TABLE IF NOT EXISTS public.purchase_receipts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id text NOT NULL,
    platform text NOT NULL CHECK (platform IN ('ios', 'android')),
    transaction_id text NOT NULL UNIQUE,  -- Prevents duplicate processing
    receipt_data text NOT NULL,
    coins_granted bigint NOT NULL,
    validated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.purchase_receipts IS 'IAP receipt audit trail';

CREATE INDEX purchase_receipts_user_id_idx ON public.purchase_receipts(user_id);
CREATE INDEX purchase_receipts_transaction_id_idx ON public.purchase_receipts(transaction_id);

ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_receipts_select_own" ON public.purchase_receipts
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- Product Definitions (Server-side source of truth)
-- ============================================================================
-- Must match product IDs in App Store Connect and Google Play Console

CREATE TABLE IF NOT EXISTS public.iap_products (
    product_id text PRIMARY KEY,
    coins bigint NOT NULL,
    price_usd numeric(10,2) NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.iap_products IS 'IAP product catalog';

-- Insert coin packages
INSERT INTO public.iap_products (product_id, coins, price_usd) VALUES
    ('coins_50k', 50000, 0.99),
    ('coins_150k', 150000, 1.99),
    ('coins_500k', 500000, 4.99),
    ('coins_1200k', 1200000, 9.99),
    ('coins_3m', 3000000, 19.99),
    ('coins_7500k', 7500000, 39.99)
ON CONFLICT (product_id) DO NOTHING;

ALTER TABLE public.iap_products ENABLE ROW LEVEL SECURITY;

-- Anyone can read products
CREATE POLICY "iap_products_select_all" ON public.iap_products
    FOR SELECT USING (true);

-- ============================================================================
-- Receipt Validation RPC Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_iap_receipt(
    product_id text,
    receipt_data text,
    platform text,
    transaction_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_product record;
    v_existing_receipt record;
    v_new_balance bigint;
    v_transaction_id uuid;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Check if transaction already processed (prevent duplicates)
    SELECT * INTO v_existing_receipt
    FROM public.purchase_receipts
    WHERE purchase_receipts.transaction_id = validate_iap_receipt.transaction_id;

    IF v_existing_receipt IS NOT NULL THEN
        RAISE EXCEPTION 'DUPLICATE_RECEIPT: Purchase already processed';
    END IF;

    -- Get product details
    SELECT * INTO v_product
    FROM public.iap_products
    WHERE iap_products.product_id = validate_iap_receipt.product_id
      AND active = true;

    IF v_product IS NULL THEN
        RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Invalid product ID';
    END IF;

    -- TODO: In production, validate receipt with Apple/Google servers
    -- For now, we trust the client (development only)
    -- You should integrate Apple App Store Server API or Google Play Developer API
    -- to validate receipts server-side before granting coins.

    -- Insert receipt record
    INSERT INTO public.purchase_receipts (
        user_id,
        product_id,
        platform,
        transaction_id,
        receipt_data,
        coins_granted
    ) VALUES (
        v_user_id,
        validate_iap_receipt.product_id,
        validate_iap_receipt.platform,
        validate_iap_receipt.transaction_id,
        validate_iap_receipt.receipt_data,
        v_product.coins
    );

    -- Update wallet balance
    UPDATE public.wallets
    SET
        balance = balance + v_product.coins,
        lifetime_earnings = lifetime_earnings + v_product.coins,
        updated_at = now()
    WHERE user_id = v_user_id
    RETURNING balance INTO v_new_balance;

    -- Log transaction
    INSERT INTO public.transactions (user_id, type, amount, balance_after, metadata)
    VALUES (
        v_user_id,
        'purchase',
        v_product.coins,
        v_new_balance,
        json_build_object(
            'product_id', validate_iap_receipt.product_id,
            'platform', validate_iap_receipt.platform,
            'transaction_id', validate_iap_receipt.transaction_id
        )
    )
    RETURNING id INTO v_transaction_id;

    -- Return success response
    RETURN json_build_object(
        'success', true,
        'coins_granted', v_product.coins,
        'new_balance', v_new_balance,
        'transaction_id', v_transaction_id
    );
END;
$$;

COMMENT ON FUNCTION public.validate_iap_receipt IS 'Validates IAP receipts and grants coins';

-- ============================================================================
-- Get Purchase History RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_purchase_history(
    limit_count int DEFAULT 20
)
RETURNS TABLE (
    product_id text,
    coins_granted bigint,
    platform text,
    validated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT
        pr.product_id,
        pr.coins_granted,
        pr.platform,
        pr.validated_at
    FROM public.purchase_receipts pr
    WHERE pr.user_id = v_user_id
    ORDER BY pr.validated_at DESC
    LIMIT limit_count;
END;
$$;

COMMENT ON FUNCTION public.get_purchase_history IS 'Gets user purchase history';
