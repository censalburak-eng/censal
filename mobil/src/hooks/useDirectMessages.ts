import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  blockUser,
  unblockUser,
  fetchBlockedUsers,
  getOrCreateConversation,
  fetchConversations,
  fetchConversationById,
  fetchDirectMessages,
  sendDirectMessage,
  markDirectMessageRead,
  clearConversation,
  deleteDirectMessage,
  deleteConversation,
} from '../api/directMessagesApi';
import { DirectMessage, SendDirectMessageInput, Conversation } from '../types/directMessages.types';

export const dmKeys = {
  all: ['direct_messages'] as const,
  conversations: (userId?: string) => [...dmKeys.all, 'conversations', userId] as const,
  conversation: (conversationId: string) => [...dmKeys.all, 'conversation', conversationId] as const,
  messages: (conversationId: string) => [...dmKeys.all, 'messages', conversationId] as const,
  blocked: ['blocked_users'] as const,
};

// 1. ENGELLEME HOOKLARI
export const useBlockedUsers = () => {
  return useQuery({
    queryKey: dmKeys.blocked,
    queryFn: fetchBlockedUsers,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
};

export const useBlockUser = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (blockedId: string) => blockUser(blockedId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dmKeys.blocked });
      qc.invalidateQueries({ queryKey: ['messages'] }); // Oda mesajları da filtrelensin
      qc.invalidateQueries({ queryKey: dmKeys.all });
    },
  });
};

export const useUnblockUser = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (blockedId: string) => unblockUser(blockedId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dmKeys.blocked });
      qc.invalidateQueries({ queryKey: ['messages'] });
      qc.invalidateQueries({ queryKey: dmKeys.all });
    },
  });
};

// 2. KONUŞMALAR LİSTESİ
export const useConversations = (userId?: string) => {
  return useQuery({
    queryKey: dmKeys.conversations(userId),
    queryFn: () => (userId ? fetchConversations(userId) : []),
    enabled: !!userId,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
};

export const useConversation = (conversationId: string, userId?: string) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: dmKeys.conversation(conversationId),
    queryFn: () => (userId ? fetchConversationById(conversationId, userId) : null),
    enabled: !!userId && !!conversationId,
    initialData: () => {
      const all = queryClient.getQueryData<readonly Conversation[]>(dmKeys.conversations(userId));
      return all?.find((c) => c.id === conversationId);
    },
    staleTime: 5 * 60_000,
  });
};

