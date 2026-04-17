# Spin Vault - Developer Setup Guide

Complete setup instructions for new developers joining the project.

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```
   Download: https://nodejs.org/

2. **npm** (v9 or higher)
   ```bash
   npm --version   # Should be 9.0.0 or higher
   ```
   Comes with Node.js

3. **Git**
   ```bash
   git --version
   ```
   Download: https://git-scm.com/

4. **Code Editor**
   - Recommended: Visual Studio Code
   - Download: https://code.visualstudio.com/

### Platform-Specific Requirements

#### macOS (for iOS development)

1. **Xcode** (latest version from App Store)
   - Required for iOS Simulator
   - Also install Command Line Tools:
     ```bash
     xcode-select --install
     ```

2. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

#### Windows/Linux (Android only)

1. **Android Studio**
   - Download: https://developer.android.com/studio
   - Install Android SDK and emulator

2. **Java Development Kit (JDK 17)**
   ```bash
   java -version  # Should be 17.x
   ```

---

## Step 1: Clone the Repository

```bash
# Clone the repo
git clone https://github.com/hushdogg/spin-vault.git

# Navigate into the project
cd spin-vault

# Switch to develop branch
git checkout develop
```

---

## Step 2: Install Dependencies

```bash
# Install npm packages
npm install

# For macOS - install iOS dependencies
cd ios && pod install && cd ..
```

**Expected time:** 3-5 minutes

---

## Step 3: Set Up Supabase

### Option A: Use Existing Project (Team Members)

1. Get Supabase credentials from team lead
2. Skip to "Configure Environment Variables" below

### Option B: Create New Supabase Project (Solo/Fork)

1. **Sign up for Supabase**
   - Go to https://supabase.com/
   - Create free account

2. **Create a new project**
   - Click "New Project"
   - Name: `spin-vault-dev`
   - Database Password: (save this securely)
   - Region: Choose closest to you
   - Plan: Free tier is fine for development

3. **Wait for project creation** (~2 minutes)

4. **Get your credentials**
   - Go to Settings → API
   - Copy:
     - `Project URL` (e.g., `https://xxxxx.supabase.co`)
     - `anon/public` key (starts with `sb_publishable_`)

5. **Run migrations**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Login to Supabase
   supabase login

   # Link your project
   supabase link --project-ref <your-project-id>

   # Push migrations
   supabase db push
   ```

   Alternatively, run migrations manually:
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Click "Run"
   - Repeat for `002_spin_rpc.sql` and `003_helper_rpcs.sql`

---

## Step 4: Configure Environment Variables

1. **Copy the example file**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** and add your credentials:
   ```bash
   # Supabase (REQUIRED)
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx

   # AppLovin MAX (optional for now)
   # EXPO_PUBLIC_APPLOVIN_SDK_KEY=your_key_here

   # Sentry (optional for now)
   # EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn

   # Environment
   APP_ENV=development
   ```

3. **Never commit `.env`** - it's in `.gitignore` for security

---

## Step 5: Start the Development Server

```bash
npm start
```

You should see:
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

---

## Step 6: Run on a Platform

### Option A: iOS Simulator (macOS only)

1. Press `i` in the terminal
2. Wait for build to complete (~30 seconds first time)
3. Simulator will open automatically

**OR** run directly:
```bash
npm run ios
```

### Option B: Android Emulator

1. Open Android Studio
2. Start an emulator (AVD Manager)
3. Press `a` in the terminal

**OR** run directly:
```bash
npm run android
```

### Option C: Physical Device

1. Install Expo Go app from App/Play Store
2. Scan QR code in terminal
3. App will load on your device

---

## Step 7: Verify Setup

You should see:
1. Loading screen
2. Anonymous sign-in completes automatically
3. Onboarding screen (first time only)
4. Main slot machine screen with 5,000,000 coins

**Test a spin:**
- Tap the spin button
- Reels should animate smoothly
- Coins should deduct (5,000 default bet)
- Win/loss should be reflected in balance

---

## Troubleshooting

### "Missing Supabase environment variables"

**Problem:** `.env` file not found or missing values

**Solution:**
```bash
# Check .env exists
ls -la .env

# Verify contents
cat .env

# If missing, copy from example
cp .env.example .env
```

---

### "Metro bundler error"

**Problem:** Port 8081 already in use

**Solution:**
```bash
# Kill existing Metro process
npx react-native-community/cli clean

