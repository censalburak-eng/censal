import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type AppSettings } from '@/api/settingsApi';
import { toast } from 'sonner';
import { cityApi } from '@/api/cityApi';

import { logsApi } from '@/api/logsApi';

export const settingsKeys = {
  all: ['settings'] as const,
  app: () => [...settingsKeys.all, 'app'] as const,
  cities: () => [...settingsKeys.all, 'cities'] as const,
};

export function useAppSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: settingsKeys.app(),
    queryFn: settingsApi.getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: settingsApi.updateSettings,
    onSuccess: (updated: AppSettings) => {
      queryClient.setQueryData(settingsKeys.app(), updated);
      queryClient.invalidateQueries({ queryKey: ['admin_logs'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Ayarlar başarıyla güncellendi');
      logsApi.logAction({
        action: 'SETTINGS_UPDATE',
        target_type: 'settings',
        target_id: '1',
        details: {
          free_mode: updated.free_mode,
          price_monthly: updated.price_monthly,
          price_yearly: updated.price_yearly,
          price_pin_24h: updated.price_pin_24h,
        },
      });
    },
    onError: (err: Error) => {
      toast.error('Ayarlar güncellenirken hata oluştu: ' + err.message);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

export function useCityQuotas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: settingsKeys.cities(),
    queryFn: cityApi.getCityQuotas,
  });

  const updateLimitMutation = useMutation({
    mutationFn: ({ cityId, maxLimit }: { cityId: number; maxLimit: number }) =>
      cityApi.updateCityQuota({ cityId, maxLimit }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.cities() });
      queryClient.invalidateQueries({ queryKey: ['admin_logs'] });
      toast.success('Oda kontenjan limiti güncellendi');
      logsApi.logAction({
        action: 'QUOTA_UPDATE',
        target_type: 'cities',
        target_id: String(variables.cityId),
        details: {
          new_limit: variables.maxLimit,
        },
      });
    },
    onError: (err: Error) => {
      toast.error('Kontenjan güncellenirken hata: ' + err.message);
    },
  });

  return {
    cities: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    updateLimit: updateLimitMutation.mutate,
    isUpdating: updateLimitMutation.isPending,
  };
}
