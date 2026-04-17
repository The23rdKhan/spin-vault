# Spin Vault API Documentation

This document describes the Supabase RPC (Remote Procedure Call) functions used by Spin Vault.

## Overview

All game logic is executed server-side via Supabase PostgreSQL functions to prevent client-side manipulation. The client calls these functions via the Supabase JS SDK.

---

## Authentication

All RPC functions require authentication. The user's `auth.uid()` is automatically available in the function context.

```typescript
import { supabase } from '../lib/supabase';

// All calls automatically include auth token
const { data, error } = await supabase.rpc('function_name', { param: value });
```

---

## RPC Functions

### 1. `spin_reel`

Executes a slot machine spin with server-side random number generation.

**Location:** `supabase/migrations/002_spin_rpc.sql`

#### Parameters

```typescript
{
  bet_amount: number; // Must match allowed bet levels (1000, 5000, 10000, etc.)
}
```

#### Returns

```typescript
{
  spin_id: string;           // UUID of the spin_log entry
  symbols: number[];         // Array of 3 symbol IDs [0-9]
  win_amount: number;        // Amount won (0 if no win)
  win_lines: {               // Winning combinations (if any)
    line_id: number;
    symbols: number[];
    payout_multiplier: number;
  }[];
  new_balance: number;       // User's updated coin balance
  xp_gained: number;         // XP awarded for this spin
  new_level?: number;        // New level if user leveled up
}
```

#### Errors

- `INSUFFICIENT_BALANCE` - User doesn't have enough coins
- `INVALID_BET_AMOUNT` - Bet amount not in allowed list
- `RATE_LIMIT_EXCEEDED` - Too many spins per minute

#### Example

```typescript
const { data, error } = await supabase.rpc('spin_reel', {
  bet_amount: 5000
});

if (error) {
  console.error('Spin failed:', error.message);
  return;
}

console.log('Symbols:', data.symbols);           // [3, 7, 7]
console.log('Win amount:', data.win_amount);     // 50000
console.log('New balance:', data.new_balance);   // 5045000
```

#### Implementation Details

1. Validates bet amount against allowed levels
2. Checks user has sufficient balance
3. Generates 3 random symbols (0-9) using `random()`
4. Evaluates win conditions (3-of-a-kind, 2-of-a-kind, etc.)
5. Calculates payout based on paytable
6. Updates wallet balance
7. Logs transaction in `spin_log` table
8. Awards XP and checks for level up
9. Returns result

---

### 2. `claim_daily_bonus`

Awards the daily login bonus to the user.

**Location:** `supabase/migrations/003_helper_rpcs.sql`

#### Parameters

None (uses `auth.uid()`)

#### Returns

```typescript
{
  bonus_amount: number;      // Coins awarded
  streak_days: number;       // Current login streak
  next_claim_at: string;     // ISO timestamp of next eligible claim
  new_balance: number;       // Updated wallet balance
}
```

#### Errors

- `ALREADY_CLAIMED` - Bonus already claimed today
- `COOLDOWN_ACTIVE` - Must wait until next_claim_at

#### Example

```typescript
const { data, error } = await supabase.rpc('claim_daily_bonus');

if (error?.message === 'ALREADY_CLAIMED') {
  console.log('Come back tomorrow!');
  return;
}

console.log(`Claimed ${data.bonus_amount} coins!`);
console.log(`Streak: ${data.streak_days} days`);
```

#### Bonus Tiers

| Streak Days | Bonus Amount |
|-------------|--------------|
| 1           | 50,000       |
| 2           | 75,000       |
| 3           | 100,000      |
| 4           | 125,000      |
| 5           | 150,000      |
| 6           | 175,000      |
| 7+          | 250,000      |

---

### 3. `validate_iap_receipt`

Validates an in-app purchase receipt and credits coins.

**Location:** `supabase/migrations/003_helper_rpcs.sql`

#### Parameters

```typescript
{
  product_id: string;        // IAP product ID (e.g., 'coins_100k')
  receipt_data: string;      // Base64-encoded receipt
  platform: 'ios' | 'android';
}
```

#### Returns

```typescript
{
  transaction_id: string;    // UUID of transaction record
  coins_granted: number;     // Number of coins added
  new_balance: number;       // Updated wallet balance
}
```

#### Errors

- `INVALID_RECEIPT` - Receipt validation failed
- `DUPLICATE_RECEIPT` - Receipt already used
- `PRODUCT_NOT_FOUND` - Unknown product ID

#### Example

```typescript
const { data, error } = await supabase.rpc('validate_iap_receipt', {
  product_id: 'coins_100k',
  receipt_data: 'BASE64_ENCODED_RECEIPT',
  platform: 'ios'
});

if (error) {
  console.error('Purchase failed:', error.message);
  return;
}

console.log(`Granted ${data.coins_granted} coins`);
```

#### Product IDs

| Product ID    | Coins    | Price (USD) |
|---------------|----------|-------------|
| coins_100k    | 100,000  | $0.99       |
| coins_500k    | 500,000  | $4.99       |
| coins_1m      | 1,000,000| $9.99       |
| coins_5m      | 5,000,000| $24.99      |
| coins_10m     | 10,000,000| $49.99     |

