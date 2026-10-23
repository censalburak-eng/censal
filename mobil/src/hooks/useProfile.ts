import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, createProfile, updateProfile, deleteAccountAndData } from '../api/profileApi';
import { CreateProfileInput, UpdateProfileInput } from '../types/profile.types';

export const profileKeys = {
  all: ['profiles'] as const,
  detail: (userId: string) => [...profileKeys.all, 'detail', userId] as const,
};

export const useProfile = (userId?: string) => {
  return useQuery({
    queryKey: userId ? profileKeys.detail(userId) : profileKeys.all,
    queryFn: () => {
      if (!userId) return null;
      return getProfile(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
  });
};

export const useUpsertProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: CreateProfileInput }) =>
      createProfile(userId, input),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(profileKeys.detail(variables.userId), data);
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateProfileInput }) =>
      updateProfile(userId, input),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(profileKeys.detail(variables.userId), data);
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteAccountAndData(userId),
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

