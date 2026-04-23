# Environment Setup Guide

## Overview

This guide helps you set up environment variables for Spin Vault. Environment variables keep sensitive credentials out of source code and allow different configurations for development, staging, and production.

---

## Quick Start

### 1. Create .env File

```bash
# Copy the example file
cp .env.example .env
```

### 2. Fill in Your Values

Open `.env` and add your credentials:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# Sentry Configuration (Error Tracking)
EXPO_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7890123
SENTRY_AUTH_TOKEN=sntrys_your_token_here
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=spin-vault

# AppLovin MAX (Ads)
EXPO_PUBLIC_APPLOVIN_SDK_KEY=your_applovin_sdk_key
```

### 3. Verify .gitignore

Ensure `.env` is in `.gitignore` (it already is):

```
.env
.env.local
.env.*.local
```

---

## Environment Variables Explained

### Supabase (Required)

**EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY**
- **What:** Public key for Supabase client
- **Where to get:** Supabase Dashboard → Project Settings → API
- **Format:** `sb_publishable_xxx...`
- **Used for:** Database queries, authentication, RPC calls
- **Prefix:** `EXPO_PUBLIC_` makes it available in client code

### Sentry (Required for Production)

**EXPO_PUBLIC_SENTRY_DSN**
- **What:** Data Source Name for error tracking
- **Where to get:** Sentry.io → Project Settings → Client Keys (DSN)
- **Format:** `https://abc123@o123456.ingest.sentry.io/7890123`
- **Used for:** Sending errors and performance data to Sentry
- **Prefix:** `EXPO_PUBLIC_` makes it available in client code

**SENTRY_AUTH_TOKEN**
- **What:** Authentication token for uploading source maps
- **Where to get:** Sentry.io → Settings → Auth Tokens
- **Format:** `sntrys_xxx...`
- **Used for:** Source map upload during builds (server-side)
- **Scopes needed:** `project:read`, `project:releases`, `org:read`

**SENTRY_ORG**
- **What:** Your Sentry organization slug
- **Where to get:** Sentry.io URL (sentry.io/organizations/**your-org**/)
- **Format:** Lowercase alphanumeric with hyphens
- **Used for:** Source map upload configuration

**SENTRY_PROJECT**
- **What:** Your Sentry project slug
- **Format:** `spin-vault` (or your project name)
- **Used for:** Source map upload configuration

### AppLovin MAX (Optional - for Ads)

**EXPO_PUBLIC_APPLOVIN_SDK_KEY**
- **What:** SDK key for AppLovin MAX ad network
- **Where to get:** AppLovin Dashboard → Account → Keys
- **Format:** Alphanumeric string
- **Used for:** Initializing ad SDK, showing rewarded ads
- **Note:** App works without this, ads will be disabled

---

## Environment-Specific Configurations

### Development (.env)

```bash
# Local development
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_dev_key_xxx
EXPO_PUBLIC_SENTRY_DSN=  # Leave empty or use dev DSN
EXPO_PUBLIC_APPLOVIN_SDK_KEY=  # Leave empty for dev
```

### Staging (.env.staging)

```bash
# Staging/testing environment
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_staging_key_xxx
EXPO_PUBLIC_SENTRY_DSN=https://staging_dsn@sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_staging_token
EXPO_PUBLIC_APPLOVIN_SDK_KEY=staging_applovin_key
```

### Production (.env.production)

```bash
# Production environment
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_prod_key_xxx
EXPO_PUBLIC_SENTRY_DSN=https://prod_dsn@sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_prod_token
EXPO_PUBLIC_APPLOVIN_SDK_KEY=prod_applovin_key
```

---

## How Environment Variables Work

### EXPO_PUBLIC_ Prefix

Variables with `EXPO_PUBLIC_` prefix are:
- **Embedded in the app bundle** at build time
- **Available in client code** via `process.env.EXPO_PUBLIC_XXX`
- **Safe for public keys** only (not secrets)

Example:
```typescript
// In your code
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
```

### Non-Prefixed Variables

Variables without prefix are:
- **Server-side only** (build scripts, CI/CD)
- **Never embedded in app bundle**
- **Safe for secrets** (auth tokens)

Example (in build scripts):
```bash
SENTRY_AUTH_TOKEN=xxx sentry-cli upload-sourcemaps
```

---

## Security Best Practices

### ✅ DO

- Use `.env` for local development
- Keep `.env` in `.gitignore`
- Use different credentials for dev/staging/prod
- Commit `.env.example` with empty values
- Rotate credentials if accidentally exposed
- Use `EXPO_PUBLIC_` only for public keys