// Realtime aboneliği — gelen mesaj ve konuşma güncellemelerinde debounced yeniler
export const useConversationsRealtime = (userId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedInvalidate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: dmKeys.conversations(userId) });
      }, 1000);
    };

    const channelName = `user_conv_${userId}_${Math.random().toString(36).substring(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
        },
        debouncedInvalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        debouncedInvalidate
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
};

export const useStartConversation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (otherUserId: string) => getOrCreateConversation(otherUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dmKeys.all });
    },
  });
};

// 3. DOĞRUDAN MESAJLAR & REALTIME
export const useDirectMessages = (conversationId: string, currentUserId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: dmKeys.messages(conversationId),
    queryFn: () => fetchDirectMessages(conversationId, currentUserId),
    enabled: !!conversationId,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  // Mesajlar yüklendiğinde okunmamış mesajları okundu olarak işaretle
  useEffect(() => {
    if (!conversationId || !currentUserId || !query.data || query.data.length === 0) return;
    const hasUnread = query.data.some(
      (m) => m.sender_id !== currentUserId && !m.read_at
    );
    if (hasUnread) {
      markDirectMessageRead(conversationId, currentUserId).then(() => {
        queryClient.invalidateQueries({ queryKey: dmKeys.conversations(currentUserId) });
      });
    }
  }, [conversationId, currentUserId, query.data, queryClient]);

  // Realtime Aboneliği
  useEffect(() => {
    if (!conversationId) return;

    const channelId = `dm_${conversationId}_${Math.random().toString(36).substring(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newDm = payload.new as DirectMessage;
          if (newDm.is_deleted) return;

          queryClient.setQueryData<DirectMessage[]>(
            dmKeys.messages(conversationId),
            (old = []) => {
              if (old.some((m) => m.id === newDm.id)) return old;

              // Reply parent'ı mevcut mesaj listesinden anında çöz (sıfır gecikme)
              let replyToMessage: { id: string; userName: string; body: string } | null = null;
              if (newDm.reply_to) {
                const parent = old.find((m) => m.id === String(newDm.reply_to));
                if (parent) {
                  let snippet = parent.body;
                  if (parent.type === 'image') snippet = '📷 Fotoğraf';
                  else if (parent.type === 'audio') snippet = '🎤 Ses';
                  else if (parent.type === 'location') snippet = '📍 Konum';

                  replyToMessage = {
                    id: parent.id,
                    userName: parent.sender_id === currentUserId ? 'Sen' : 'İleti',
                    body: snippet || '',
                  };
                }
              }

              // Kendi optimistic mesajımız ise id'sini güncelle
              const tempMatch = old.find(
                (m) => m.id.startsWith('optimistic_') && m.sender_id === newDm.sender_id && m.body === newDm.body
              );
              if (tempMatch) {
                return old.map((m) =>
                  m.id === tempMatch.id
                    ? {
                      ...m,
                      ...newDm,
                      id: String(newDm.id),
                      replyToMessage: m.replyToMessage ?? replyToMessage,
                    }
                    : m
                );
              }

              return [...old, { ...newDm, id: String(newDm.id), replyToMessage }];
            }
          );

          // Karşı tarafın mesajıysa okundu işaretle
          if (currentUserId && newDm.sender_id !== currentUserId) {
            markDirectMessageRead(conversationId, currentUserId).then(() => {
              queryClient.invalidateQueries({ queryKey: dmKeys.conversations(currentUserId) });
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedDm = payload.new as DirectMessage;
          queryClient.setQueryData<DirectMessage[]>(
            dmKeys.messages(conversationId),
            (old = []) => {
              if (updatedDm.is_deleted) {
                return old.filter((m) => m.id !== updatedDm.id);
              }
              return old.map((m) => (m.id === updatedDm.id ? { ...m, ...updatedDm } : m));
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedId = String((payload.old as any)?.id);
          if (!deletedId) return;
          queryClient.setQueryData<DirectMessage[]>(
            dmKeys.messages(conversationId),
            (old = []) => old.filter((m) => m.id !== deletedId)
          );
          queryClient.invalidateQueries({ queryKey: dmKeys.conversations() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, queryClient]);

  return query;
};

export const useSendDirectMessage = (conversationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ senderId, input }: { senderId: string; input: SendDirectMessageInput }) =>
      sendDirectMessage(senderId, input),
    // Optimistic Update
    onMutate: async ({ senderId, input }) => {
      await queryClient.cancelQueries({ queryKey: dmKeys.messages(conversationId) });
      const previous = queryClient.getQueryData<DirectMessage[]>(dmKeys.messages(conversationId));

      const optimisticMsg: DirectMessage = {
        id: `optimistic_${Date.now()}`,
        conversation_id: conversationId,
        sender_id: senderId,
        type: input.type,
        body: input.body,
        media_key: input.mediaKey,
        duration_sec: input.durationSec,
        lat: input.lat,
        lng: input.lng,
        reply_to: input.replyTo ?? null,
        replyToMessage: input.replyToMessage ?? null,
        is_deleted: false,
        created_at: new Date().toISOString(),
      };

      const tempId = optimisticMsg.id;

      queryClient.setQueryData<DirectMessage[]>(
        dmKeys.messages(conversationId),
        (old = []) => [...old, optimisticMsg]
      );

      return { previous, tempId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dmKeys.messages(conversationId), context.previous);
      }
    },
    onSuccess: (savedMsg, _vars, context) => {
      queryClient.setQueryData<DirectMessage[]>(
        dmKeys.messages(conversationId),
        (old = []) => {
          const withoutTemp = old.filter((m) => m.id !== context?.tempId);
          const exists = withoutTemp.some((m) => m.id === savedMsg.id);
          if (exists) {
            // Realtime önce geldiyse onu koru ama önizlemeyi tamamla
            return withoutTemp.map((m) =>
              m.id === savedMsg.id ? { ...m, replyToMessage: savedMsg.replyToMessage ?? m.replyToMessage } : m
            );
          }
          return old.map((m) =>
            m.id === context?.tempId
              ? { ...savedMsg, replyToMessage: savedMsg.replyToMessage ?? m.replyToMessage }
              : m
          );
        }
      );
      // Konuşmalar listesinde bu konuşmanın son mesajını anında güncelle (mükerrer fetch tetiklemez)
      queryClient.setQueriesData<Conversation[]>(
        { queryKey: ['direct_messages', 'conversations'] },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((c) =>
            c.id === conversationId
              ? {
                ...c,
                last_message_at: savedMsg.created_at,
                lastMessageSnippet: savedMsg.body || (savedMsg.type === 'image' ? '📷 Fotoğraf' : savedMsg.type === 'audio' ? '🎤 Ses' : '📍 Konum'),
              }
              : c
          );
        }
      );
    },
  });
};

export const useDeleteDirectMessage = (conversationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => deleteDirectMessage(messageId),
    onMutate: async (messageId: string) => {
      await queryClient.cancelQueries({ queryKey: dmKeys.messages(conversationId) });
      const previous = queryClient.getQueryData<DirectMessage[]>(dmKeys.messages(conversationId));

      queryClient.setQueryData<DirectMessage[]>(
        dmKeys.messages(conversationId),
        (old = []) => old.filter((m) => m.id !== messageId)
      );

      return { previous };
    },
    onError: (_err, _messageId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dmKeys.messages(conversationId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dmKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: dmKeys.conversations() });
    },
  });
};

export const useClearConversation = (conversationId: string, currentUserId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearConversation(conversationId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: dmKeys.messages(conversationId) });
      const previous = queryClient.getQueryData<DirectMessage[]>(dmKeys.messages(conversationId));
      queryClient.setQueryData<DirectMessage[]>(dmKeys.messages(conversationId), []);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dmKeys.messages(conversationId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dmKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: dmKeys.conversation(conversationId) });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: dmKeys.conversations(currentUserId) });
      }
    },
  });
};

export const useDeleteConversation = (currentUserId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => deleteConversation(conversationId),
    onMutate: async (conversationId: string) => {
      if (currentUserId) {
        await queryClient.cancelQueries({ queryKey: dmKeys.conversations(currentUserId) });
        const prevConversations = queryClient.getQueryData<Conversation[]>(dmKeys.conversations(currentUserId));
        queryClient.setQueryData<Conversation[]>(
          dmKeys.conversations(currentUserId),
          (old = []) => old.filter((c) => c.id !== conversationId)
        );
        return { prevConversations };
      }
      return {};
    },
    onError: (_err, _conversationId, context) => {
      if (currentUserId && context?.prevConversations) {
        queryClient.setQueryData(dmKeys.conversations(currentUserId), context.prevConversations);
      }
    },
    onSettled: (_data, _err, conversationId) => {
      queryClient.removeQueries({ queryKey: dmKeys.messages(conversationId) });
      queryClient.removeQueries({ queryKey: dmKeys.conversation(conversationId) });
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: dmKeys.conversations(currentUserId) });
      }
    },
  });
};
