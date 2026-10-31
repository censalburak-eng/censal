import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { playApi } from "@/api/playApi";

export const PLAY_QUERY_KEYS = {
  products: ["play_products"] as const,
  logs: ["play_price_logs"] as const,
};

export function usePlayPricing() {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: PLAY_QUERY_KEYS.products,
    queryFn: () => playApi.getProducts(),
    staleTime: 1000 * 60 * 2, // 2 dk
  });

  const logsQuery = useQuery({
    queryKey: PLAY_QUERY_KEYS.logs,
    queryFn: () => playApi.getPriceLogs(),
    staleTime: 1000 * 30, // 30 sn
  });

  const updatePriceMutation = useMutation({
    mutationFn: playApi.updatePrice,
    onSuccess: (data, variables) => {
      // Eğer dryRun değilse ürün listesini, logları, ayarları ve ödemeleri/ciroyu yenile
      if (!variables.dryRun) {
        queryClient.invalidateQueries({ queryKey: PLAY_QUERY_KEYS.products });
        queryClient.invalidateQueries({ queryKey: ['settings'] });
        queryClient.invalidateQueries({ queryKey: ['payments'] });
      }
      queryClient.invalidateQueries({ queryKey: PLAY_QUERY_KEYS.logs });
    },
  });

  return {
    products: productsQuery.data?.products || [],
    isMock: productsQuery.data?.mock ?? false,
    packageName: productsQuery.data?.packageName || "",
    isLoadingProducts: productsQuery.isLoading,
    isRefetchingProducts: productsQuery.isRefetching,
    productsError: productsQuery.error,
    refetchProducts: productsQuery.refetch,

    logs: logsQuery.data || [],
    isLoadingLogs: logsQuery.isLoading,
    refetchLogs: logsQuery.refetch,

    updatePrice: updatePriceMutation.mutateAsync,
    isUpdating: updatePriceMutation.isPending,
  };
}