### ❌ DON'T

- Commit `.env` to git
- Share your `.env` file
- Put secrets in `EXPO_PUBLIC_` variables
- Hardcode credentials in source code
- Use production credentials in development

---

## Setting Up Each Service

### Supabase Setup

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Settings** → **API**
4. Copy **anon/public** key
5. Add to `.env`:
   ```bash
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
   ```

### Sentry Setup

**Step 1: Get DSN**
1. Go to https://sentry.io
2. Select your project (or create one)
3. Click **Settings** → **Client Keys (DSN)**
4. Copy the DSN
5. Add to `.env`:
   ```bash
   EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
   ```

**Step 2: Get Auth Token**
1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Click **Create New Token**
3. Name: "Source Map Upload"
4. Scopes: `project:read`, `project:releases`, `org:read`
5. Copy token
6. Add to `.env`:
   ```bash
   SENTRY_AUTH_TOKEN=sntrys_xxx
   ```

**Step 3: Get Organization & Project**
1. Your URL: `sentry.io/organizations/YOUR_ORG/projects/YOUR_PROJECT/`
2. Add to `.env`:
   ```bash
   SENTRY_ORG=YOUR_ORG
   SENTRY_PROJECT=spin-vault
   ```

### AppLovin MAX Setup (Optional)

1. Go to https://dash.applovin.com/
2. Click **Account** → **Keys**
3. Copy SDK Key
4. Add to `.env`:
   ```bash
   EXPO_PUBLIC_APPLOVIN_SDK_KEY=your_key_here
   ```

---

## Troubleshooting

### "Environment variable undefined"

**Problem:** `process.env.EXPO_PUBLIC_XXX` is `undefined`

**Solutions:**
1. Check variable name has `EXPO_PUBLIC_` prefix
2. Restart Expo dev server (`npx expo start -c`)
3. Verify `.env` file exists in project root
4. Check for typos in variable name

### "Sentry not initializing"

**Problem:** Sentry doesn't track errors

**Solutions:**
1. Check `EXPO_PUBLIC_SENTRY_DSN` is set
2. Verify DSN format: `https://xxx@o123.ingest.sentry.io/123`
3. Check if running in `__DEV__` mode (Sentry disabled)
4. Look for console warnings about DSN

### "Source maps not uploading"

**Problem:** Production errors show minified code

**Solutions:**
1. Check `SENTRY_AUTH_TOKEN` is set
2. Verify token has correct scopes
3. Check `SENTRY_ORG` and `SENTRY_PROJECT` match Sentry dashboard
4. See `docs/SENTRY_SOURCEMAPS.md` for upload guide

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/build.yml
- name: Build app
  env:
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_KEY }}
    EXPO_PUBLIC_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: spin-vault
  run: |
    eas build --platform ios --profile production
```

**Setup GitHub Secrets:**
1. Go to repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each environment variable
4. Reference with `${{ secrets.VARIABLE_NAME }}`

### EAS Build

**Option 1: Use .env files**
```bash
# Development
eas build --profile development

# Production
eas build --profile production
```

EAS automatically reads `.env` files.

**Option 2: eas.json environment variables**

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SENTRY_DSN": "https://xxx@sentry.io/xxx"
      }
    }
  }
}
```

---

## Validation Script

Create `scripts/validate-env.js`:

```javascript
const requiredVars = [
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_SENTRY_DSN',
];

const missing = requiredVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
}

console.log('✅ All required environment variables are set');
```

Run before builds:
```bash
node scripts/validate-env.js
```

---

## Summary

**Minimum Required:**
- ✅ `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (database access)

**Recommended for Production:**
- ✅ `EXPO_PUBLIC_SENTRY_DSN` (error tracking)
- ✅ `SENTRY_AUTH_TOKEN` (source maps)
- ✅ `SENTRY_ORG` (source maps)
- ✅ `SENTRY_PROJECT` (source maps)

**Optional:**
- `EXPO_PUBLIC_APPLOVIN_SDK_KEY` (ads)

**Next Steps:**
1. Copy `.env.example` to `.env`
2. Fill in your credentials
3. Test locally: `npm start`
4. Verify Sentry works (see docs/SENTRY_SETUP.md)
5. Deploy to production

---

**Need help?** See also:
- `docs/SENTRY_SETUP.md` — Sentry account setup
- `docs/SENTRY_SOURCEMAPS.md` — Source map configuration
- `.env.example` — Template file
