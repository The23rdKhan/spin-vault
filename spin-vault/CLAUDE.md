# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Spin Vault

Social casino slot app. Expo + React Native + TypeScript.

## Development Commands

```bash
# Start Expo development server
npm start

# Run on specific platforms
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser
```

## Stack

- Expo Router (file-based routing with deep linking)
- Zustand (state management — 5 slices)
- Supabase (auth, database, RPC functions)
- Reanimated 3 (reel animations — UI thread only)
- Expo Vector Icons / Ionicons
- React Native Skia (particle VFX)
- Lottie (win celebrations)
- expo-av (audio)
- FlashList (performant lists for win history, achievements)
- AppLovin MAX (rewarded ads)
- expo-iap (in-app purchases)

## Key decisions

- Anonymous-first auth via supabase.auth.signInAnonymously()
- Server-side RNG only — never client-side
- 5,000,000 starting coins
- bigint for all coin values in database
- Optimistic updates on spin with server reconciliation
- Ionicons from @expo/vector-icons — no other icon library
- All colours from src/theme/tokens.ts — never hardcode hex values
- All animations via Reanimated 3 worklets — never Animated API
- FlashList for any list with 100+ items — never FlatList
- Supabase key: EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_xxx format)

## Folder structure

app/                    ← Expo Router file-based routing
  _layout.tsx           ← Root layout
  (tabs)/               ← Tab navigation group
    _layout.tsx         ← Tab bar configuration
    index.tsx           ← Play screen (home)
    shop.tsx
    events.tsx
    profile.tsx
    settings.tsx

src/
  theme/                ← tokens.ts, useTheme.ts, gameTheme.ts
  stores/               ← walletSlice, gameSlice, sessionSlice, uiSlice, settingsSlice
  components/           ← Icon, Button, Alert, Toast, Modal, Badge
  services/             ← HapticService, SoundService
  lib/                  ← supabase.ts, iap.ts
  types/                ← all TypeScript interfaces

## Rules — never break these

- Never run RNG on the client
- Never store coin balance in AsyncStorage
- Never hardcode a colour hex in a component
- Never use Animated API — Reanimated 3 only
- Never call Ionicons directly — use <Icon /> wrapper
- Never trust client for IAP — always server-validate receipts
- Always use bigint for coin amounts

**You are not done with any task until `npx tsc --noEmit` returns zero errors. Always show me the tsc output as proof of completion.**

## Current sprint

Week 1 — Supabase setup + project foundation

## Database

9 tables: users, wallets, spin_log, transactions, sessions, devices, achievements, user_preferences, deletion_log

## Economy

- Starting coins: 5,000,000
- Default bet: 5,000
- Bet levels: 1k, 5k, 10k, 25k, 50k, 100k, 150k, 250k
- RTP target: 92%
- Daily free coins: 325,000 (login + ads + hourly)
