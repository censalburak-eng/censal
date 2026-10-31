import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesStoreProduct,
  PurchasesError,
} from 'react-native-purchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import {
  REVENUECAT_CONFIG,
  hasCensalProEntitlement,
  getCustomerInfo,
  getOfferings,
  getPinStoreProduct,
  getSubscriptionStoreProducts,
  purchaseStoreProduct,
  purchasePackage as executePurchase,
  restorePurchases as executeRestore,
  presentRevenueCatPaywall,
  presentPaywallIfNeeded as executePresentPaywallIfNeeded,
  presentCustomerCenter as executePresentCustomerCenter,
} from '../lib/purchases';
import { useAuth } from './useAuth';
import { syncRevenueCatSubscription } from '../api/subscriptionApi';

export interface UseRevenueCatResult {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  isPro: boolean;
  isLoading: boolean;
  packages: {
    monthly: PurchasesPackage | null;
    yearly: PurchasesPackage | null;
    lifetime: PurchasesPackage | null;
    pin24h: PurchasesPackage | null;
  };
  pinProduct: PurchasesStoreProduct | null;
  monthlyProduct: PurchasesStoreProduct | null;
  yearlyProduct: PurchasesStoreProduct | null;
  monthlyPriceString: string | null;
  yearlyPriceString: string | null;
  pinPriceString: string | null;
  purchase: (pkg: PurchasesPackage) => Promise<{
    success: boolean;
    userCancelled: boolean;
    error?: PurchasesError;
  }>;
  purchasePin: () => Promise<{
    success: boolean;
    userCancelled: boolean;
    error?: PurchasesError;
  }>;
  restore: () => Promise<{
    success: boolean;
    isPro: boolean;
    error?: PurchasesError;
  }>;
  presentPaywall: () => Promise<PAYWALL_RESULT>;
  presentPaywallIfNeeded: () => Promise<PAYWALL_RESULT>;
  presentCustomerCenter: () => Promise<void>;
  refetchCustomerInfo: () => Promise<CustomerInfo | null>;
  refetchOfferings: () => Promise<void>;
}

// Modül düzeyinde önbellek - Tüm bileşenlerin aynı yükleme durumunu ve veriyi paylaşmasını sağlar
let cachedCustomerInfo: CustomerInfo | null = null;
let cachedOfferings: PurchasesOfferings | null = null;
let cachedPinProduct: PurchasesStoreProduct | null = null;
let cachedMonthlyProduct: PurchasesStoreProduct | null = null;
let cachedYearlyProduct: PurchasesStoreProduct | null = null;
let isInitialLoaded = false;
let activeLoadPromise: Promise<void> | null = null;

