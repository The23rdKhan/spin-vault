# Sentry Source Maps Setup Guide

## Why Source Maps Matter

Without source maps, Sentry errors look like this:
```
Error at o.apply (main.bundle.js:1:234567)
  at s.render (main.bundle.js:1:345678)
```

With source maps:
```
Error at AuthService.initialize (AuthService.ts:142)
  at RootLayout.bootApp (_layout.tsx:93)
```

**Source maps are ESSENTIAL for debugging production errors.**

---

## Option 1: Automatic Upload with sentry-expo (Recommended)

### 1. Install sentry-expo

```bash
npm install sentry-expo
```

### 2. Configure app.json

Add the Sentry plugin:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-splash-screen",
      [
        "sentry-expo",
        {
          "organization": "your-sentry-org",
          "project": "spin-vault"
        }
      ]
      // ... other plugins
    ],
    "hooks": {
      "postPublish": [
        {
          "file": "sentry-expo/upload-sourcemaps",
          "config": {
            "organization": "your-sentry-org",
            "project": "spin-vault",
            "authToken": "process.env.SENTRY_AUTH_TOKEN"
          }
        }
      ]
    }
  }
}
```

### 3. Get Sentry Auth Token

1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Click "Create New Token"
3. Scopes needed:
   - `project:read`
   - `project:releases`
   - `org:read`
4. Copy the token

### 4. Add to .env

```bash
SENTRY_AUTH_TOKEN=sntrys_your_token_here
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=spin-vault
```

### 5. Add to .gitignore

```
# .gitignore
.env
.env.local
.env.*.local
```

### 6. Update Sentry Init

Replace the manual `Sentry.init()` in `app/_layout.tsx` with:

```typescript
import * as Sentry from 'sentry-expo';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (!__DEV__ && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    enableInExpoDevelopment: false,
    debug: false,
    tracesSampleRate: 0.2,
    // ... rest of config
  });
}
```

### 7. Build with EAS

```bash
# Development build
eas build --profile development --platform ios

# Production build (automatically uploads source maps)
eas build --profile production --platform ios
```

Source maps are automatically uploaded during the build process.

---

## Option 2: Manual Upload with Sentry CLI

### 1. Install Sentry CLI

```bash
npm install --save-dev @sentry/cli
```

### 2. Create sentry.properties

```properties
# sentry.properties
defaults.url=https://sentry.io/
defaults.org=your-org-slug
defaults.project=spin-vault
auth.token=YOUR_AUTH_TOKEN
```

Add to `.gitignore`:
```
sentry.properties
```

### 3. Add Upload Script

Add to `package.json`:

```json
{
  "scripts": {
    "sentry:upload": "sentry-cli sourcemaps upload --org $SENTRY_ORG --project $SENTRY_PROJECT ./dist",
    "sentry:release": "sentry-cli releases new $npm_package_version && sentry-cli releases set-commits $npm_package_version --auto && sentry-cli sourcemaps upload --release $npm_package_version ./dist && sentry-cli releases finalize $npm_package_version"
  }
}
```

### 4. Build and Upload

```bash
# Build the app
eas build --profile production --platform ios --local

# Upload source maps
npm run sentry:upload
```

---

## Option 3: EAS Build Hooks (Most Automated)

### 1. Create EAS Build Hook

Create `.eas/build/upload-sourcemaps.sh`:

```bash
#!/bin/bash

# Only run for production builds
if [ "$EAS_BUILD_PROFILE" != "production" ]; then
  echo "Skipping source map upload for non-production build"
  exit 0
fi

echo "Uploading source maps to Sentry..."

# Install Sentry CLI if not available
if ! command -v sentry-cli &> /dev/null; then
  npm install -g @sentry/cli
fi

# Set version from package.json
VERSION=$(node -p "require('./package.json').version")
RELEASE="spin-vault@$VERSION"

