/**
 * Ad Service - AppLovin MAX Rewarded Ads
 *
 * Handles rewarded video ads for free coins.
 * Users can watch ads to earn bonus coins (daily limit: 10 ads).
 */

import { Platform } from 'react-native';
import AppLovinMAX from 'react-native-applovin-max';

// Type assertion for AppLovin MAX (no official types available)
const MAX = AppLovinMAX as any;

import { supabase } from '../lib/supabase';
import { useWalletStore } from '../stores/walletSlice';
import { useUIStore } from '../stores/uiSlice';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// TODO: Replace with your actual AppLovin SDK key from dashboard
const APPLOVIN_SDK_KEY = process.env.EXPO_PUBLIC_APPLOVIN_SDK_KEY || 'YOUR_SDK_KEY_HERE';

// Ad Unit IDs - Create these in AppLovin Dashboard
const AD_UNIT_IDS = Platform.select({
  ios: 'YOUR_IOS_REWARDED_AD_UNIT_ID',
  android: 'YOUR_ANDROID_REWARDED_AD_UNIT_ID',
  default: '',
});

// Reward configuration
const AD_REWARD_COINS = 25_000; // Coins per ad
const DAILY_AD_LIMIT = 10; // Max ads per day

// ─────────────────────────────────────────────────────────────────────────────
// Ad Service Class
// ─────────────────────────────────────────────────────────────────────────────

class AdServiceClass {
  private isInitialized = false;
  private isAdLoaded = false;
  private isAdShowing = false;
  private adsWatchedToday = 0;

  /**
   * Initialize AppLovin MAX SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('AdService: Already initialized');
      return;
    }

    try {
      // Check if SDK key is configured
      if (APPLOVIN_SDK_KEY === 'YOUR_SDK_KEY_HERE' || !APPLOVIN_SDK_KEY) {
        console.warn('AdService: SDK key not configured. Ads will not work.');
        return;
      }

      // Initialize SDK
      await MAX.initialize(APPLOVIN_SDK_KEY);
      console.log('AdService: SDK initialized');

      // Set up event listeners
      this.setupEventListeners();

      // Load first ad
      this.loadRewardedAd();

      this.isInitialized = true;
    } catch (error) {
      console.error('AdService: Initialization failed', error);
      throw error;
    }
  }

  /**
   * Set up AppLovin event listeners
   */
  private setupEventListeners(): void {
    // Ad loaded successfully
    MAX.addEventListener('OnRewardedAdLoadedEvent', (adInfo: any) => {
      console.log('AdService: Ad loaded', adInfo.adUnitId);
      this.isAdLoaded = true;
    });

    // Ad failed to load
    MAX.addEventListener('OnRewardedAdLoadFailedEvent', (errorInfo: any) => {
      console.error('AdService: Ad load failed', errorInfo);
      this.isAdLoaded = false;

      // Retry after delay
      setTimeout(() => {
        this.loadRewardedAd();
      }, 5000);
    });

    // Ad displayed
    MAX.addEventListener('OnRewardedAdDisplayedEvent', (adInfo: any) => {
      console.log('AdService: Ad displayed', adInfo.adUnitId);
      this.isAdShowing = true;
    });

    // Ad hidden (user closed)
    MAX.addEventListener('OnRewardedAdHiddenEvent', (adInfo: any) => {
      console.log('AdService: Ad hidden', adInfo.adUnitId);
      this.isAdShowing = false;

      // Load next ad
      this.loadRewardedAd();
    });

    // Ad clicked
    MAX.addEventListener('OnRewardedAdClickedEvent', (adInfo: any) => {
      console.log('AdService: Ad clicked', adInfo.adUnitId);
    });

    // User earned reward (watched full ad)
    MAX.addEventListener('OnRewardedAdReceivedRewardEvent', (rewardInfo: any) => {
      console.log('AdService: Reward earned', rewardInfo);
      this.handleRewardEarned(rewardInfo);
    });

    // Ad failed to display
    MAX.addEventListener('OnRewardedAdFailedToDisplayEvent', (errorInfo: any) => {
      console.error('AdService: Ad display failed', errorInfo);
      this.isAdShowing = false;

      const showError = useUIStore.getState().showError;
      showError('Failed to show ad. Please try again.');

      // Load next ad
      this.loadRewardedAd();
    });
  }

