import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  fetchRoomMessages,
  fetchPinnedListings,
  sendMessage,
  reservePinListing,
  updateMessage,
  deleteRoomMessage,
} from '../api/messagesApi';
import { RoomMessage, SendMessageInput, UpdateMessageInput, PinnedListing } from '../types/messages.types';
import { logger } from '../lib/logger';

const log = logger.scope('useMessages');

const authorProfileCache = new Map<string, { authorName: string; authorAvatar: string | null; isPhoneHidden: boolean }>();

export const messageKeys = {
  all: ['messages'] as const,
  room: (roomId: number) => [...messageKeys.all, 'room', roomId] as const,
  pinned: (roomId: number) => [...messageKeys.all, 'pinned', roomId] as const,
};

export const useRoomMessages = (roomId: number) => {
  const queryClient = useQueryClient();
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const query = useQuery({
    queryKey: messageKeys.room(roomId),
    queryFn: () => fetchRoomMessages(roomId, 50),
    staleTime: 5_000,
    gcTime: 5 * 60_000,
    refetchOnMount: true,
    placeholderData: (prev) => prev,
  });

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const current = queryClient.getQueryData<readonly RoomMessage[]>(messageKeys.room(roomId)) ?? [];
    if (current.length === 0) return;
    // Normal listede index 0 en eski mesajdır
    const oldest = current[0];
    if (!oldest?.createdAt) return;

    try {
      setIsLoadingMore(true);
      const older = await fetchRoomMessages(roomId, 50, oldest.createdAt);
      if (older.length < 50) setHasMore(false);
      if (older.length > 0) {
        queryClient.setQueryData<RoomMessage[]>(
          messageKeys.room(roomId),
          (old = []) => {
            const existingIds = new Set(old.map((m) => m.id));
            const fresh = older.filter((m) => !existingIds.has(m.id));
            // Daha eski mesajlar listenin başına eklenir
            return [...fresh, ...old];
          }
        );
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [roomId, queryClient, isLoadingMore, hasMore]);

  // Supabase Realtime — sadece aktif odanın kanalını dinle (PERFORMANCE_MOBILE 4.4 & RULES 4.2)
  useEffect(() => {
    if (!roomId) return;

    const channelId = `room_messages_${roomId}_${Math.random().toString(36).substring(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `city_id=eq.${roomId}`,
        },
        async (payload) => {
          log.debug(`[Realtime] Yeni mesaj geldi, roomId=${roomId}:`, payload.new);
          const newMsg = payload.new as any;
          if (newMsg.is_deleted) return;

          // Mesaj sahibinin profil adını, avatarını ve telefon gizlilik durumunu çek
          let authorName = 'Hemşehri';
          let isPhoneHidden = true;
          let authorAvatar: string | null = null;

          const cached = authorProfileCache.get(newMsg.user_id);
          if (cached) {
            authorName = cached.authorName;
            isPhoneHidden = cached.isPhoneHidden;
            authorAvatar = cached.authorAvatar;
          } else {
            try {
              const { data: prof } = await supabase
                .from('profiles')
                .select('first_name, last_name, avatar_url, hide_phone')
                .eq('id', newMsg.user_id)
                .maybeSingle();
              if (prof?.first_name) {
                authorName = `${prof.first_name} ${prof.last_name ?? ''}`.trim() || 'Hemşehri';
              }
              if (prof?.avatar_url) {
                authorAvatar = prof.avatar_url;
              }
              if (prof && typeof prof.hide_phone === 'boolean') {
                isPhoneHidden = prof.hide_phone;
              }
              authorProfileCache.set(newMsg.user_id, { authorName, authorAvatar, isPhoneHidden });
            } catch {
              // fallback 'Hemşehri'
            }
          }

          let replyToMessage: { userName: string; body: string } | null = null;
          if (newMsg.reply_to) {
            const currentList = queryClient.getQueryData<RoomMessage[]>(messageKeys.room(roomId)) ?? [];
            const parent = currentList.find((m) => m.id === String(newMsg.reply_to));
            if (parent) {
              replyToMessage = {
                userName: parent.userName,
                body: parent.body || (parent.type === 'image' ? '📷 Fotoğraf' : parent.type === 'audio' ? '🎤 Ses' : '📍 Konum'),
              };
            } else {
              try {
                const { data: parentRow } = await supabase
                  .from('messages')
                  .select('id, body, type, user_id, profiles:user_id(first_name, last_name)')
                  .eq('id', newMsg.reply_to)
                  .maybeSingle();
                if (parentRow) {
                  const pProf = (parentRow as any).profiles;
                  const pName = pProf ? `${pProf.first_name ?? ''} ${pProf.last_name ?? ''}`.trim() || 'Hemşehri' : 'Hemşehri';
                  let pSnippet = parentRow.body;
                  if (parentRow.type === 'image') pSnippet = '📷 Fotoğraf';
                  else if (parentRow.type === 'audio') pSnippet = '🎤 Ses';
                  else if (parentRow.type === 'location') pSnippet = '📍 Konum';
                  replyToMessage = { userName: pName, body: pSnippet || '' };
                }
              } catch {}
            }
          }

          queryClient.setQueryData<RoomMessage[]>(
            messageKeys.room(roomId),
            (old = []) => {
              if (old.some((m) => m.id === String(newMsg.id))) {
                return old;
              }

              // Kendi optimistic mesajımız ise id'sini güncelle ve replyToMessage'ı koru
              const tempMatch = old.find(
                (m) => m.id.startsWith('temp_') && m.userId === newMsg.user_id && m.body === newMsg.body
              );
              if (tempMatch) {
                return old.map((m) =>
                  m.id === tempMatch.id
                    ? {
                        ...m,
                        id: String(newMsg.id),
                        createdAt: newMsg.created_at,
                        replyToMessage: m.replyToMessage ?? replyToMessage,
                      }
                    : m
                );
              }

              const formatted: RoomMessage = {
                id: String(newMsg.id),
                roomId: newMsg.city_id,
                userId: newMsg.user_id,
                userName: authorName,
                userAvatarUrl: authorAvatar,
                isUserPhoneHidden: isPhoneHidden,
                type: newMsg.type ?? 'text',
                body: newMsg.body,
                mediaPath: newMsg.media_key,
                caption: newMsg.caption,
                lat: newMsg.lat,
                lng: newMsg.lng,
                replyToId: newMsg.reply_to,
                replyToMessage,
                durationSec: newMsg.duration_sec,
                isEdited: newMsg.is_edited ?? false,
                createdAt: newMsg.created_at,
              };
              // Normal listede yeni mesaj listenin sonuna (en alta) eklenir
              return [...old, formatted];
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `city_id=eq.${roomId}`,
        },
        (payload) => {
          log.debug(`[Realtime] Mesaj güncellendi, roomId=${roomId}:`, payload.new);
          const updatedMsg = payload.new as any;
          queryClient.setQueryData<RoomMessage[]>(
            messageKeys.room(roomId),
            (old = []) => {
              if (updatedMsg.is_deleted) {
                return old.filter((m) => m.id !== String(updatedMsg.id));
              }
              return old.map((m) =>
                m.id === String(updatedMsg.id)
                  ? {
                    ...m,
                    body: updatedMsg.body,
                    caption: updatedMsg.caption,
                    isEdited: updatedMsg.is_edited ?? m.isEdited,
                  }
                  : m
              );
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `city_id=eq.${roomId}`,
        },
        (payload) => {
          log.debug(`[Realtime] Mesaj silindi (DELETE), roomId=${roomId}:`, payload.old);
          const deletedId = String((payload.old as any)?.id);
          queryClient.setQueryData<RoomMessage[]>(
            messageKeys.room(roomId),
            (old = []) => old.filter((m) => m.id !== deletedId)
          );
        }
      )
      .subscribe((status, err) => {
        log.info(`[Realtime] room_messages_${roomId} durumu: ${status}`);
        if (err) log.error(`[Realtime] Abone HATASI:`, err.message);
      });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: messageKeys.room(roomId) });
      }
    });

    return () => {
      appStateSub.remove();
      log.debug(`Kanal kaldırılıyor: ${channelId}`);
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  return { ...query, loadMore, hasMore, isLoadingMore };
};

export const usePinnedListings = (roomId: number) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: messageKeys.pinned(roomId),
    queryFn: () => fetchPinnedListings(roomId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
  });

  // pinned_listings tablosu için anlık Realtime dinleyici
  useEffect(() => {
    if (!roomId) return;

    const channelId = `pinned_listings_${roomId}_${Math.random().toString(36).substring(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_listings',
          filter: `city_id=eq.${roomId}`,
        },
        (payload) => {
          log.debug(`[Realtime] Sabit ilanlar değişti, roomId=${roomId}:`, payload.eventType);
          if (payload.eventType === 'INSERT') {
            const newPinId = String((payload.new as any)?.id);
            const current = queryClient.getQueryData<PinnedListing[]>(messageKeys.pinned(roomId)) ?? [];
            if (current.some((p) => p.id === newPinId)) {
              return; // Kendimiz mutation onSuccess'te ekledik, mükerrer refetch yapma
            }
          }
          queryClient.invalidateQueries({ queryKey: messageKeys.pinned(roomId) });
        }
      )
      .subscribe((status) => {
        log.info(`[Realtime] pinned_listings_${roomId} durumu: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  return query;
};

export const useSendMessage = (roomId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      userName,
      userAvatarUrl,
      input,
    }: {
      userId: string;
      userName: string;
      userAvatarUrl?: string | null;
      input: SendMessageInput;
    }) => sendMessage(userId, userName, input, userAvatarUrl),
    // Optimistic Update
    onMutate: async ({ userId, userName, userAvatarUrl, input }) => {
      await queryClient.cancelQueries({ queryKey: messageKeys.room(roomId) });

      const previousMessages = queryClient.getQueryData<RoomMessage[]>(
        messageKeys.room(roomId)
      );

      let replyToMessage: { userName: string; body: string } | null = input.replyToMessage ?? null;
      if (!replyToMessage && input.replyToId && previousMessages) {
        const parent = previousMessages.find((m) => m.id === input.replyToId);
        if (parent) {
          replyToMessage = {
            userName: parent.userName,
            body: parent.body || (parent.type === 'image' ? '📷 Fotoğraf' : parent.type === 'audio' ? '🎤 Ses' : '📍 Konum'),
          };
        }
      }

      input.replyToMessage = replyToMessage;

      const tempId = `temp_${Date.now()}`;
      const optimisticMessage: RoomMessage = {
        id: tempId,
        roomId: input.roomId,
        userId,
        userName,
        userAvatarUrl: userAvatarUrl ?? null,
        isUserPhoneHidden: false,
        type: input.type,
        body: input.body,
        mediaPath: input.mediaPath,
        caption: input.caption,
        lat: input.lat,
        lng: input.lng,
        replyToId: input.replyToId,
        replyToMessage,
        durationSec: input.durationSec,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<RoomMessage[]>(
        messageKeys.room(roomId),
        (old = []) => [...old, optimisticMessage]
      );

      return { previousMessages, tempId };
    },
    onError: (err, _, context) => {
      log.error('[useSendMessage] HATA, rollback yapılıyor:', err);
      if (context?.previousMessages) {
        queryClient.setQueryData(messageKeys.room(roomId), context.previousMessages);
      }
    },
    onSuccess: (savedMessage, { input }, context) => {
      queryClient.setQueryData<RoomMessage[]>(
        messageKeys.room(roomId),
        (old = []) => {
          const existingTemp = old.find((m) => m.id === context?.tempId);
          const replyToMessage = savedMessage.replyToMessage ?? existingTemp?.replyToMessage ?? input.replyToMessage ?? null;
          const merged: RoomMessage = {
            ...savedMessage,
            replyToMessage,
          };
          const hasTemp = old.some((m) => m.id === context?.tempId);
          const base = old.filter((m) => m.id !== savedMessage.id); // realtime çift eklemişse temizle
          return hasTemp
            ? base.map((m) => (m.id === context?.tempId ? merged : m))
            : [...base, merged];
        }
      );
    },
  });
};

export const usePinMessage = (roomId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ message }: { message: RoomMessage }) =>
      reservePinListing(message.id, roomId),
    onSuccess: (data, { message }) => {
      const newPinned: PinnedListing = {
        id: String(data.pin_id),
        roomId,
        messageId: message.id,
        userId: message.userId,
        userName: message.userName,
        userPhone: undefined,
        isPhoneHidden: message.isUserPhoneHidden,
        avatarUrl: null,
        body: message.body,
        type: message.type,
        mediaPath: message.mediaPath,
        caption: message.caption,
        startsAt: data.starts_at,
        expiresAt: data.expires_at,
      };

      queryClient.setQueryData<PinnedListing[]>(
        messageKeys.pinned(roomId),
        (old = []) => {
          if (old.some((p) => p.id === newPinned.id || p.messageId === message.id)) {
            return old;
          }
          return [newPinned, ...old];
        }
      );
    },
  });
};

export const useDeleteMessage = (roomId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => deleteRoomMessage(messageId),
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: messageKeys.room(roomId) });
      const previous = queryClient.getQueryData<RoomMessage[]>(messageKeys.room(roomId));
      queryClient.setQueryData<RoomMessage[]>(
        messageKeys.room(roomId),
        (old = []) => old.filter((m) => m.id !== messageId)
      );
      return { previous };
    },
    onError: (_err, _msgId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(messageKeys.room(roomId), context.previous);
      }
    },
  });
};

export const useEditMessage = (roomId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMessageInput) => updateMessage(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: messageKeys.room(roomId) });
      const previous = queryClient.getQueryData<RoomMessage[]>(messageKeys.room(roomId));
      queryClient.setQueryData<RoomMessage[]>(
        messageKeys.room(roomId),
        (old = []) =>
          old.map((m) =>
            m.id === input.messageId
              ? {
                ...m,
                body: input.body ?? m.body,
                caption: input.caption ?? m.caption,
                isEdited: true,
              }
              : m
          )
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(messageKeys.room(roomId), context.previous);
      }
    },
  });
};
