# Sentry Setup Guide

## Overview

Sentry is now integrated into Spin Vault for production error tracking and performance monitoring. This guide explains how to complete the setup.

## Steps

### 1. Create a Sentry Account

1. Go to [https://sentry.io](https://sentry.io)
2. Sign up for a free account (supports up to 5,000 events/month)
3. Create a new project:
   - Platform: **React Native**
   - Project name: **spin-vault**

### 2. Get Your DSN

After creating the project, Sentry will show you a **DSN** (Data Source Name). It looks like:

```
https://abc123def456@o123456.ingest.sentry.io/7890123
```

### 3. Update app/_layout.tsx

Replace the placeholder DSN in `app/_layout.tsx`:

```typescript
// Find this line (around line 15):
dsn: 'https://your-dsn@sentry.io/your-project-id', // TODO: Replace with actual DSN

// Replace with your actual DSN:
dsn: 'https://abc123def456@o123456.ingest.sentry.io/7890123',
```

### 4. Environment Variable (Recommended)

For better security, use an environment variable:

1. Create a `.env` file in the project root:

```bash
SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/7890123
```

2. Install `react-native-dotenv`:

```bash
npm install react-native-dotenv
```

3. Update `app/_layout.tsx`:

```typescript
import { SENTRY_DSN } from '@env';

Sentry.init({
  dsn: SENTRY_DSN,
  // ... rest of config
});
```

## Configuration Options

### Current Settings

```typescript
Sentry.init({
  dsn: 'YOUR_DSN_HERE',
  debug: false,                        // Set to true to see Sentry logs in dev
  tracesSampleRate: 0.2,              // 20% of transactions (performance monitoring)
  enableAutoSessionTracking: true,     // Track app sessions
  sessionTrackingIntervalMillis: 30000, // 30-second intervals
  enableAppHangTracking: true,         // Detect ANR (Application Not Responding)
  environment: __DEV__ ? 'development' : 'production',
  dist: Constants.expoConfig?.version ?? '1.0.0',
});
```

### Recommended Tweaks

**For development:**
```typescript
debug: __DEV__, // See Sentry logs during development
```

**For higher traffic apps:**
```typescript
tracesSampleRate: 0.1, // 10% instead of 20% to save quota
```

## Testing

### 1. Test Error Tracking

Add a test button temporarily in your app:

```typescript
<Button
  title="Test Sentry"
  onPress={() => {
    throw new Error('Test Sentry error tracking');
  }}
/>
```

This should appear in your Sentry dashboard within seconds.

### 2. Test Logger Integration

Use the logger anywhere in your app:

```typescript
import { logger } from '../lib/logger';

logger.error('Test error from logger', new Error('Test'));
```

Check the Sentry dashboard for the error event.

### 3. Test User Context

After authentication, user info is automatically sent to Sentry:

```typescript
// This happens automatically in AuthService.initialize()
logger.setUser(user.id, user.is_anonymous, user.email);
```

Check Sentry to see user-specific error reports.

## Monitoring

### Dashboard Metrics

In your Sentry dashboard, you'll see:

1. **Issues** — Grouped errors with stack traces
2. **Performance** — Transaction timing, slow endpoints
3. **Releases** — Version-specific error rates
4. **Users** — Affected user counts

### Alerts

Set up alerts in Sentry for:
- High error rates (>10 errors/minute)
- New issues
- Regression detection (errors in new releases)

## Quota Management

Free tier includes:
- 5,000 errors/month
- 10,000 performance transactions/month

If you exceed quota:
- Reduce `tracesSampleRate` (0.1 or lower)
- Filter out noisy errors in Sentry settings
- Upgrade to a paid plan

## Privacy & GDPR

Sentry automatically scrubs:
- Credit card numbers
- Social security numbers
- Passwords (from request bodies)

To scrub additional sensitive data, add to `beforeSend`:

```typescript
Sentry.init({
  // ... other config
  beforeSend(event) {
    // Remove PII from custom contexts
    if (event.contexts?.user) {
      delete event.contexts.user.email;
    }
    return event;
  },
});
```

## Production Checklist

Before shipping to production:

- [ ] Real Sentry DSN configured (not placeholder)
- [ ] `debug: false` in production
- [ ] Environment variable setup (optional but recommended)
- [ ] Test error tracking works
- [ ] Set up Sentry alerts
- [ ] Review privacy/GDPR compliance

## Resources

- [Sentry React Native Docs](https://docs.sentry.io/platforms/react-native/)
- [Expo + Sentry Guide](https://docs.expo.dev/guides/using-sentry/)
- [Sentry Dashboard](https://sentry.io/organizations/your-org/issues/)
