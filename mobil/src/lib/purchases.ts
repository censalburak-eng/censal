import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesError,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesStoreProduct,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

const apikey =
  Platform.OS === 'android'
    ? (process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY ?? 'goog_gbaBpiRDunQgkorRaDyYoCYOvrg')
    : Platform.OS === 'ios'
    ? (process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? '')
    : '';

// RevenueCat Configuration
export const REVENUECAT_CONFIG = {
  apiKey: apikey,
  entitlementId: 'censal_pro',
  products: {
    pin24h: 'censal_pin_24h',
    yearly: 'censal_premium_yearly',
    monthly: 'censal_premium_monthly',
  },
} as const;

let isConfigured = false;
let initPromise: Promise<void> | null = null;

export const ensureRevenueCatConfigured = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !REVENUECAT_CONFIG.apiKey) return false;
  if (isConfigured) return true;
  if (initPromise) {
    await initPromise;
    return isConfigured;
  }
  return false;
};

/**
 * Initializes the RevenueCat Purchases SDK.
 * Should be called once during app startup (e.g. in _layout.tsx).
 * Android Google Play Billing is supported; iOS uses admin-approved requests.
 */
export const initializeRevenueCat = async (userId?: string): Promise<void> => {
  // Sadece Android platformunda RevenueCat (Google Play Billing) başlatılır
  if (Platform.OS !== 'android' || !REVENUECAT_CONFIG.apiKey) {
    return;
  }

  if (isConfigured) {
    if (userId) {
      await identifyRevenueCatUser(userId);
    }
    return;
  }

  if (initPromise) {
    await initPromise;
    if (userId) {
      await identifyRevenueCatUser(userId);
    }
    return;
  }

  initPromise = (async () => {
    try {
      if (__DEV__) {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      } else {
        await Purchases.setLogLevel(LOG_LEVEL.INFO);
      }

      Purchases.configure({
        apiKey: REVENUECAT_CONFIG.apiKey,
        appUserID: userId ?? null,
      });

      isConfigured = true;
      console.info('[RevenueCat] SDK successfully initialized with user:', userId ?? 'anonymous');
    } catch (error) {
      console.error('[RevenueCat] Initialization failed:', error);
    } finally {
      initPromise = null;
    }
  })();

  await initPromise;
};

/**
 * Associates purchases with your app's user ID (e.g. Supabase user UUID).
 */
export const identifyRevenueCatUser = async (userId: string): Promise<CustomerInfo | null> => {
  if (Platform.OS === 'web' || !isConfigured) return null;

  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Error identifying user:', error);
    return null;
  }
};

/**
 * Clears the user identity on logout.
 */
export const logoutRevenueCatUser = async (): Promise<CustomerInfo | null> => {
  if (Platform.OS === 'web' || !isConfigured) return null;

  try {
    return await Purchases.logOut();
  } catch (error) {
    console.error('[RevenueCat] Error during logout:', error);
    return null;
  }
};

/**
 * Checks whether the customer currently has the active `censal_pro` entitlement.
 */
export const hasCensalProEntitlement = (customerInfo: CustomerInfo | null | undefined): boolean => {
  if (!customerInfo) return false;
  const entitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId];
  return entitlement !== undefined && entitlement.isActive;
};

/**
 * Fetches the latest CustomerInfo from RevenueCat.
 */
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (Platform.OS === 'web' || !isConfigured) return null;

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('[RevenueCat] Failed to fetch customer info:', error);
    return null;
  }
};

/**
 * Fetches current offerings and packages configured in RevenueCat dashboard.
 */
export const getOfferings = async (): Promise<PurchasesOfferings | null> => {
  if (Platform.OS === 'web') return null;
  await ensureRevenueCatConfigured();
  if (!isConfigured) return null;

  try {
    return await Purchases.getOfferings();
  } catch (error) {
    console.error('[RevenueCat] Failed to fetch offerings:', error);
    return null;
  }
};

/**
 * Fetches subscription products directly from Google Play / Store.
 */
export const getSubscriptionStoreProducts = async (): Promise<{
  monthlyProduct: PurchasesStoreProduct | null;
  yearlyProduct: PurchasesStoreProduct | null;
}> => {
  if (Platform.OS === 'web') return { monthlyProduct: null, yearlyProduct: null };
  await ensureRevenueCatConfigured();
  if (!isConfigured) return { monthlyProduct: null, yearlyProduct: null };

  try {
    const products = await Purchases.getProducts([
      'censal_premium_monthly',
      'monthly',
      'censal_monthly',
      'censal_premium_yearly',
      'yearly',
      'censal_yearly',
    ]);

    const monthlyProduct =
      products.find(
        (p) =>
          p.identifier === 'censal_premium_monthly' ||
          p.identifier === 'monthly' ||
          p.identifier.toLowerCase().includes('monthly')
      ) ?? null;

    const yearlyProduct =
      products.find(
        (p) =>
          p.identifier === 'censal_premium_yearly' ||
          p.identifier === 'yearly' ||
          p.identifier.toLowerCase().includes('yearly') ||
          p.identifier.toLowerCase().includes('annual')
      ) ?? null;

    return { monthlyProduct, yearlyProduct };
  } catch (error) {
    console.warn('[RevenueCat] Failed to fetch subscription products from Google Play:', error);
    return { monthlyProduct: null, yearlyProduct: null };
  }
};

