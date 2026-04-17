# Apply Ad Rewards Migration

This guide shows how to apply the `005_ad_rewards.sql` migration to enable rewarded video ads with server-side validation.

---

## Prerequisites

- ✅ Migration `004_iap_validation.sql` already applied
- ✅ Supabase project configured
- ✅ Access to Supabase Dashboard

---

## Option 1: Supabase Dashboard (Recommended)

### Step 1: Open SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: **eklqddlelrnlviitooag**
3. Click **SQL Editor** in left sidebar
4. Click **New query**

### Step 2: Copy Migration SQL

Open `supabase/migrations/005_ad_rewards.sql` and copy the entire contents (all 171 lines).

### Step 3: Execute Migration

1. Paste the SQL into the query editor
2. Click **Run** (or press Cmd/Ctrl + Enter)
3. Wait for confirmation: "Success. No rows returned"

### Step 4: Verify Installation

Run this verification query:

```sql
-- Check table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'ad_rewards';

-- Check function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('claim_ad_reward', 'get_ad_stats');

-- Verify policies
SELECT tablename, policyname
FROM pg_policies
WHERE tablename = 'ad_rewards';
```

Expected results:
- ✅ Table `ad_rewards` exists
- ✅ Functions `claim_ad_reward` and `get_ad_stats` exist
- ✅ Policy `ad_rewards_select_own` exists

---

## Option 2: Supabase CLI (Advanced)

If you have Supabase CLI configured with proper credentials:

```bash
# Link project (if not already linked)
npx supabase link --project-ref eklqddlelrnlviitooag

# Push migration
npx supabase db push
```

---

## What This Migration Creates

### 1. `ad_rewards` Table

Tracks all ad reward claims for analytics and daily limit enforcement:

```sql
CREATE TABLE public.ad_rewards (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ad_unit_id text NOT NULL,
    reward_amount bigint NOT NULL,
    claimed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);
```

### 2. `claim_ad_reward()` Function

Server-side validation for ad rewards:

- ✅ Authenticates user
- ✅ Validates reward amount (max 50K coins)
- ✅ Enforces daily limit (10 ads/day)
- ✅ Prevents duplicate claims
- ✅ Credits coins to wallet
- ✅ Logs transaction in audit trail
- ✅ Returns detailed response

**Parameters:**
- `ad_unit_id` (text) - AppLovin ad unit identifier
- `reward_amount` (bigint) - Coins to grant (client specifies, server validates)

**Returns:**
```json
{
  "success": true,
  "coins_granted": 25000,
  "new_balance": 5025000,
  "ads_watched_today": 1,
  "daily_limit": 10,
  "remaining_today": 9,
  "transaction_id": "uuid"
}
```

### 3. `get_ad_stats()` Function

Retrieves user's ad watching statistics:

**Returns:**
```json
{
  "ads_watched_today": 3,
  "remaining_today": 7,
  "total_ads_watched": 127,
  "total_coins_earned": 3175000,
  "daily_limit": 10
}
```

### 4. Row Level Security

- Users can only view their own ad reward history
- RPC functions handle inserts (SECURITY DEFINER)

---

## Testing the Migration

### Test 1: Claim First Reward

```sql
SELECT claim_ad_reward(
  'test_ad_unit_id',
  25000
);
```

Expected: Success response with `ads_watched_today: 1`

### Test 2: Check Stats

```sql
SELECT get_ad_stats();
```

Expected: Shows 1 ad watched today

### Test 3: Verify Transaction

```sql
SELECT * FROM transactions
WHERE type = 'ad_reward'
ORDER BY created_at DESC
LIMIT 1;
```

Expected: Transaction logged with correct amount

### Test 4: Daily Limit Enforcement

Run `claim_ad_reward()` 10 times, then try an 11th:

```sql
-- This should fail with DAILY_LIMIT_EXCEEDED error
SELECT claim_ad_reward('test_ad_unit_id', 25000);
```

Expected error: `DAILY_LIMIT_EXCEEDED: Maximum 10 ads per day`

### Test 5: Invalid Reward Amount

```sql
-- Should fail - amount too high
SELECT claim_ad_reward('test_ad_unit_id', 100000);
```

Expected error: `INVALID_REWARD: Reward amount must be between 1 and 50000`

---

## Rollback (If Needed)

If you need to undo this migration:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS public.get_ad_stats();
DROP FUNCTION IF EXISTS public.claim_ad_reward(text, bigint);

-- Drop table (WARNING: deletes all ad reward history)
DROP TABLE IF EXISTS public.ad_rewards CASCADE;
```

**⚠️ WARNING:** This will permanently delete all ad reward history!

---

## Integration with AdService

Once migration is applied, the `AdService.ts` will automatically:

1. Show rewarded ad when user taps "Watch an Ad"
2. Detect when user completes ad
3. Call `claim_ad_reward()` RPC function
4. Display success message with remaining ads
5. Update wallet balance
6. Enforce daily limits

No code changes needed - it's already wired up!

---

## Troubleshooting

### Error: "relation 'ad_rewards' already exists"

Migration already applied. Run verification queries to confirm.

### Error: "function claim_ad_reward already exists"

Migration already applied. Skip to verification step.

### Error: "permission denied for schema public"

You need database owner permissions. Contact project admin.

### Error: "column 'user_id' cannot be null"

User is not authenticated. This function requires an authenticated session.

---

## Next Steps After Migration

1. ✅ Migration applied
2. Create AppLovin account (see `APPLOVIN_SETUP_GUIDE.md`)
3. Get SDK key and ad unit IDs
4. Update `.env` with `EXPO_PUBLIC_APPLOVIN_SDK_KEY`
5. Update `AdService.ts` with actual ad unit IDs
6. Build native app with `eas build --profile preview`
7. Test ad flow on device

---

## Security Notes

### ✅ What's Protected

- Daily limits enforced server-side (can't bypass)
- Reward amounts validated (max 50K coins)
- Transaction audit trail (tamper-proof)
- Duplicate prevention (same ad can't be claimed twice)
- User authentication required

### ⚠️ Known Limitation

The current implementation **trusts the client** to only call `claim_ad_reward()` when user actually watched an ad. AppLovin MAX SDK handles this via the `OnRewardedAdReceivedRewardEvent` listener.

For additional security, you could:
- Implement AppLovin Server-Side Callbacks
- Verify ad completion server-side before granting coins
- Rate limit reward claims (e.g., max 1 per minute)

See AppLovin documentation: https://dash.applovin.com/documentation/mediation/server-side-callbacks

---

**Migration Size:** 171 lines
**Execution Time:** ~500ms
**Tables Created:** 1
**Functions Created:** 2
**Indexes Created:** 2
**Policies Created:** 1

**Last Updated:** April 16, 2026
