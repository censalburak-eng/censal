import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/usersApi';
import { toast } from 'sonner';

export const userKeys = {
  all: ['users'] as const,
  list: (search?: string) => [...userKeys.all, 'list', search ?? ''] as const,
};

export function useUsers(search?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: userKeys.list(search),
    queryFn: () => usersApi.getUsers(search),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const toggleBanMutation = useMutation({
    mutationFn: ({ userId, isBanned, reason }: { userId: string; isBanned: boolean; reason?: string }) =>
      usersApi.toggleBan(userId, isBanned, reason),
    onSuccess: (_, { isBanned }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin_logs'] });
      toast.success(isBanned ? 'Kullanıcı banlandı' : 'Kullanıcı banı kaldırıldı');
    },
    onError: (err: Error) => {
      toast.error('Ban durumu değiştirilemedi: ' + err.message);
    },
  });

  const grantSubscriptionMutation = useMutation({
    mutationFn: ({
      userId,
      plan,
      durationDays,
    }: {
      userId: string;
      plan: 'monthly' | 'yearly';
      durationDays?: number;
    }) => usersApi.grantSubscription(userId, plan, durationDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Abonelik başarıyla tanımlandı');
    },
    onError: (err: Error) => {
      toast.error('Abonelik tanımlanamadı: ' + err.message);
    },
  });

  const extendSubscriptionMutation = useMutation({
    mutationFn: ({
      subscriptionId,
      additionalDays,
    }: {
      subscriptionId: string;
      additionalDays: number;
    }) => usersApi.extendSubscription(subscriptionId, additionalDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Abonelik süresi başarıyla uzatıldı');
    },
    onError: (err: Error) => {
      toast.error('Abonelik uzatılamadı: ' + err.message);
    },
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    toggleBan: toggleBanMutation.mutate,
    isTogglingBan: toggleBanMutation.isPending,
    grantSubscription: grantSubscriptionMutation.mutate,
    isGranting: grantSubscriptionMutation.isPending,
    extendSubscription: extendSubscriptionMutation.mutate,
    isExtending: extendSubscriptionMutation.isPending,
  };
}
