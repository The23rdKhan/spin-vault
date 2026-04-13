/**
 * SoundService — Sound effects wrapper
 *
 * Wraps expo-av Audio.Sound. Sounds are loaded lazily on first use.
 * All methods are fire-and-forget. Gated by settingsSlice.soundEnabled.
 *
 * NOTE: Actual .mp3 asset files are not bundled yet — each play call
 * is a no-op stub until assets are added. Wire-up is complete so adding
 * real assets only requires updating the SOUND_ASSETS map below.
 */

import { Audio } from 'expo-av';

import { useSettingsStore } from '../stores/settingsSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Asset map — swap `null` for `require('../../assets/sounds/spin.mp3')` etc.
// ─────────────────────────────────────────────────────────────────────────────

type SoundKey = 'spinStart' | 'reelStop' | 'win' | 'jackpot' | 'dailyBonus' | 'buttonTap';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SOUND_ASSETS: Record<SoundKey, number | null> = {
  spinStart: null,   // require('../../assets/sounds/spin_start.mp3')
  reelStop: null,    // require('../../assets/sounds/reel_stop.mp3')
  win: null,         // require('../../assets/sounds/win.mp3')
  jackpot: null,     // require('../../assets/sounds/jackpot.mp3')
  dailyBonus: null,  // require('../../assets/sounds/daily_bonus.mp3')
  buttonTap: null,   // require('../../assets/sounds/tap.mp3')
};

// ─────────────────────────────────────────────────────────────────────────────
// Sound cache
// ─────────────────────────────────────────────────────────────────────────────

const soundCache: Partial<Record<SoundKey, Audio.Sound>> = {};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isEnabled(): boolean {
  return useSettingsStore.getState().soundEnabled;
}

function getVolume(): number {
  return useSettingsStore.getState().soundVolume;
}

async function playSound(key: SoundKey): Promise<void> {
  if (!isEnabled()) return;

  const asset = SOUND_ASSETS[key];
  if (asset === null) {
    // Asset not yet bundled — silent stub
    return;
  }

  try {
    // Load and cache on first use
    if (!soundCache[key]) {
      const { sound } = await Audio.Sound.createAsync(asset, {
        shouldPlay: false,
        volume: getVolume(),
      });
      soundCache[key] = sound;
    }

    const sound = soundCache[key];
    if (sound) {
      await sound.setVolumeAsync(getVolume());
      await sound.replayAsync();
    }
  } catch {
    // Silent fail — sound errors should never crash the game
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

function spinStart(): void {
  void playSound('spinStart');
}

function reelStop(reelIndex: number): void {
  // Stagger stops slightly by reel index for a satisfying click-click-click
  setTimeout(() => void playSound('reelStop'), reelIndex * 80);
}

function win(): void {
  void playSound('win');
}

function jackpot(): void {
  void playSound('jackpot');
}

function dailyBonus(): void {
  void playSound('dailyBonus');
}

function buttonTap(): void {
  void playSound('buttonTap');
}

/**
 * Unload all cached sounds — call when app goes to background
 * to free memory (optional, expo-av handles this gracefully)
 */
async function unloadAll(): Promise<void> {
  for (const key of Object.keys(soundCache) as SoundKey[]) {
    await soundCache[key]?.unloadAsync();
    delete soundCache[key];
  }
}

export const SoundService = {
  spinStart,
  reelStop,
  win,
  jackpot,
  dailyBonus,
  buttonTap,
  unloadAll,
};

export default SoundService;
