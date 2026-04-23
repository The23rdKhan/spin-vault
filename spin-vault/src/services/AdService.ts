/**
 * Ad Service - AppLovin MAX Rewarded Ads
 *
 * Handles rewarded video ads for free coins.
 * Users can watch ads to earn bonus coins (daily limit: 10 ads).
 *
 * Gracefully handles missing native modules for dev build compatibility.
 */

import { Platform } from 'react-native';

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { useWalletStore } from '../stores/walletSlice';
import { useUIStore } from '../stores/uiSlice';

// Conditional import - handles missing native module gracefully
let AppLovinMAX: any = null;
let MAX: any = null;
let isModuleAvailable = false;

try {
  AppLovinMAX = require('react-native-applovin-max').default;
  MAX = AppLovinMAX;
  isModuleAvailable = true;
} catch (error) {
  logger.warn('AdService: react-native-applovin-max not available in this build');
}

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
    logger.debug('📺 [ADS] Initializing AppLovin MAX SDK...');

    if (this.isInitialized) {
      logger.debug('✅ [ADS] Already initialized');
      return;
    }

    // Check if module is available
    if (!isModuleAvailable || !MAX) {
      logger.warn('⚠️  [ADS] Module not available in this build - Ads disabled');
      return;
    }

    try {
      // Check if SDK key is configured
      if (APPLOVIN_SDK_KEY === 'YOUR_SDK_KEY_HERE' || !APPLOVIN_SDK_KEY) {
        logger.warn('⚠️  [ADS] SDK key not configured. Ads will not work.');
        logger.warn('   Set EXPO_PUBLIC_APPLOVIN_SDK_KEY in your .env file');
        return;
      }

      // Initialize SDK
      logger.debug('🔌 [ADS] Connecting to AppLovin MAX...');
      logger.debug('   - SDK Key: ' + APPLOVIN_SDK_KEY.substring(0, 20) + '...');
      await MAX.initialize(APPLOVIN_SDK_KEY);
      logger.debug('✅ [ADS] SDK initialized successfully');

      // Set up event listeners
      logger.debug('👂 [ADS] Setting up event listeners...');
      this.setupEventListeners();

      // Load first ad
      logger.debug('📥 [ADS] Loading first rewarded ad...');
      this.loadRewardedAd();

      this.isInitialized = true;
      logger.debug('🎉 [ADS] Ad service initialization complete');
    } catch (error) {
      logger.error('❌ [ADS] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up AppLovin event listeners
   */
  private setupEventListeners(): void {
    // Ad loaded successfully
    MAX.addEventListener('OnRewardedAdLoadedEvent', (adInfo: any) => {
      logger.debug('✅ [ADS] Ad loaded successfully', {
        adUnitId: adInfo.adUnitId,
        networkName: adInfo.networkName || 'Unknown',
      });
      this.isAdLoaded = true;
    });

    // Ad failed to load
    MAX.addEventListener('OnRewardedAdLoadFailedEvent', (errorInfo: any) => {
      logger.error('❌ [ADS] Ad load failed', undefined, {
        errorCode: errorInfo.code,
        errorMessage: errorInfo.message,
      });
      this.isAdLoaded = false;

      // Retry after delay
      logger.debug('⏳ [ADS] Retrying ad load in 5 seconds...');
      setTimeout(() => {
        this.loadRewardedAd();
      }, 5000);
    });

    // Ad displayed
    MAX.addEventListener('OnRewardedAdDisplayedEvent', (adInfo: any) => {
      logger.debug('▶️  [ADS] Ad now displaying', { adUnitId: adInfo.adUnitId });
      this.isAdShowing = true;
    });

    // Ad hidden (user closed)
    MAX.addEventListener('OnRewardedAdHiddenEvent', (adInfo: any) => {
      logger.debug('⏹️  [ADS] Ad closed/hidden', { adUnitId: adInfo.adUnitId });
      this.isAdShowing = false;

      // Load next ad
      logger.debug('📥 [ADS] Loading next ad...');
      this.loadRewardedAd();
    });

    // Ad clicked
    MAX.addEventListener('OnRewardedAdClickedEvent', (adInfo: any) => {
      logger.debug('👆 [ADS] User clicked ad', { adUnitId: adInfo.adUnitId });
    });

    // User earned reward (watched full ad)
    MAX.addEventListener('OnRewardedAdReceivedRewardEvent', (rewardInfo: any) => {
      logger.debug('🎁 [ADS] User earned reward!', {
        rewardAmount: rewardInfo.amount,
        rewardLabel: rewardInfo.label,
      });
      this.handleRewardEarned(rewardInfo);
    });

    // Ad failed to display
    MAX.addEventListener('OnRewardedAdFailedToDisplayEvent', (errorInfo: any) => {
      logger.error('❌ [ADS] Ad failed to display', undefined, {
        errorCode: errorInfo.code,
        errorMessage: errorInfo.message,
      });
      this.isAdShowing = false;

      const showError = useUIStore.getState().showError;
      showError('Failed to show ad. Please try again.');

      // Load next ad
      logger.debug('📥 [ADS] Loading replacement ad...');
      this.loadRewardedAd();
    });

    logger.debug('✅ [ADS] All event listeners registered');
  }

  /**
   * Load a rewarded ad
   */
  private loadRewardedAd(): void {
    if (!AD_UNIT_IDS) {
      logger.warn('⚠️  [ADS] No ad unit ID configured. Set ad unit IDs in AdService.ts');
      return;
    }

    logger.debug('📥 [ADS] Requesting ad from network...', { adUnitId: AD_UNIT_IDS });
    MAX.loadRewardedAd(AD_UNIT_IDS);
  }

  /**
   * Check if an ad is ready to show
   */
  async isReady(): Promise<boolean> {
    if (!this.isInitialized) {
      logger.warn('AdService: Not initialized');
      return false;
    }

    if (!AD_UNIT_IDS) {
      return false;
    }

    try {
      const isReady = await MAX.isRewardedAdReady(AD_UNIT_IDS);
      return isReady;
    } catch (error) {
      logger.error('AdService: Failed to check if ad is ready', error);
      return false;
    }
  }

  /**
   * Show a rewarded ad
   */
  async showRewardedAd(): Promise<boolean> {
    logger.debug('📺 [ADS] User requested to watch ad');
    const showInfo = useUIStore.getState().showInfo;
    const showError = useUIStore.getState().showError;

    // Check if module is available
    if (!isModuleAvailable || !MAX) {
      logger.error('❌ [ADS] Module not available');
      showError('Ads are not available in this build');
      return false;
    }

    // Check daily limit
    logger.debug('📊 [ADS] Checking daily limit...', {
      watchedToday: this.adsWatchedToday,
      dailyLimit: DAILY_AD_LIMIT,
    });

    if (this.adsWatchedToday >= DAILY_AD_LIMIT) {
      logger.warn('⚠️  [ADS] Daily limit reached');
      showInfo(`Daily ad limit reached (${DAILY_AD_LIMIT}). Come back tomorrow!`);
      return false;
    }

    // Check if initialized
    if (!this.isInitialized) {
      logger.error('❌ [ADS] Not initialized');
      showError('Ads are not available. Please restart the app.');
      return false;
    }

    // Check if ad is ready
    logger.debug('🔍 [ADS] Checking if ad is ready...');
    const ready = await this.isReady();
    logger.debug('🔍 [ADS] Ad ready status', { ready });

    if (!ready) {
      logger.warn('⚠️  [ADS] No ad ready to show');
      showInfo('No ads available right now. Please try again in a moment.');

      // Try to load an ad
      logger.debug('📥 [ADS] Loading ad for next attempt...');
      this.loadRewardedAd();
      return false;
    }

    try {
      logger.debug('▶️  [ADS] Showing rewarded ad...');
      showInfo('Loading ad...');

      if (AD_UNIT_IDS) {
        MAX.showRewardedAd(AD_UNIT_IDS);
        logger.debug('✅ [ADS] Show ad request sent to SDK');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('❌ [ADS] Failed to show ad:', error);
      showError('Failed to show ad. Please try again.');
      return false;
    }
  }

  /**
   * Handle reward earned (user watched full ad)
   */
  private async handleRewardEarned(rewardInfo: any): Promise<void> {
    logger.debug('🎁 [ADS] Processing ad reward...', { rewardInfo });

    const showSuccess = useUIStore.getState().showSuccess;
    const showError = useUIStore.getState().showError;

    try {
      // Call Supabase RPC to validate and grant coins
      logger.debug('🔐 [ADS] Validating reward with server...', {
        adUnitId: AD_UNIT_IDS,
        rewardAmount: AD_REWARD_COINS,
      });

      const { data, error } = await supabase.rpc('claim_ad_reward' as any, {
        ad_unit_id: AD_UNIT_IDS,
        reward_amount: AD_REWARD_COINS,
      });

      if (error) {
        logger.error('❌ [ADS] Server rejected reward:', error);

        // Check if daily limit reached on server
        if (error.message?.includes('DAILY_LIMIT')) {
          logger.warn('⚠️  [ADS] Daily limit reached (server-side)');
          showError('Daily ad limit reached. Come back tomorrow!');
          this.adsWatchedToday = DAILY_AD_LIMIT;
        } else {
          showError('Failed to claim reward. Please contact support.');
        }
        return;
      }

      if (data) {
        const responseData = data as any;
        logger.debug('✅ [ADS] Server validated reward');

        // Update local counter
        this.adsWatchedToday = responseData.ads_watched_today || 0;
        logger.debug('📊 [ADS] Total ads watched today', { adsWatchedToday: this.adsWatchedToday });

        // Update wallet balance
        logger.debug('🔄 [ADS] Refreshing wallet balance...');
        const fetchBalance = useWalletStore.getState().fetchBalance;
        await fetchBalance();

        // Show success message
        const remaining = DAILY_AD_LIMIT - this.adsWatchedToday;
        logger.debug('💰 [ADS] Coins granted', {
          coinsGranted: AD_REWARD_COINS,
          remainingAdsToday: remaining,
        });

        showSuccess(
          `+${AD_REWARD_COINS.toLocaleString()} coins! ${remaining} ads remaining today.`
        );

        logger.debug('🎉 [ADS] Reward processing complete');
      }
    } catch (error) {
      logger.error('❌ [ADS] Reward processing failed:', error);
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

// Auto-initialize in production - only if module is available
if (!__DEV__ && isModuleAvailable) {
  logger.debug('🚀 [ADS] Auto-initializing in production mode...');
  AdService.initialize().catch((error) => {
    logger.error('❌ [ADS] Auto-init failed:', error);
  });
}
