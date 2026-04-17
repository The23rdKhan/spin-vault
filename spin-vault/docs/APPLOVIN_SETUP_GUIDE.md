# AppLovin MAX Setup Guide

Complete guide for configuring rewarded video ads with AppLovin MAX.

---

## ✅ What's Already Done

- [x] `react-native-applovin-max` package installed
- [x] `expo-build-properties` configured for native builds
- [x] `src/services/AdService.ts` created with full implementation
- [x] Shop screen updated to show real ads
- [x] Supabase migration created (`005_ad_rewards.sql`)
- [x] TypeScript compilation passes with zero errors

---

## 🎯 Reward Configuration

- **Reward Amount:** 25,000 coins per ad
- **Daily Limit:** 10 ads per user per day
- **Server Validation:** All rewards validated server-side
- **Duplicate Prevention:** Transaction audit trail

---

## 🚀 Step-by-Step Setup

### Step 1: Create AppLovin Account (10 minutes)

1. Go to https://dash.applovin.com/signup
2. Sign up for a free account
3. Verify your email address
4. Complete company information

### Step 2: Create an App (5 minutes)

1. Click "**Apps**" in left sidebar
2. Click "**+ Add App**"
3. Fill in details:
   - **Platform:** iOS and Android (create separate entries)
   - **App Name:** Spin Vault
   - **Bundle ID (iOS):** `com.spinvault.app`
   - **Package Name (Android):** `com.spinvault.app`
4. Click "**Create**"

### Step 3: Get SDK Key (1 minute)

1. Go to "**Account**" → "**Keys**"
2. Copy your **SDK Key** (looks like: `abc123xyz456...`)
3. Save it for later

### Step 4: Create Ad Units (5 minutes)

For **each platform** (iOS and Android):

1. Go to your app → "**Ad Units**"
2. Click "**+ Create Ad Unit**"
3. Select "**Rewarded**"
4. Fill in:
   - **Name:** Spin Vault Rewarded Video
   - **Format:** Rewarded Video
5. Click "**Create**"
6. **Copy the Ad Unit ID** (looks like: `abc123`)

You should now have:
- ✅ SDK Key
- ✅ iOS Ad Unit ID
- ✅ Android Ad Unit ID

### Step 5: Add Keys to Environment Variables

1. Open `.env` file in project root
2. Add these lines:
   ```bash
   # AppLovin MAX
   EXPO_PUBLIC_APPLOVIN_SDK_KEY=your_sdk_key_here
   ```

3. Open `src/services/AdService.ts`
4. Replace the ad unit IDs (lines 21-24):
   ```typescript
   const AD_UNIT_IDS = Platform.select({
     ios: 'your_ios_ad_unit_id',     // ← Replace
     android: 'your_android_ad_unit_id', // ← Replace
     default: '',
   });
   ```

### Step 6: Enable MAX Ad Review

1. Go to MAX → "**Mediation**" → "**Manage**"
2. Find "**AppLovin Network**"
3. Toggle to "**Enabled**"
4. Click "**Save**"

This enables test ads immediately!

### Step 7: Apply Database Migration

