/**
 * SoundService — Sound effects wrapper
 *
 * Wraps expo-audio AudioPlayer. Sounds are loaded lazily on first use.
 * All methods are fire-and-forget. Gated by settingsSlice.soundEnabled.
 *
 * NOTE: Actual .mp3 asset files are not bundled yet — each play call
 * is a no-op stub until assets are added. Wire-up is complete so adding
 * real assets only requires updating the SOUND_ASSETS map below.
 *
 * TEMPORARY: expo-audio imports disabled for old dev build compatibility
 */

// import { createAudioPlayer } from 'expo-audio';
// import type { AudioPlayer, AudioSource } from 'expo-audio';

import { useSettingsStore } from '../stores/settingsSlice';

// Stub types for old dev build compatibility
type AudioPlayer = any;
type AudioSource = any;
const createAudioPlayer = (_source: AudioSource) => ({
  volume: 0,
  currentTime: 0,
  play: () => {},
  remove: () => {}
});

// ─────────────────────────────────────────────────────────────────────────────
// Asset map — swap `null` for `require('../../assets/sounds/spin.mp3')` etc.
// ─────────────────────────────────────────────────────────────────────────────

type SoundKey = 'spinStart' | 'reelStop' | 'win' | 'jackpot' | 'dailyBonus' | 'buttonTap';

const SOUND_ASSETS: Record<SoundKey, AudioSource | null> = {
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

const soundCache: Partial<Record<SoundKey, AudioPlayer>> = {};

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
    // Create and cache player on first use
    if (!soundCache[key]) {
      const player = createAudioPlayer(asset);
      soundCache[key] = player;
    }

    const player = soundCache[key];
    if (player) {
      player.volume = getVolume();
      player.currentTime = 0; // Reset to start
      player.play();
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
 * to free memory (optional, expo-audio handles this gracefully)
 */
function unloadAll(): void {
  for (const key of Object.keys(soundCache) as SoundKey[]) {
    const player = soundCache[key];
    if (player) {
      player.remove();
      delete soundCache[key];
    }
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
