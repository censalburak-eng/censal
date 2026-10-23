import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAppSettings, getCachedAppSettings } from '../api/settingsApi';
import { getActiveSubscription, createMockSubscription, subscriptionKeys } from '../api/subscriptionApi';
import { SubscriptionPlan } from '../types/settings.types';

export const entitlementKeys = {
  all: ['entitlement'] as const,
  settings: () => ['app_settings'] as const,
  subscription: (userId?: string) => subscriptionKeys.detail(userId),
};

export const useEntitlement = (userId?: string) => {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['app_settings'],
    queryFn: fetchAppSettings,
    placeholderData: getCachedAppSettings,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    retry: (count, err: unknown) => {
      const dbErr = err as { code?: string } | null;
      return dbErr?.code !== '42703' && count < 2;
    },
  });

  const subscriptionQuery = useQuery({
    queryKey: subscriptionKeys.detail(userId),
    queryFn: () => getActiveSubscription(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const mockSubscribeMutation = useMutation({
    mutationFn: (plan: SubscriptionPlan) => {
      if (!userId) throw new Error('Kullanıcı oturumu bulunamadı');
      return createMockSubscription(userId, plan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(userId) });
    },
  });

  const isFreeMode = settingsQuery.data?.free_mode ?? false;
  const hasActiveSubscription = !!subscriptionQuery.data;

  // Odalar ilk render edildiğinde kilitlerin yanıp sönmesini engelle (UX düzeltmesi):
  // Veriler yüklenirken (isChecking) odaları KİLİTLİ gösterme (canAccessRooms = true).
  // Sadece yükleme tamamlandığında kullanıcı yetkisizse kilitlenir.
  const isChecking = settingsQuery.isLoading || (!!userId && subscriptionQuery.isLoading);
  const canAccessRooms = isChecking ? true : (isFreeMode || hasActiveSubscription);

  return {
    settings: settingsQuery.data,
    subscription: subscriptionQuery.data,
    isFreeMode,
    hasActiveSubscription,
    canAccessRooms,
    isLoading: isChecking,
    mockSubscribe: mockSubscribeMutation.mutateAsync,
    isSubscribing: mockSubscribeMutation.isPending,
  };
};