# Create release
sentry-cli releases new "$RELEASE" \
  --org "$SENTRY_ORG" \
  --project "$SENTRY_PROJECT"

# Upload source maps
sentry-cli sourcemaps upload \
  --org "$SENTRY_ORG" \
  --project "$SENTRY_PROJECT" \
  --release "$RELEASE" \
  ./dist

# Associate commits
sentry-cli releases set-commits "$RELEASE" --auto

# Finalize release
sentry-cli releases finalize "$RELEASE"

echo "Source maps uploaded successfully!"
```

Make it executable:
```bash
chmod +x .eas/build/upload-sourcemaps.sh
```

### 2. Configure eas.json

```json
{
  "build": {
    "production": {
      "env": {
        "SENTRY_ORG": "your-org-slug",
        "SENTRY_PROJECT": "spin-vault",
        "SENTRY_AUTH_TOKEN": "process.env.SENTRY_AUTH_TOKEN"
      },
      "hooks": {
        "postPublish": ".eas/build/upload-sourcemaps.sh"
      }
    }
  }
}
```

### 3. Build

```bash
eas build --profile production --platform ios
```

Source maps upload automatically after the build.

---

## Verification

### 1. Check Sentry Releases

Go to: `https://sentry.io/organizations/your-org/projects/spin-vault/releases/`

You should see:
- Release version (e.g., `spin-vault@1.0.0`)
- Source maps uploaded
- Commits associated

### 2. Test with an Error

Add a test error:

```typescript
// Temporarily in your code
throw new Error('Test source map error');
```

Deploy and trigger the error. In Sentry, you should see:
```
Error at RootLayout.bootApp (_layout.tsx:93)  ✅ Real file + line number
```

Not:
```
Error at o.apply (main.bundle.js:1:234567)  ❌ Minified
```

---

## Troubleshooting

### Source Maps Not Uploading

**Check:**
1. `SENTRY_AUTH_TOKEN` is set correctly
2. Token has correct scopes (project:read, project:releases, org:read)
3. Organization and project slugs are correct
4. Build profile is "production" (not development)

**Debug:**
```bash
# Test upload manually
sentry-cli sourcemaps upload \
  --org your-org \
  --project spin-vault \
  --release spin-vault@1.0.0 \
  --debug \
  ./dist
```

### Stack Traces Still Minified

**Check:**
1. Release version in Sentry matches app version
2. Source maps uploaded for correct release
3. `dist` property in `Sentry.init()` matches upload

**Fix:**
```typescript
// app/_layout.tsx
Sentry.init({
  dsn: SENTRY_DSN,
  release: `spin-vault@${Constants.expoConfig?.version}`,
  dist: Constants.expoConfig?.revisionId ?? '1',
  // ...
});
```

### "Release not found" Error

**Solution:**
Ensure release name matches exactly:
- In code: `spin-vault@1.0.0`
- In upload: `spin-vault@1.0.0`
- Case-sensitive!

---

## Best Practices

1. **Always upload source maps for production builds**
2. **Never commit auth tokens to git** (use environment variables)
3. **Tag releases with git commits** for better debugging context
4. **Test source maps after each major update**
5. **Monitor Sentry's "Releases" page** to verify uploads

---

## Environment Variables Summary

Add to `.env`:

```bash
# Sentry Configuration
EXPO_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7890123
SENTRY_AUTH_TOKEN=sntrys_your_token_here
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=spin-vault
```

Add to `.env.example` (committed to git):

```bash
# Sentry Configuration
EXPO_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

---

## Cost

Source map uploads are **FREE** on all Sentry tiers.

---

## Next Steps

1. Choose an option (Option 1 recommended for Expo projects)
2. Get Sentry auth token
3. Configure environment variables
4. Test with a production build
5. Verify source maps in Sentry dashboard

---

**Need help?** See Sentry's official docs:
- https://docs.sentry.io/platforms/react-native/sourcemaps/
- https://docs.expo.dev/guides/using-sentry/
