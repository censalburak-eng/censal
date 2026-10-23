import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '@/api/paymentsApi';

export const paymentKeys = {
  all: ['payments'] as const,
  list: (limit?: number) => [...paymentKeys.all, 'list', limit ?? 100] as const,
  stats: () => [...paymentKeys.all, 'stats'] as const,
};

export function usePayments(limit = 100) {
  const listQuery = useQuery({
    queryKey: paymentKeys.list(limit),
    queryFn: () => paymentsApi.getPayments(limit),
    refetchInterval: 15_000, // Live updates every 15s
  });

  const statsQuery = useQuery({
    queryKey: paymentKeys.stats(),
    queryFn: paymentsApi.getRevenueStats,
    refetchInterval: 30_000,
  });

  const failedPayments = (listQuery.data ?? []).filter((p) => p.status === 'failed');
  const successPayments = (listQuery.data ?? []).filter((p) => p.status === 'success');

  return {
    payments: listQuery.data ?? [],
    failedPayments,
    successPayments,
    stats: statsQuery.data,
    isLoading: listQuery.isLoading || statsQuery.isLoading,
    isError: listQuery.isError || statsQuery.isError,
    refetch: () => {
      listQuery.refetch();
      statsQuery.refetch();
    },
  };
}