/**
 * Fetches the 24h Pinned Listing product directly from Google Play / Store.
 */
export const getPinStoreProduct = async (): Promise<PurchasesStoreProduct | null> => {
  if (Platform.OS === 'web') return null;
  await ensureRevenueCatConfigured();
  if (!isConfigured) return null;

  try {
    const products = await Purchases.getProducts([
      REVENUECAT_CONFIG.products.pin24h,
      'censal_pin_24h',
      'pin_24h',
    ]);
    if (products && products.length > 0) {
      return products[0];
    }
    return null;
  } catch (error) {
    console.warn('[RevenueCat] Failed to fetch pin product from Google Play:', error);
    return null;
  }
};

/**
 * Purchases a store product directly (e.g. non-subscription 24h pin product).
 */
export const purchaseStoreProduct = async (
  product: PurchasesStoreProduct
): Promise<{ customerInfo: CustomerInfo | null; userCancelled: boolean; error?: PurchasesError }> => {
  if (Platform.OS === 'web' || !isConfigured) {
    return { customerInfo: null, userCancelled: false };
  }

  try {
    const { customerInfo } = await Purchases.purchaseStoreProduct(product);
    return { customerInfo, userCancelled: false };
  } catch (error: unknown) {
    const purchasesError = error as PurchasesError;
    if (purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { customerInfo: null, userCancelled: true };
    }
    console.error('[RevenueCat] Purchase store product failed:', purchasesError);
    return { customerInfo: null, userCancelled: false, error: purchasesError };
  }
};

/**
 * Purchases a RevenueCat package (Monthly, Yearly, or Lifetime).
 * Handles user cancellations gracefully.
 */
export const purchasePackage = async (
  pkg: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo | null; userCancelled: boolean; error?: PurchasesError }> => {
  if (Platform.OS === 'web' || !isConfigured) {
    return { customerInfo: null, userCancelled: false };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { customerInfo, userCancelled: false };
  } catch (error: unknown) {
    const purchasesError = error as PurchasesError;
    if (purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { customerInfo: null, userCancelled: true };
    }
    console.error('[RevenueCat] Purchase failed:', purchasesError);
    return { customerInfo: null, userCancelled: false, error: purchasesError };
  }
};

/**
 * Restores previous purchases made by this user/Apple ID/Google Account.
 */
export const restorePurchases = async (): Promise<{
  customerInfo: CustomerInfo | null;
  hasCensalPro: boolean;
  error?: PurchasesError;
}> => {
  if (Platform.OS === 'web' || !isConfigured) {
    return { customerInfo: null, hasCensalPro: false };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasCensalPro = hasCensalProEntitlement(customerInfo);
    return { customerInfo, hasCensalPro };
  } catch (error: unknown) {
    const purchasesError = error as PurchasesError;
    console.error('[RevenueCat] Restore failed:', purchasesError);
    return { customerInfo: null, hasCensalPro: false, error: purchasesError };
  }
};

/**
 * Displays the native RevenueCat Paywall modally.
 */
export const presentRevenueCatPaywall = async (): Promise<PAYWALL_RESULT> => {
  if (Platform.OS === 'web') return PAYWALL_RESULT.NOT_PRESENTED;

  try {
    return await RevenueCatUI.presentPaywall();
  } catch (error) {
    console.error('[RevenueCatUI] Failed to present paywall:', error);
    return PAYWALL_RESULT.ERROR;
  }
};

/**
 * Presents the RevenueCat Paywall only if the user does NOT have `censal_pro`.
 */
export const presentPaywallIfNeeded = async (): Promise<PAYWALL_RESULT> => {
  if (Platform.OS === 'web') return PAYWALL_RESULT.NOT_PRESENTED;

  try {
    return await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: REVENUECAT_CONFIG.entitlementId,
    });
  } catch (error) {
    console.error('[RevenueCatUI] Failed to present paywall if needed:', error);
    return PAYWALL_RESULT.ERROR;
  }
};

/**
 * Opens RevenueCat Customer Center for users to manage, cancel, or switch subscriptions.
 */
export const presentCustomerCenter = async (): Promise<void> => {
  if (Platform.OS === 'web') return;

  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (error) {
    console.error('[RevenueCatUI] Failed to present customer center:', error);
  }
};