export const useRevenueCat = (): UseRevenueCatResult => {
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(cachedCustomerInfo);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(cachedOfferings);
  const [pinProduct, setPinProduct] = useState<PurchasesStoreProduct | null>(cachedPinProduct);
  const [monthlyProduct, setMonthlyProduct] = useState<PurchasesStoreProduct | null>(cachedMonthlyProduct);
  const [yearlyProduct, setYearlyProduct] = useState<PurchasesStoreProduct | null>(cachedYearlyProduct);
  const [isLoading, setIsLoading] = useState(!isInitialLoaded);

  // Load initial customer info & offerings
  const loadData = useCallback(async (force = false) => {
    // Sadece Android'de RevenueCat mağaza verisi çekilir (iOS yönetici onaylı sistem kullanır)
    if (Platform.OS !== 'android') {
      setIsLoading(false);
      return;
    }

    if (activeLoadPromise && !force) {
      await activeLoadPromise;
      setCustomerInfo(cachedCustomerInfo);
      setOfferings(cachedOfferings);
      setPinProduct(cachedPinProduct);
      setMonthlyProduct(cachedMonthlyProduct);
      setYearlyProduct(cachedYearlyProduct);
      setIsLoading(false);
      return;
    }

    try {
      if (!isInitialLoaded || force) {
        setIsLoading(true);
      }

      const fetchPromise = Promise.all([
        getCustomerInfo(),
        getOfferings(),
        getPinStoreProduct(),
        getSubscriptionStoreProducts(),
      ]);
      const timeoutPromise = new Promise<[null, null, null, { monthlyProduct: null; yearlyProduct: null }]>((resolve) =>
        setTimeout(() => resolve([null, null, null, { monthlyProduct: null, yearlyProduct: null }]), 5000)
      );

      activeLoadPromise = Promise.race([fetchPromise, timeoutPromise])
        .then(([info, currentOfferings, pinProd, subProds]) => {
          if (info) {
            cachedCustomerInfo = info;
          }
          if (currentOfferings) {
            cachedOfferings = currentOfferings;
          }
          if (pinProd) {
            cachedPinProduct = pinProd;
          }
          if (subProds?.monthlyProduct) {
            cachedMonthlyProduct = subProds.monthlyProduct;
          }
          if (subProds?.yearlyProduct) {
            cachedYearlyProduct = subProds.yearlyProduct;
          }
          isInitialLoaded = true;
        })
        .finally(() => {
          activeLoadPromise = null;
        });

      await activeLoadPromise;

      if (cachedCustomerInfo) {
        setCustomerInfo(cachedCustomerInfo);
        if (user?.id && hasCensalProEntitlement(cachedCustomerInfo)) {
          syncRevenueCatSubscription(user.id, cachedCustomerInfo).catch(() => {});
        }
      }
      if (cachedOfferings) {
        setOfferings(cachedOfferings);
      }
      if (cachedPinProduct) {
        setPinProduct(cachedPinProduct);
      }
      if (cachedMonthlyProduct) {
        setMonthlyProduct(cachedMonthlyProduct);
      }
      if (cachedYearlyProduct) {
        setYearlyProduct(cachedYearlyProduct);
      }
    } catch (err) {
      console.warn('[useRevenueCat] Error loading purchases data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();

    if (Platform.OS === 'web') return;

    // Listen to real-time subscription changes (renewals, cancellations, etc.)
    const listener = (info: CustomerInfo) => {
      cachedCustomerInfo = info;
      setCustomerInfo(info);
      if (user?.id && hasCensalProEntitlement(info)) {
        syncRevenueCatSubscription(user.id, info).catch(() => {});
      }
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [loadData, user?.id]);

  const isPro = hasCensalProEntitlement(customerInfo ?? cachedCustomerInfo);

  // Helper to extract monthly, yearly, and lifetime packages
  const currentOffering = offerings?.current;
  const monthlyPackage =
    currentOffering?.monthly ??
    currentOffering?.availablePackages.find(
      (p) =>
        p.identifier === REVENUECAT_CONFIG.products.monthly ||
        p.product.identifier === REVENUECAT_CONFIG.products.monthly
    ) ??
    null;

  const yearlyPackage =
    currentOffering?.annual ??
    currentOffering?.availablePackages.find(
      (p) =>
        p.identifier === REVENUECAT_CONFIG.products.yearly ||
        p.product.identifier === REVENUECAT_CONFIG.products.yearly
    ) ??
    null;

  const pin24hPackage =
    currentOffering?.availablePackages.find(
      (p) =>
        p.identifier === 'pin_24h' ||
        p.identifier === REVENUECAT_CONFIG.products.pin24h ||
        p.product.identifier === REVENUECAT_CONFIG.products.pin24h
    ) ?? null;

  const lifetimePackage =
    currentOffering?.lifetime ??
    currentOffering?.availablePackages.find(
      (p) =>
        p.identifier === 'lifetime' ||
        p.product.identifier === 'lifetime'
    ) ??
    null;

  const purchase = async (pkg: PurchasesPackage) => {
    const res = await executePurchase(pkg);
    if (res.customerInfo) {
      setCustomerInfo(res.customerInfo);
      if (user?.id && hasCensalProEntitlement(res.customerInfo)) {
        await syncRevenueCatSubscription(user.id, res.customerInfo).catch(() => {});
      }
      return {
        success: hasCensalProEntitlement(res.customerInfo),
        userCancelled: false,
      };
    }
    return {
      success: false,
      userCancelled: res.userCancelled,
      error: res.error,
    };
  };

  const restore = async () => {
    const res = await executeRestore();
    if (res.customerInfo) {
      setCustomerInfo(res.customerInfo);
      if (user?.id && res.hasCensalPro) {
        await syncRevenueCatSubscription(user.id, res.customerInfo).catch(() => {});
      }
    }
    return {
      success: res.hasCensalPro,
      isPro: res.hasCensalPro,
      error: res.error,
    };
  };

  const monthlyPriceString =
    monthlyPackage?.product.priceString ??
    monthlyProduct?.priceString ??
    null;

  const yearlyPriceString =
    yearlyPackage?.product.priceString ??
    yearlyProduct?.priceString ??
    null;

  const pinPriceString =
    pin24hPackage?.product.priceString ??
    pinProduct?.priceString ??
    null;

  const purchasePin = async () => {
    if (pin24hPackage) {
      return await purchase(pin24hPackage);
    }
    if (pinProduct) {
      const res = await purchaseStoreProduct(pinProduct);
      return {
        success: !res.userCancelled && !res.error,
        userCancelled: res.userCancelled,
        error: res.error,
      };
    }
    return {
      success: false,
      userCancelled: false,
      error: undefined,
    };
  };

  const refetchCustomerInfo = async () => {
    const info = await getCustomerInfo();
    if (info) setCustomerInfo(info);
    return info;
  };

  const refetchOfferings = async () => {
    await loadData(true);
  };

  return {
    customerInfo,
    offerings,
    isPro,
    isLoading,
    packages: {
      monthly: monthlyPackage,
      yearly: yearlyPackage,
      lifetime: lifetimePackage,
      pin24h: pin24hPackage,
    },
    pinProduct,
    monthlyProduct,
    yearlyProduct,
    monthlyPriceString,
    yearlyPriceString,
    pinPriceString,
    purchase,
    purchasePin,
    restore,
    presentPaywall: presentRevenueCatPaywall,
    presentPaywallIfNeeded: executePresentPaywallIfNeeded,
    presentCustomerCenter: executePresentCustomerCenter,
    refetchCustomerInfo,
    refetchOfferings,
  };
};