# Or use different port
npm start -- --port 8082
```

---

### "Pod install failed" (iOS)

**Problem:** CocoaPods dependencies not installed

**Solution:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

---

### "Android build failed"

**Problem:** Gradle build issues

**Solution:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

---

### "Supabase connection failed"

**Problem:** Network issues or incorrect credentials

**Solution:**
1. Check internet connection
2. Verify credentials in `.env` are correct
3. Test Supabase URL in browser (should show a page)
4. Check Supabase project is active (not paused)

---

## Recommended VS Code Extensions

Install these for the best development experience:

1. **ESLint** - Linting
   ```
   dbaeumer.vscode-eslint
   ```

2. **Prettier** - Code formatting
   ```
   esbenp.prettier-vscode
   ```

3. **React Native Tools** - Debugging
   ```
   msjsdiag.vscode-react-native
   ```

4. **TypeScript** - Already included in VS Code

5. **GitLens** - Git visualization
   ```
   eamodio.gitlens
   ```

**Auto-format on save:**

Add to VS Code settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## Development Workflow

### Daily Routine

1. **Pull latest changes**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

3. **Make changes**
   - Write code
   - Test frequently with hot reload

4. **Run quality checks**
   ```bash
   npm run lint       # Check for errors
   npm run format     # Format code
   npx tsc --noEmit   # Type check
   ```

5. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/my-new-feature
   # Then create PR on GitHub
   ```

---

## Hot Reload / Fast Refresh

Expo supports hot reload:
- Save a file → changes appear instantly
- No need to rebuild
- State is preserved (usually)

**If hot reload breaks:**
- Press `r` in terminal to reload
- Or shake device and tap "Reload"

---

## Debugging

### Console Logs

```typescript
console.log('Debug info:', data);
```

Logs appear in:
- Terminal where `npm start` is running
- React Native Debugger (if installed)
- Expo Go app (shake → show logs)

### React DevTools

1. Install React DevTools:
   ```bash
   npm install -g react-devtools
   ```

2. Start it:
   ```bash
   react-devtools
   ```

3. In terminal, press `shift + m` to open menu
4. Select "Toggle Element Inspector"

### Supabase Logs

View real-time database logs:
- Go to Supabase Dashboard
- Logs → Postgres Logs
- See all queries executed

---

## Database Management

### View Data

**Option 1: Supabase Dashboard**
- Go to Table Editor
- Browse all tables visually

**Option 2: SQL Editor**
```sql
-- See all users
SELECT * FROM users;

-- Check wallet balances
SELECT user_id, balance FROM wallets;

-- View recent spins
SELECT * FROM spin_log ORDER BY created_at DESC LIMIT 10;
```

### Reset Your Data

```sql
-- Delete your user (will cascade)
DELETE FROM auth.users WHERE id = auth.uid();

-- Or just reset coins
UPDATE wallets SET balance = 5000000 WHERE user_id = auth.uid();
```

---

## Testing Changes

### Manual Testing Checklist

Before opening a PR, test:

- [ ] App launches without errors
- [ ] Anonymous sign-in works
- [ ] Spinning works (bet deducted, win credited)
- [ ] Daily bonus modal appears
- [ ] Settings save correctly
- [ ] Profile screen shows correct stats
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Test on both iOS and Android (if applicable)

---

## Building for Device Testing

### iOS (macOS only)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for simulator
eas build --profile development --platform ios --local

# Or build for physical device
eas build --profile development --platform ios
```

### Android

```bash
# Build APK
eas build --profile development --platform android --local

# Install on connected device
adb install build-xxxxx.apk
```

---

## Common Commands Reference

```bash
# Start dev server
npm start

# Run on platforms
npm run ios
npm run android
npm run web

# Code quality
npm run lint
npm run lint:fix
npm run format

# Type checking
npx tsc --noEmit

# Clear cache
npx expo start -c

# EAS builds
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Database
supabase db push        # Apply migrations
supabase gen types typescript --local > src/types/database.ts
```

---

## Getting Help

- **Documentation:** See README.md and docs/
- **Issues:** Check existing GitHub issues
- **Team Chat:** [Your team Slack/Discord]
- **Code Review:** Tag reviewers on PRs

---

## Next Steps

Once set up:

1. **Read the codebase**
   - Start with `app/_layout.tsx` (entry point)
   - Review `src/stores/` (state management)
   - Understand `src/components/game/SlotMachine.tsx` (core game)

2. **Pick a task**
   - Check GitHub Issues
   - Look for "good first issue" labels
   - Ask team lead for assignment

3. **Start coding!**
   - Follow coding standards
   - Write clean, documented code
   - Test thoroughly
   - Open a PR

---

**Welcome to the team! 🎰**
