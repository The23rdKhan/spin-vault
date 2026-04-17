# In-App Purchase Setup Guide

Complete guide for configuring in-app purchases for Spin Vault.

---

## ✅ What's Already Done

- [x] `expo-in-app-purchases` package installed
- [x] `src/lib/iap.ts` created with full implementation
- [x] Shop screen (`app/(tabs)/shop.tsx`) updated to use real IAP
- [x] Supabase migration created (`004_iap_validation.sql`)
- [x] TypeScript compilation passes with zero errors

---

## 📦 Product IDs

The following coin packages are configured:

| Product ID | Coins | Price | Tag |
|------------|-------|-------|-----|
| `coins_50k` | 50,000 | $0.99 | - |
| `coins_150k` | 150,000 | $1.99 | POPULAR |
| `coins_500k` | 500,000 | $4.99 | - |
| `coins_1200k` | 1,200,000 | $9.99 | BEST VALUE |
| `coins_3m` | 3,000,000 | $19.99 | - |
| `coins_7500k` | 7,500,000 | $39.99 | - |

**IMPORTANT:** These product IDs must match exactly in both app stores!

---

## 🍎 Apple App Store Setup

### Step 1: Enroll in Apple Developer Program
1. Go to https://developer.apple.com/
2. Click "Account" → "Enroll"
3. Pay $99/year enrollment fee
4. Complete verification (can take 24-48 hours)

### Step 2: Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com/
2. Click "My Apps" → "+" → "New App"
3. Fill in details:
   - **Platform:** iOS
   - **Name:** Spin Vault
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** `com.spinvault.app` (from app.json)
   - **SKU:** `spin-vault-ios`

### Step 3: Create In-App Purchase Products
For each coin package:

1. In your app, click "Features" → "In-App Purchases"
2. Click "+" to create new product
3. Select **Consumable** (coins can be spent)
4. Fill in details:

**Example for coins_50k:**
```
Reference Name: 50,000 Coins
Product ID: coins_50k  ← MUST MATCH EXACTLY
Price: $0.99 (Tier 1)

Localizations (English):
  Display Name: 50,000 Coins
  Description: Get 50,000 coins to keep spinning!
```

Repeat for all 6 products.

### Step 4: Add Screenshot
- Upload at least 1 screenshot showing the coin package
- Can use a generic coin image or screenshot of shop screen

### Step 5: Submit for Review
- Products must be submitted with your app
- They'll be reviewed when you submit the app
- Can take 24-48 hours for approval

---

## 🤖 Google Play Console Setup

### Step 1: Create Google Play Developer Account
1. Go to https://play.google.com/console/signup
2. Pay one-time $25 fee
3. Complete account verification

### Step 2: Create App
1. Click "Create app"
2. Fill in details:
   - **App name:** Spin Vault
   - **Default language:** English (United States)
   - **App type:** Game
   - **Category:** Casino
   - **Free/Paid:** Free

### Step 3: Set Up Google Play Billing
1. Go to "Monetize" → "Products" → "In-app products"
2. Click "Create product"
3. Fill in details:

**Example for coins_50k:**
```
Product ID: coins_50k  ← MUST MATCH EXACTLY
Name: 50,000 Coins
Description: Get 50,000 coins to keep spinning!
Status: Active
Price: $0.99 (Default price)
```

Repeat for all 6 products.

### Step 4: Activate Products
- Toggle each product to "Active"
- Products are available immediately (no review needed)

---

## 🗄️ Supabase Database Setup

### Apply the Migration

**Option 1: Supabase CLI (Recommended)**
```bash
# Push the new migration
npx supabase db push
```

**Option 2: Manual via Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/004_iap_validation.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run"

### Verify Tables Created
Run this query to verify:
```sql
SELECT * FROM iap_products;
```

You should see all 6 coin packages.

---

## 🧪 Testing In-App Purchases

### iOS Sandbox Testing

1. **Create Sandbox Tester Account:**
   - App Store Connect → Users and Access → Sandbox Testers
   - Click "+"
   - Create test account (use fake email like `test1@spinvault.test`)
   - Password must be strong
   - **Important:** Don't sign in to App Store with this account on your device!

2. **Test on Device/Simulator:**
   - Build app with `eas build --profile preview --platform ios`
   - Install on device
   - When prompted to purchase, sign in with sandbox account
   - Purchase will show as "Sandbox" at top of screen
   - No real charge will occur

3. **Test Cases:**
   - [ ] Purchase completes successfully
   - [ ] Coins credited to wallet
   - [ ] Receipt saved to database
   - [ ] Duplicate purchase rejected
   - [ ] Cancelled purchase handled correctly
   - [ ] "Restore Purchases" button works

### Android Testing

