/**
 * In-App Purchase Service
 *
 * Handles coin package purchases via Apple App Store and Google Play Store.
 * All receipts are validated server-side via Supabase RPC.
 *
 * Gracefully handles missing native modules for dev build compatibility.
 */

import { Platform } from 'react-native';

import { supabase } from './supabase';
import { logger } from './logger';
import { useWalletStore } from '../stores/walletSlice';
import { useUIStore } from '../stores/uiSlice';

// Conditional import - handles missing native module gracefully
let InAppPurchases: any = null;
let isModuleAvailable = false;

try {
  InAppPurchases = require('expo-in-app-purchases');
  isModuleAvailable = true;
} catch (error) {
  logger.warn('IAP: expo-in-app-purchases not available in this build');
}

// Type definitions for when module is available
type IAPItemDetails = any;
type IAPResponseCode = any;
type InAppPurchase = any;

// ─────────────────────────────────────────────────────────────────────────────
// Product Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface CoinPackage {
  id: string; // Must match App Store Connect / Play Console product ID
  coins: bigint;
  label: string;
  price: string; // Display price (will be replaced by store price)
  tag: string | null;
}

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'coins_50k',
    coins: 50_000n,
    label: '50K',
    price: '$0.99',
    tag: null,
  },
  {
    id: 'coins_150k',
    coins: 150_000n,
    label: '150K',
    price: '$1.99',
    tag: 'POPULAR',
  },
  {
    id: 'coins_500k',
    coins: 500_000n,
    label: '500K',
    price: '$4.99',
    tag: null,
  },
  {
    id: 'coins_1200k',
    coins: 1_200_000n,
    label: '1.2M',
    price: '$9.99',
    tag: 'BEST VALUE',
  },
  {
    id: 'coins_3m',
    coins: 3_000_000n,
    label: '3M',
    price: '$19.99',
    tag: null,
  },
  {
    id: 'coins_7500k',
    coins: 7_500_000n,
    label: '7.5M',
    price: '$39.99',
    tag: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// IAP Service
// ─────────────────────────────────────────────────────────────────────────────

class IAPService {
  private isInitialized = false;
  private products: IAPItemDetails[] = [];

  /**
   * Initialize the IAP connection and fetch product details from the store
   */
  async initialize(): Promise<void> {
    console.log('🛒 [IAP] Initializing In-App Purchase service...');

    if (this.isInitialized) {
      console.log('✅ [IAP] Already initialized');
      return;
    }

    // Check if module is available
    if (!isModuleAvailable || !InAppPurchases) {
      console.warn('⚠️  [IAP] Module not available in this build - IAP disabled');
      return;
    }

    try {
      // Connect to the store
      console.log('🔌 [IAP] Connecting to App Store...');
      await InAppPurchases.connectAsync();
      console.log('✅ [IAP] Connected to App Store');

      // Get product IDs
      const productIds = COIN_PACKAGES.map((pkg) => pkg.id);
      console.log('📦 [IAP] Fetching product details for', productIds.length, 'packages...');

      // Fetch product details from store
      const { responseCode, results } = await InAppPurchases.getProductsAsync(productIds);

      if (responseCode === InAppPurchases?.IAPResponseCode?.OK && results) {
        this.products = results;
        console.log('✅ [IAP] Loaded', results.length, 'products from store');
        results.forEach((product: any) => {
          console.log(`   - ${product.productId}: ${product.price} ${product.currencyCode}`);
        });
      } else {
        console.warn('⚠️  [IAP] Failed to load products. Response code:', responseCode);
      }

      // Set up purchase listener
      console.log('👂 [IAP] Setting up purchase listener...');
      InAppPurchases.setPurchaseListener(this.handlePurchaseUpdate.bind(this) as any);

      this.isInitialized = true;
      console.log('🎉 [IAP] Initialization complete');
    } catch (error) {
      console.error('❌ [IAP] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get product details with live pricing from the store
   */
  getProducts(): IAPItemDetails[] {
    return this.products;
  }

  /**
   * Get a single product by ID
   */
  getProduct(productId: string): IAPItemDetails | undefined {
    return this.products.find((p) => p.productId === productId);
  }

  /**
   * Purchase a coin package
   */
  async purchasePackage(productId: string): Promise<void> {
    console.log('💳 [IAP] Starting purchase for product:', productId);

    // Check if module is available
    if (!isModuleAvailable || !InAppPurchases) {
      console.error('❌ [IAP] Module not available');
      const showError = useUIStore.getState().showError;
      showError('In-app purchases are not available in this build');
      return;
    }

    if (!this.isInitialized) {
      console.log('⚠️  [IAP] Not initialized, initializing now...');
      await this.initialize();
    }

    try {
      const showInfo = useUIStore.getState().showInfo;
      showInfo('Processing purchase...');

      console.log('🛍️  [IAP] Requesting purchase from store:', productId);
      // Initiate purchase
      await InAppPurchases.purchaseItemAsync(productId);

      console.log('⏳ [IAP] Purchase initiated, waiting for result...');
      // Purchase listener will handle the result
    } catch (error: any) {
      console.error('❌ [IAP] Purchase failed:', error);

      const showInfo = useUIStore.getState().showInfo;
      const showError = useUIStore.getState().showError;

      if (error.code === 'E_USER_CANCELLED') {
        console.log('🚫 [IAP] User cancelled purchase');
        showInfo('Purchase cancelled');
      } else {
        console.error('❌ [IAP] Purchase error code:', error.code);
        showError('Purchase failed. Please try again.');
      }
    }
  }

  /**
   * Handle purchase updates from the store
   */
  private async handlePurchaseUpdate(update: any): Promise<void> {
    const { responseCode, results, errorCode } = update;

    console.log('📬 [IAP] Purchase update received');
    console.log('   - Response Code:', responseCode);
    console.log('   - Error Code:', errorCode);
    console.log('   - Results:', results?.length || 0, 'purchase(s)');

    if (responseCode === InAppPurchases?.IAPResponseCode?.OK && results) {
      console.log('✅ [IAP] Purchase successful, processing', results.length, 'item(s)...');
      for (const purchase of results) {
        await this.processPurchase(purchase);
      }
    } else if (responseCode === InAppPurchases?.IAPResponseCode?.USER_CANCELED) {
      console.log('🚫 [IAP] User cancelled purchase (from update)');
      // User cancelled - already handled in purchasePackage
    } else {
      console.error('❌ [IAP] Purchase error from store');
      console.error('   - Response Code:', responseCode);
      console.error('   - Error Code:', errorCode);

      const showError = useUIStore.getState().showError;
      showError('Purchase failed. Please contact support.');
    }
  }

  /**
   * Process a completed purchase
   */
  private async processPurchase(purchase: InAppPurchase): Promise<void> {
    console.log('⚙️  [IAP] Processing purchase:', purchase.productId);
    console.log('   - Transaction ID:', purchase.orderId || (purchase as any).transactionIdentifier);

    try {
      // Validate receipt server-side
      console.log('🔐 [IAP] Validating receipt with server...');
      const { data, error } = await supabase.rpc('validate_iap_receipt' as any, {
        product_id: purchase.productId,
        receipt_data: purchase.transactionReceipt || '',
        platform: Platform.OS,
        transaction_id: purchase.orderId || (purchase as any).transactionIdentifier || '',
      });

      if (error) {
        console.error('❌ [IAP] Receipt validation failed:', error);
        throw error;
      }

      if (data) {
        console.log('✅ [IAP] Receipt validated by server');

        // Parse the response
        const responseData = data as any;
        const coinsGranted = Number(responseData.coins_granted || 0);
        console.log('💰 [IAP] Coins granted:', coinsGranted.toLocaleString());

        // Update wallet balance
        console.log('🔄 [IAP] Refreshing wallet balance...');
        const fetchBalance = useWalletStore.getState().fetchBalance;
        await fetchBalance();

        // Show success
        const showSuccess = useUIStore.getState().showSuccess;
        showSuccess(`Purchase successful! ${coinsGranted.toLocaleString()} coins added.`);

        // Finish transaction
        console.log('✔️  [IAP] Finishing transaction (consumed=true)...');
        await InAppPurchases.finishTransactionAsync(purchase, true as any);
        console.log('🎉 [IAP] Purchase processing complete!');
      }
    } catch (error) {
      console.error('❌ [IAP] Processing failed:', error);

      const showError = useUIStore.getState().showError;
      showError('Failed to process purchase. Please contact support.');

      // Finish transaction as consumed=false so user can retry
      console.log('⚠️  [IAP] Finishing transaction (consumed=false) for retry...');
      await InAppPurchases.finishTransactionAsync(purchase, false as any);
    }
  }

  /**
   * Restore previous purchases (iOS only)
   */
  async restorePurchases(): Promise<void> {
    if (Platform.OS !== 'ios') {
      const showInfo = useUIStore.getState().showInfo;
      showInfo('Restore is only available on iOS');
      return;
    }

    try {
      const showInfo = useUIStore.getState().showInfo;
      const showSuccess = useUIStore.getState().showSuccess;
      const showError = useUIStore.getState().showError;

      showInfo('Restoring purchases...');

      // Note: Restore is handled automatically by the purchase listener
      // This just re-fetches the purchase history
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();

      if (responseCode === InAppPurchases?.IAPResponseCode?.OK && results && results.length > 0) {
        showSuccess(`Found ${results.length} purchase(s) to restore`);

        // Process each historical purchase
        for (const purchase of results) {
          await this.processPurchase(purchase);
        }
      } else {
        showInfo('No purchases to restore');
      }
    } catch (error) {
      console.error('IAP: Restore failed', error);

      const showError = useUIStore.getState().showError;
      showError('Failed to restore purchases');
    }
  }

  /**
   * Disconnect from the store
   */
  async disconnect(): Promise<void> {
    if (this.isInitialized) {
      await InAppPurchases.disconnectAsync();
      this.isInitialized = false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

export const IAPManager = new IAPService();

// Auto-initialize on import (in production) - only if module is available
if (!__DEV__ && isModuleAvailable) {
  console.log('🚀 [IAP] Auto-initializing in production mode...');
  IAPManager.initialize().catch((error) => {
    console.error('❌ [IAP] Auto-init failed:', error);
  });
}