See `APPLY_MIGRATION.md` for instructions, or:

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/005_ad_rewards.sql`
3. Paste and click "**Run**"
4. Verify:
   ```sql
   SELECT * FROM ad_rewards;  -- Should exist (empty)
   ```

---

## 🧪 Testing Rewarded Ads

### Enable Test Mode

AppLovin provides test ads automatically in development mode!

**No extra setup needed** - just build and run:

```bash
# Build for testing
eas build --profile preview --platform ios
# or
eas build --profile preview --platform android
```

### Test Flow

1. Open app on device (not Expo Go - native build required)
2. Navigate to Shop tab
3. Tap "**Watch an Ad**" button
4. You should see:
   - "Loading ad..." toast
   - Test ad appears (usually a simple video)
   - "Skip" button appears after 5-30 seconds
   - Watch until completion
   - "+25,000 coins! 9 ads remaining today." success message

### Expected Behavior

✅ **Success:**
- Ad loads within 3-5 seconds
- Video plays smoothly
- Reward granted after completion
- Wallet balance updates immediately
- Counter shows remaining ads

❌ **Common Issues:**
See Troubleshooting section below

---

## 🎮 How It Works

### Client Side (AdService.ts)

1. **Initialize:** SDK connects to AppLovin on app start
2. **Load:** Pre-loads ads in background
3. **Show:** Displays ad when user taps button
4. **Reward:** Detects when user completes ad
5. **Claim:** Calls Supabase RPC to validate and credit coins

### Server Side (Supabase)

1. **Validate:** Checks if user exceeded daily limit (10 ads)
2. **Record:** Logs reward claim in `ad_rewards` table
3. **Credit:** Updates `wallets` table with coins
4. **Audit:** Logs transaction in `transactions` table
5. **Return:** Sends confirmation back to client

### Security

- ✅ **Server-authoritative** - Rewards validated server-side
- ✅ **Daily limits** - Enforced in database (10 ads/day)
- ✅ **Duplicate prevention** - Transaction audit trail
- ✅ **Amount validation** - Max 50K coins per ad (server check)

---

## 📊 Live vs Test Ads

### Test Ads (Development)

- **When:** Building with `preview` or `development` profile
- **What:** Simple AppLovin test videos
- **Revenue:** No real money
- **Limit:** Unlimited

### Live Ads (Production)

- **When:** Building with `production` profile, app published
- **What:** Real advertiser campaigns
- **Revenue:** You earn money (~$0.01-0.10 per ad)
- **Limit:** Based on advertiser fill rate

**Note:** Live ads require app to be published and have real users!

---

## 💰 Monetization Settings

### Revenue Optimization

1. Go to MAX → "**Mediation**" → "**Manage**"
2. Enable multiple ad networks for better fill rate:
   - AppLovin Network (built-in)
   - AdMob (Google)
   - Meta Audience Network
   - Unity Ads
   - Vungle
   - IronSource

**More networks = higher fill rate = more revenue**

### Minimum CPM

1. Go to Ad Unit → "**Settings**"
2. Set "**Floor Price**" (e.g., $5 CPM)
3. Ads below this won't show

---

## 🔍 Analytics & Reporting

### View Ad Performance

1. Go to MAX Dashboard → "**Reports**"
2. Select your app
3. See metrics:
   - **Impressions** - Ads shown
   - **eCPM** - Earnings per 1000 impressions
   - **Fill Rate** - % of ad requests filled
   - **Revenue** - Total earnings

### In-App Stats

Query user stats:
```sql
SELECT * FROM get_ad_stats();
```

Returns:
- `ads_watched_today` - Today's count
- `remaining_today` - How many left
- `total_ads_watched` - Lifetime total
- `total_coins_earned` - Total coins from ads

---

## ⚙️ Advanced Configuration

### Adjust Reward Amount

Edit `src/services/AdService.ts`:
```typescript
const AD_REWARD_COINS = 25_000; // ← Change this
```

### Adjust Daily Limit

Edit `src/services/AdService.ts`:
```typescript
const DAILY_AD_LIMIT = 10; // ← Change this
```

**AND** update Supabase function:
```sql
-- In 005_ad_rewards.sql, line 31
v_daily_limit int := 10;  -- ← Change this too
```

Then reapply the migration.

### Adjust Retry Timing

Edit `src/services/AdService.ts`:
```typescript
// Line 93 - Retry failed ad load after 5 seconds
setTimeout(() => {
  this.loadRewardedAd();
}, 5000); // ← Change delay (milliseconds)
```

---

## 🐛 Troubleshooting

### "Ads are not available. Please restart the app."

**Cause:** SDK not initialized
**Fix:**
1. Check `.env` has `EXPO_PUBLIC_APPLOVIN_SDK_KEY`
2. Verify SDK key is correct in AppLovin dashboard
3. Rebuild app with `eas build`

### "No ads available right now. Please try again in a moment."

**Cause:** No ad loaded yet
**Fix:**
1. Wait 3-5 seconds and try again
2. Check internet connection
3. Verify ad unit IDs are correct
4. Check AppLovin dashboard shows ad unit as "Active"

### "Failed to show ad. Please try again."

**Cause:** Ad failed to display
**Fix:**
1. Check device logs for error details
2. Verify ad unit ID matches platform (iOS/Android)
3. Try restarting app

### "Daily ad limit reached (10). Come back tomorrow!"

**Cause:** User watched 10 ads today (working as designed!)
**Fix:** Wait until next day, or increase limit (see Advanced Configuration)

### Ads not loading in production

**Cause:** Live ads require published app with real traffic
**Fix:**
1. Make sure app is published to App/Play Store
2. Wait 24-48 hours for ad networks to approve
3. Enable multiple networks in MAX dashboard for better fill

### TypeScript errors after installation

**Cause:** AppLovin types not updated
**Fix:** Already handled with `as any` type assertions - no action needed

---

## 📝 Checklist Before Launch

### AppLovin Setup
- [ ] Account created and verified
- [ ] App created for iOS and Android
- [ ] SDK key obtained
- [ ] Ad units created (iOS + Android)
- [ ] Ad units set to "Active"
- [ ] At least 1 ad network enabled in Mediation

### Code Configuration
- [ ] SDK key in `.env`
- [ ] Ad unit IDs updated in `AdService.ts`
- [ ] Daily limit set appropriately
- [ ] Reward amount configured

### Database
- [ ] Migration `005_ad_rewards.sql` applied
- [ ] `ad_rewards` table exists
- [ ] `claim_ad_reward()` function exists
- [ ] Verified with test query

### Testing
- [ ] Built native app (not Expo Go)
- [ ] Ad loads successfully
- [ ] Ad plays to completion
- [ ] Coins credited correctly
- [ ] Daily limit enforced
- [ ] Toast messages working

### Production
- [ ] App published to stores
- [ ] Multiple ad networks enabled
- [ ] Floor price set (optional)
- [ ] Analytics monitored

---

## 📞 Support

### AppLovin Support
- Dashboard: https://dash.applovin.com/
- Documentation: https://dash.applovin.com/documentation/mediation/react-native/getting-started
- Support: https://support.applovin.com/

### Common Questions

**Q: How much money can I make from ads?**
A: Typical rewarded video CPM is $5-$15. With 10,000 daily active users watching 3 ads each = $150-450/day.

**Q: Do I need to pay AppLovin?**
A: No, it's free! AppLovin takes a revenue share (typically 20-30%).

**Q: Can I show ads without user action?**
A: No, rewarded ads MUST be user-initiated. Don't show automatically.

**Q: What if ads don't fill?**
A: Enable multiple ad networks in MAX Mediation for better fill rate.

---

**Last Updated:** April 16, 2026

**Next Steps:**
1. Create AppLovin account
2. Get SDK key and ad unit IDs
3. Update environment variables
4. Apply database migration
5. Test with native build
6. Launch! 🚀