---

### 4. `get_user_stats`

Retrieves comprehensive user statistics.

**Location:** `supabase/migrations/003_helper_rpcs.sql`

#### Parameters

None (uses `auth.uid()`)

#### Returns

```typescript
{
  total_spins: number;
  total_wagered: number;
  total_won: number;
  biggest_win: number;
  current_balance: number;
  level: number;
  xp: number;
  xp_to_next_level: number;
  achievements_unlocked: number;
  achievements_total: number;
  login_streak: number;
  account_age_days: number;
}
```

#### Example

```typescript
const { data, error } = await supabase.rpc('get_user_stats');

console.log('Total spins:', data.total_spins);
console.log('Win rate:', (data.total_won / data.total_wagered * 100).toFixed(2) + '%');
```

---

### 5. `unlock_achievement`

Unlocks an achievement and awards the bonus.

**Location:** `supabase/migrations/003_helper_rpcs.sql`

#### Parameters

```typescript
{
  achievement_id: string;    // Achievement identifier
}
```

#### Returns

```typescript
{
  achievement_unlocked: boolean;
  reward_amount: number;     // Coins awarded
  new_balance: number;
  already_unlocked?: boolean;
}
```

#### Example

```typescript
const { data, error } = await supabase.rpc('unlock_achievement', {
  achievement_id: 'first_spin'
});

if (data.already_unlocked) {
  console.log('Achievement already unlocked');
} else {
  console.log(`Unlocked! Earned ${data.reward_amount} coins`);
}
```

---

### 6. `claim_ad_reward`

Awards coins for watching a rewarded video ad.

**Location:** `supabase/migrations/003_helper_rpcs.sql`

#### Parameters

```typescript
{
  ad_unit_id: string;        // AppLovin ad unit ID
  reward_amount: number;     // Amount to award (validated server-side)
}
```

#### Returns

```typescript
{
  coins_granted: number;
  new_balance: number;
  ads_watched_today: number;
  daily_limit_reached: boolean;
}
```

#### Limits

- Maximum 10 ads per day per user
- Reward amount validated against allowed values (5000, 10000, 25000)

---

## Error Handling

All RPC functions return errors in a consistent format:

```typescript
{
  error: {
    message: string;         // Error code (e.g., 'INSUFFICIENT_BALANCE')
    details: string;         // Human-readable description
    hint?: string;           // Suggestion for resolution
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INSUFFICIENT_BALANCE` | Not enough coins for operation |
| `INVALID_BET_AMOUNT` | Bet not in allowed list |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `ALREADY_CLAIMED` | Resource already claimed |
| `INVALID_RECEIPT` | IAP receipt validation failed |
| `DUPLICATE_RECEIPT` | Receipt already processed |
| `PRODUCT_NOT_FOUND` | Unknown product ID |
| `ACHIEVEMENT_NOT_FOUND` | Invalid achievement ID |
| `UNAUTHORIZED` | Not authenticated |

---

## Rate Limits

| Function | Limit |
|----------|-------|
| `spin_reel` | 60 per minute |
| `claim_daily_bonus` | 1 per day |
| `validate_iap_receipt` | 10 per minute |
| `claim_ad_reward` | 10 per day |
| `get_user_stats` | 100 per minute |

---

## Database Tables

### `spin_log`

Records every spin for analytics.

```sql
CREATE TABLE spin_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  bet_amount bigint NOT NULL,
  win_amount bigint NOT NULL,
  symbols integer[] NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### `transactions`

Ledger of all coin movements.

```sql
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  type text NOT NULL,  -- 'spin_bet', 'spin_win', 'purchase', 'bonus', etc.
  amount bigint NOT NULL,
  balance_after bigint NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

---

## Testing RPC Functions

### Using Supabase Dashboard

1. Go to SQL Editor in Supabase Dashboard
2. Run test queries:

```sql
-- Test spin_reel as user
SELECT * FROM spin_reel(5000);

-- Test daily bonus
SELECT * FROM claim_daily_bonus();
```

### Using Client Code

```typescript
// Test in development
if (__DEV__) {
  const testSpin = async () => {
    const { data, error } = await supabase.rpc('spin_reel', { bet_amount: 1000 });
    console.log('Test spin result:', data);
  };
}
```

---

## Security Considerations

1. **All validation server-side** - Never trust client input
2. **Row Level Security** - All tables have RLS policies
3. **Auth required** - All functions check `auth.uid()`
4. **Rate limiting** - Prevents abuse
5. **Receipt validation** - IAP receipts verified with Apple/Google
6. **Audit trail** - All transactions logged

---

## Future RPC Functions (Planned)

- `create_tournament_entry(tournament_id, entry_fee)`
- `claim_tournament_reward(tournament_id)`
- `send_friend_request(user_id)`
- `claim_hourly_bonus()`
- `purchase_vip_tier(tier)`

---

## Support

For API questions or issues:
- **Email:** dev@spinvault.app
- **GitHub Issues:** https://github.com/hushdogg/spin-vault/issues