1. **Add License Testers:**
   - Play Console → Setup → License testing
   - Add your Gmail accounts as testers
   - Click "Save"

2. **Create Internal Testing Track:**
   - Play Console → Testing → Internal testing
   - Create release
   - Upload APK/AAB
   - Add testers (max 100)

3. **Test Purchases:**
   - Install app from internal testing link
   - Make test purchase
   - Google will show "Test purchase" message
   - No real charge will occur

4. **Test Cards:**
   Google provides test cards that always succeed/fail:
   - Success: Any test account can make unlimited purchases
   - Cancellation: Cancel during payment flow

---

## ⚠️ Important Security Note

### Current Implementation

The current code **DOES NOT** validate receipts with Apple/Google servers. It trusts the client.

**From `004_iap_validation.sql`:**
```sql
-- TODO: In production, validate receipt with Apple/Google servers
-- For now, we trust the client (development only)
```

### Before Production Launch

You **MUST** implement server-side receipt validation:

#### Apple Receipt Validation
```typescript
// Add to src/lib/iap-validator.ts
async function validateAppleReceipt(receipt: string) {
  const response = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receipt,
      'password': process.env.APPLE_SHARED_SECRET, // Get from App Store Connect
    }),
  });

  const data = await response.json();

  if (data.status === 0) {
    return data.receipt; // Valid
  }

  throw new Error('Invalid receipt');
}
```

#### Google Play Receipt Validation
```typescript
// Use Google Play Developer API
import { google } from 'googleapis';

async function validateGoogleReceipt(productId: string, purchaseToken: string) {
  const androidPublisher = google.androidpublisher('v3');

  const result = await androidPublisher.purchases.products.get({
    packageName: 'com.spinvault.app',
    productId,
    token: purchaseToken,
    auth: googleAuth, // Service account credentials
  });

  if (result.data.purchaseState === 0) {
    return result.data; // Valid
  }

  throw new Error('Invalid receipt');
}
```

#### Update Supabase Function
Modify `validate_iap_receipt` in `004_iap_validation.sql` to call validation service.

**Options:**
1. Supabase Edge Function (recommended)
2. External API endpoint
3. Firebase Cloud Function

---

## 🔧 Troubleshooting

### "Product not found"
- **Cause:** Product IDs don't match
- **Fix:** Verify product IDs in App Store Connect / Play Console match `src/lib/iap.ts` exactly

### "Cannot connect to iTunes Store" (iOS)
- **Cause:** Not signed in with sandbox account
- **Fix:** Settings → App Store → Sign Out → Sign in with sandbox tester when prompted

### "Item not available for purchase" (iOS)
- **Cause:** Products not approved or agreements missing
- **Fix:** Check "Agreements, Tax, and Banking" in App Store Connect

### "This version of the application is not configured for billing" (Android)
- **Cause:** App not published to any track (even internal)
- **Fix:** Upload to internal testing track first

### Purchases not showing in app
- **Cause:** IAP initialization failed
- **Fix:** Check console logs for initialization errors

### Duplicate receipt error
- **Cause:** Transaction ID already used
- **Fix:** This is correct behavior - prevents double-charging

---

## 📝 Checklist Before Launch

### App Stores
- [ ] Products created in App Store Connect
- [ ] Products created in Google Play Console
- [ ] All prices set correctly
- [ ] Screenshots added
- [ ] Products submitted with app

### Testing
- [ ] Tested on iOS with sandbox account
- [ ] Tested on Android with test account
- [ ] Verified coins credited correctly
- [ ] Tested "Restore Purchases" (iOS)
- [ ] Tested duplicate purchase rejection
- [ ] Tested cancellation flow

### Code
- [ ] `npx tsc --noEmit` passes
- [ ] Supabase migration applied
- [ ] Receipt validation implemented (CRITICAL)
- [ ] Product IDs match in all locations
- [ ] Error handling tested

### Security
- [ ] Server-side receipt validation implemented
- [ ] Duplicate transaction prevention working
- [ ] Database audit trail in place
- [ ] Rate limiting configured

---

## 📞 Support

### Apple IAP Issues
- Documentation: https://developer.apple.com/in-app-purchase/
- Support: https://developer.apple.com/contact/

### Google Play Issues
- Documentation: https://developer.android.com/google/play/billing
- Support: https://support.google.com/googleplay/android-developer

### Expo IAP Documentation
- Docs: https://docs.expo.dev/versions/latest/sdk/in-app-purchases/
- Forums: https://forums.expo.dev/

---

**Last Updated:** April 16, 2026

**Next Steps:**
1. Apply Supabase migration
2. Create products in App Store Connect
3. Create products in Google Play Console
4. Test with sandbox accounts
5. Implement receipt validation
6. Launch!
