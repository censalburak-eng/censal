import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/api/paymentsApi';
import { toast } from 'sonner';

export const paymentKeys = {
  all: ['payments'] as const,
  list: (limit?: number) => [...paymentKeys.all, 'list', limit ?? 100] as const,
  stats: () => [...paymentKeys.all, 'stats'] as const,
  requests: () => [...paymentKeys.all, 'requests'] as const,
};

export function usePayments(limit = 100) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: paymentKeys.list(limit),
    queryFn: () => paymentsApi.getPayments(limit),
    refetchInterval: 15_000,
  });

  const requestsQuery = useQuery({
    queryKey: paymentKeys.requests(),
    queryFn: () => paymentsApi.getPaymentRequests(),
    refetchInterval: 10_000,
  });

  const statsQuery = useQuery({
    queryKey: paymentKeys.stats(),
    queryFn: paymentsApi.getRevenueStats,
    refetchInterval: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, note }: { requestId: string; note?: string }) => {
      return await paymentsApi.approvePaymentRequest(requestId, note);
    },
    // invalidate promise'i döndürülür: mutateAsync liste yenilenene kadar bekler,
    // böylece işlenmiş talebin butonları liste güncellenmeden tekrar aktif olmaz
    onSuccess: () => {
      toast.success('Ödeme talebi onaylandı ve hizmet kullanıcıya tanımlandı!');
      return queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
    onError: (err: any) => {
      toast.error(`Onaylama hatası: ${err.message || 'İşlem başarısız'}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      return await paymentsApi.rejectPaymentRequest(requestId, reason);
    },
    onSuccess: () => {
      toast.info('Ödeme talebi reddedildi.');
      return queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
    onError: (err: any) => {
      toast.error(`Reddetme hatası: ${err.message || 'İşlem başarısız'}`);
    },
  });

  const failedPayments = (listQuery.data ?? []).filter((p) => p.status === 'failed');
  const successPayments = (listQuery.data ?? []).filter((p) => p.status === 'success');
  const requests = requestsQuery.data ?? [];
  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return {
    payments: listQuery.data ?? [],
    requests,
    pendingRequests,
    failedPayments,
    successPayments,
    stats: statsQuery.data,
    isLoading: listQuery.isLoading || statsQuery.isLoading || requestsQuery.isLoading,
    isError: listQuery.isError || statsQuery.isError || requestsQuery.isError,
    approvePayment: (requestId: string, note?: string) => approveMutation.mutateAsync({ requestId, note }),
    rejectPayment: (requestId: string, reason?: string) => rejectMutation.mutateAsync({ requestId, reason }),
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    refetch: () => {
      listQuery.refetch();
      requestsQuery.refetch();
      statsQuery.refetch();
    },
  };
}
