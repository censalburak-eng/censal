import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, type ReportItem, type ActivePinItem, type BanAppealItem } from '@/api/moderationApi';
import { toast } from 'sonner';

export const moderationKeys = {
  all: ['moderation'] as const,
  reports: () => [...moderationKeys.all, 'reports'] as const,
  bannedWords: () => [...moderationKeys.all, 'bannedWords'] as const,
  pinnedListings: () => [...moderationKeys.all, 'pinnedListings'] as const,
  appeals: () => [...moderationKeys.all, 'appeals'] as const,
};

export function useModeration() {
  const queryClient = useQueryClient();

  const reportsQuery = useQuery({
    queryKey: moderationKeys.reports(),
    queryFn: () => moderationApi.getReports(),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const bannedWordsQuery = useQuery({
    queryKey: moderationKeys.bannedWords(),
    queryFn: () => moderationApi.getBannedWords(),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  const pinnedQuery = useQuery({
    queryKey: moderationKeys.pinnedListings(),
    queryFn: () => moderationApi.getActivePinnedListings(),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const appealsQuery = useQuery({
    queryKey: moderationKeys.appeals(),
    queryFn: () => moderationApi.getBanAppeals(),
    placeholderData: (prev) => prev,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const resolveReportMutation = useMutation({
    mutationFn: ({
      reportId,
      status,
      deleteMessage,
      messageId,
    }: {
      reportId: string;
      status: string;
      deleteMessage?: boolean;
      messageId?: string;
    }) => moderationApi.resolveReport(reportId, status, Boolean(deleteMessage), messageId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.reports() });
      if (vars.deleteMessage) {
        toast.success('Şikayet sonuçlandırıldı ve mesaj silindi');
      } else {
        toast.success('Şikayet güncellendi');
      }
    },
    onError: (err: Error) => {
      toast.error('İşlem başarısız: ' + err.message);
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => moderationApi.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.reports() });
      toast.success('Mesaj silindi');
    },
    onError: (err: Error) => {
      toast.error('Mesaj silinemedi: ' + err.message);
    },
  });

  const addBannedWordMutation = useMutation({
    mutationFn: (word: string) => moderationApi.addBannedWord(word),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.bannedWords() });
      toast.success('Yasaklı kelime eklendi');
    },
    onError: (err: Error) => {
      toast.error('Kelime eklenemedi: ' + err.message);
    },
  });

  const deleteBannedWordMutation = useMutation({
    mutationFn: (word: string) => moderationApi.deleteBannedWord(word),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.bannedWords() });
      toast.success('Yasaklı kelime silindi');
    },
    onError: (err: Error) => {
      toast.error('Kelime silinemedi: ' + err.message);
    },
  });

  const cancelPinMutation = useMutation({
    mutationFn: (pinId: string) => moderationApi.cancelPinnedListing(pinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.pinnedListings() });
      toast.success('Sabit ilan yayından kaldırıldı');
    },
    onError: (err: Error) => {
      toast.error('Sabitleme kaldırılamadı: ' + err.message);
    },
  });

  const reviewAppealMutation = useMutation({
    mutationFn: moderationApi.reviewBanAppeal,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.appeals() });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin_logs'] });
      if (vars.action === 'approve') {
        toast.success('İtiraz onaylandı ve kullanıcının banı kaldırıldı!');
      } else {
        toast.success('İtiraz reddedildi, ban aktif kalmaya devam ediyor.');
      }
    },
    onError: (err: Error) => {
      toast.error('İşlem başarısız: ' + err.message);
    },
  });

  return {
    reports: (reportsQuery.data ?? []) as ReportItem[],
    isLoadingReports: reportsQuery.isLoading,
    bannedWords: (bannedWordsQuery.data ?? []) as string[],
    isLoadingWords: bannedWordsQuery.isLoading,
    pinnedListings: (pinnedQuery.data ?? []) as ActivePinItem[],
    isLoadingPins: pinnedQuery.isLoading,

    appeals: (appealsQuery.data ?? []) as BanAppealItem[],
    isLoadingAppeals: appealsQuery.isLoading,
    reviewAppeal: reviewAppealMutation.mutate,
    isReviewingAppeal: reviewAppealMutation.isPending,

    resolveReport: resolveReportMutation.mutate,
    isResolvingReport: resolveReportMutation.isPending,
    deleteMessage: deleteMessageMutation.mutate,
    isDeletingMessage: deleteMessageMutation.isPending,

    addBannedWord: addBannedWordMutation.mutate,
    isAddingWord: addBannedWordMutation.isPending,
    deleteBannedWord: deleteBannedWordMutation.mutate,
    isDeletingWord: deleteBannedWordMutation.isPending,

    cancelPin: cancelPinMutation.mutate,
    isCancelingPin: cancelPinMutation.isPending,
  };
}
