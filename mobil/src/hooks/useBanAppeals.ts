import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { banAppealApi, type BanAppeal } from '../api/banAppealApi';

export const banAppealKeys = {
  all: ['ban_appeals'] as const,
  mine: () => [...banAppealKeys.all, 'mine'] as const,
};

export function useBanAppeals() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: banAppealKeys.mine(),
    queryFn: banAppealApi.getMyBanAppeals,
    staleTime: 10_000,
  });

  const sendMutation = useMutation({
    mutationFn: banAppealApi.sendBanAppeal,
    onSuccess: (newAppeal: BanAppeal) => {
      queryClient.setQueryData<BanAppeal[]>(banAppealKeys.mine(), (old = []) => [
        newAppeal,
        ...old,
      ]);
    },
  });

  const latestAppeal = query.data?.[0] ?? null;

  return {
    appeals: query.data ?? [],
    latestAppeal,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    sendAppeal: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
  };
}