  /**
   * Load a rewarded ad
   */
  private loadRewardedAd(): void {
    if (!AD_UNIT_IDS) {
      console.warn('AdService: No ad unit ID configured');
      return;
    }

    console.log('AdService: Loading ad...');
    MAX.loadRewardedAd(AD_UNIT_IDS);
  }

  /**
   * Check if an ad is ready to show
   */
  async isReady(): Promise<boolean> {
    if (!this.isInitialized) {
      console.warn('AdService: Not initialized');
      return false;
    }

    if (!AD_UNIT_IDS) {
      return false;
    }

    try {
      const isReady = await MAX.isRewardedAdReady(AD_UNIT_IDS);
      return isReady;
    } catch (error) {
      console.error('AdService: Failed to check if ad is ready', error);
      return false;
    }
  }

  /**
   * Show a rewarded ad
   */
  async showRewardedAd(): Promise<boolean> {
    const showInfo = useUIStore.getState().showInfo;
    const showError = useUIStore.getState().showError;

    // Check daily limit
    if (this.adsWatchedToday >= DAILY_AD_LIMIT) {
      showInfo(`Daily ad limit reached (${DAILY_AD_LIMIT}). Come back tomorrow!`);
      return false;
    }

    // Check if initialized
    if (!this.isInitialized) {
      showError('Ads are not available. Please restart the app.');
      return false;
    }

    // Check if ad is ready
    const ready = await this.isReady();
    if (!ready) {
      showInfo('No ads available right now. Please try again in a moment.');

      // Try to load an ad
      this.loadRewardedAd();
      return false;
    }

    try {
      console.log('AdService: Showing ad...');
      showInfo('Loading ad...');

      if (AD_UNIT_IDS) {
        MAX.showRewardedAd(AD_UNIT_IDS);
        return true;
      }

      return false;
    } catch (error) {
      console.error('AdService: Failed to show ad', error);
      showError('Failed to show ad. Please try again.');
      return false;
    }
  }

  /**
   * Handle reward earned (user watched full ad)
   */
  private async handleRewardEarned(rewardInfo: any): Promise<void> {
    console.log('AdService: Processing reward...', rewardInfo);

    const showSuccess = useUIStore.getState().showSuccess;
    const showError = useUIStore.getState().showError;

    try {
      // Call Supabase RPC to validate and grant coins
      const { data, error } = await supabase.rpc('claim_ad_reward' as any, {
        ad_unit_id: AD_UNIT_IDS,
        reward_amount: AD_REWARD_COINS,
      });

      if (error) {
        console.error('AdService: Failed to claim reward', error);

        // Check if daily limit reached on server
        if (error.message?.includes('DAILY_LIMIT')) {
          showError('Daily ad limit reached. Come back tomorrow!');
          this.adsWatchedToday = DAILY_AD_LIMIT;
        } else {
          showError('Failed to claim reward. Please contact support.');
        }
        return;
      }

      if (data) {
        const responseData = data as any;

        // Update local counter
        this.adsWatchedToday = responseData.ads_watched_today || 0;

        // Update wallet balance
        const fetchBalance = useWalletStore.getState().fetchBalance;
        await fetchBalance();

        // Show success message
        const remaining = DAILY_AD_LIMIT - this.adsWatchedToday;
        showSuccess(
          `+${AD_REWARD_COINS.toLocaleString()} coins! ${remaining} ads remaining today.`
        );
      }
    } catch (error) {
      console.error('AdService: Reward processing failed', error);
      showError('Failed to process reward. Please contact support.');
    }
  }

  /**
   * Get ads watched today count
   */
  getAdsWatchedToday(): number {
    return this.adsWatchedToday;
  }

  /**
   * Get daily limit
   */
  getDailyLimit(): number {
    return DAILY_AD_LIMIT;
  }

  /**
   * Get reward amount
   */
  getRewardAmount(): number {
    return AD_REWARD_COINS;
  }

  /**
   * Reset daily counter (for testing)
   */
  resetDailyCounter(): void {
    this.adsWatchedToday = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

export const AdService = new AdServiceClass();

// Auto-initialize in production
if (!__DEV__) {
  AdService.initialize().catch((error) => {
    console.error('AdService: Auto-init failed', error);
  });
}
