import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchAppSettings, getCachedAppSettings } from '../api/settingsApi';
import { getActiveSubscription, subscriptionKeys, getUserPinnedListings, UserPinnedListingItem } from '../api/subscriptionApi';
import { useRevenueCat } from './useRevenueCat';

export const entitlementKeys = {
  all: ['entitlement'] as const,
  settings: () => ['app_settings'] as const,
  subscription: (userId?: string) => subscriptionKeys.detail(userId),
};

export const useEntitlement = (userId?: string) => {
  const settingsQuery = useQuery({
    queryKey: ['app_settings'],
    queryFn: fetchAppSettings,
    placeholderData: getCachedAppSettings,
    staleTime: 1000 * 15,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: 'always',
    retry: (count, err: unknown) => {
      const dbErr = err as { code?: string } | null;
      return dbErr?.code !== '42703' && count < 2;
    },
  });

  const { isPro, customerInfo, packages, purchase, restore, isLoading: isRevenueCatLoading } = useRevenueCat();

  // 1. KONTROL: Free Mode (Admin panelinden açılan ücretsiz mod)
  const isFreeMode = !settingsQuery.isError && settingsQuery.data?.free_mode === true;

  // 2. KONTROL: Supabase DB (RevenueCat henüz yüklenmemişse veya kullanıcı Pro ise DB sorgusu bekletilir)
  const subscriptionQuery = useQuery({
    queryKey: subscriptionKeys.detail(userId),
    queryFn: () => getActiveSubscription(userId),
    enabled: !!userId && !isFreeMode && !isPro && !isRevenueCatLoading,
    staleTime: 5 * 60 * 1000,
  });

  const hasDbSubscription = !subscriptionQuery.isError && !!subscriptionQuery.data;
  const hasActiveSubscription = hasDbSubscription || isPro;

  // Yetkilendirme Kontrol Yüklenme Durumu:
  // RevenueCat veya ayarlar sorgusu devam ederken kullanıcıya yanlışlıkla kilitli ekran gösterilmesini önlemek için
  // 'isChecking' true döner ve ekranlar loading (skeleton) durumunda kalır.
  const isChecking =
    settingsQuery.isLoading ||
    (Platform.OS !== 'web' && isRevenueCatLoading) ||
    (!!userId && !isPro && !isFreeMode && !isRevenueCatLoading && subscriptionQuery.isLoading);

  const canAccessRooms = isFreeMode || isPro || hasDbSubscription;

  return {
    settings: settingsQuery.data,
    subscription: subscriptionQuery.data,
    isFreeMode,
    isPro,
    hasActiveSubscription,
    canAccessRooms,
    isLoading: isChecking,
    isRevenueCatLoading,
    customerInfo,
    packages,
    purchase,
    restore,
  };
};

export const useUserPinnedListings = (userId?: string) => {
  return useQuery({
    queryKey: subscriptionKeys.userPins(userId),
    queryFn: () => getUserPinnedListings(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
};
