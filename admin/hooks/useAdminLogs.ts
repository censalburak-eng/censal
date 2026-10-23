import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logsApi, type AdminLog } from "@/api/logsApi";

export const logKeys = {
  all: ["admin_logs"] as const,
  list: (limit: number) => [...logKeys.all, "list", limit] as const,
};

export function useAdminLogs(limit = 100) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: logKeys.list(limit),
    queryFn: () => logsApi.getLogs(limit),
    placeholderData: (prev) => prev,
    refetchInterval: 15_000,
  });

  const logActionMutation = useMutation({
    mutationFn: logsApi.logAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logKeys.all });
    },
  });

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    logAction: logActionMutation.mutate,
  };
}
