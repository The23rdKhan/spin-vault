/**
 * In-App Purchase Service
 *
 * Handles coin package purchases via Apple App Store and Google Play Store.
 * All receipts are validated server-side via Supabase RPC.
 */

import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform } from 'react-native';

import { supabase } from './supabase';
import { useWalletStore } from '../stores/walletSlice';
import { useUIStore } from '../stores/uiSlice';

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
  private products: InAppPurchases.IAPItemDetails[] = [];

  /**
   * Initialize the IAP connection and fetch product details from the store
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Connect to the store
      await InAppPurchases.connectAsync();

      // Get product IDs
      const productIds = COIN_PACKAGES.map((pkg) => pkg.id);

      // Fetch product details from store
      const { responseCode, results } = await InAppPurchases.getProductsAsync(productIds);

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        this.products = results;
        console.log(`IAP: Loaded ${results.length} products`);
      } else {
        console.warn('IAP: Failed to load products', responseCode);
      }

      // Set up purchase listener
      InAppPurchases.setPurchaseListener(this.handlePurchaseUpdate.bind(this) as any);

      this.isInitialized = true;
    } catch (error) {
      console.error('IAP: Initialization failed', error);
      throw error;
    }
  }

  /**
   * Get product details with live pricing from the store
   */
  getProducts(): InAppPurchases.IAPItemDetails[] {
    return this.products;
  }

  /**
   * Get a single product by ID
   */
  getProduct(productId: string): InAppPurchases.IAPItemDetails | undefined {
    return this.products.find((p) => p.productId === productId);
  }

  /**
   * Purchase a coin package
   */
  async purchasePackage(productId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const showInfo = useUIStore.getState().showInfo;
      showInfo('Processing purchase...');

      // Initiate purchase
      await InAppPurchases.purchaseItemAsync(productId);

      // Purchase listener will handle the result
    } catch (error: any) {
      console.error('IAP: Purchase failed', error);

      const showInfo = useUIStore.getState().showInfo;
      const showError = useUIStore.getState().showError;

      if (error.code === 'E_USER_CANCELLED') {
        showInfo('Purchase cancelled');
      } else {
        showError('Purchase failed. Please try again.');
      }
    }
  }

  /**
   * Handle purchase updates from the store
   */
  private async handlePurchaseUpdate(update: any): Promise<void> {
    const { responseCode, results, errorCode } = update;

    console.log('IAP: Purchase update', { responseCode, errorCode });

    if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
      for (const purchase of results) {
        await this.processPurchase(purchase);
      }
    } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
      // User cancelled - already handled in purchasePackage
    } else {
      console.error('IAP: Purchase error', { responseCode, errorCode });

      const showError = useUIStore.getState().showError;
      showError('Purchase failed. Please contact support.');
    }
  }

  /**
   * Process a completed purchase
   */
  private async processPurchase(purchase: InAppPurchases.InAppPurchase): Promise<void> {
    try {
      console.log('IAP: Processing purchase', purchase.productId);

      // Validate receipt server-side
      const { data, error } = await supabase.rpc('validate_iap_receipt' as any, {
        product_id: purchase.productId,
        receipt_data: purchase.transactionReceipt || '',
        platform: Platform.OS,
        transaction_id: purchase.orderId || (purchase as any).transactionIdentifier || '',
      });

      if (error) {
        console.error('IAP: Receipt validation failed', error);
        throw error;
      }

      if (data) {
        console.log('IAP: Purchase validated', data);

        // Parse the response
        const responseData = data as any;

        // Update wallet balance
        const fetchBalance = useWalletStore.getState().fetchBalance;
        await fetchBalance();

        // Show success
        const showSuccess = useUIStore.getState().showSuccess;
        showSuccess(
          `Purchase successful! ${Number(responseData.coins_granted || 0).toLocaleString()} coins added.`
        );

        // Finish transaction
        await InAppPurchases.finishTransactionAsync(purchase, true as any);
      }
    } catch (error) {
      console.error('IAP: Processing failed', error);

      const showError = useUIStore.getState().showError;
      showError('Failed to process purchase. Please contact support.');

      // Finish transaction as consumed=false so user can retry
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

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
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

// Auto-initialize on import (in production)
if (!__DEV__) {
  IAPManager.initialize().catch((error) => {
    console.error('IAP: Auto-init failed', error);
  });
}
