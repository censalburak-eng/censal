import { supabase } from '../lib/supabase';
import { RoomMessage, SendMessageInput, PinnedListing, UpdateMessageInput } from '../types/messages.types';
import { mapDatabaseError, AppError } from '../lib/errors';
import { logger } from '../lib/logger';

const log = logger.scope('messagesApi');

// DB'de silinmiş veya bulunamayan reply_to ID'lerini hafızada tutarak mükerrer boş sorguları engelle (MADDE 3)
const deletedReplyIdsCache = new Set<string>();

export const fetchRoomMessages = async (
  roomId: number,
  limit = 50,
  beforeCreatedAt?: string
): Promise<readonly RoomMessage[]> => {
  log.debug(`roomId=${roomId} limit=${limit} before=${beforeCreatedAt} fetching...`);

  let query = supabase
    .from('messages')
    .select(`
      id,
      city_id,
      user_id,
      type,
      body,
      media_key,
      caption,
      lat,
      lng,
      reply_to,
      duration_sec,
      is_edited,
      created_at,
      profiles:user_id (
        first_name,
        last_name,
        avatar_url,
        hide_phone
      )
    `)
    .eq('city_id', roomId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (beforeCreatedAt) {
    query = query.lt('created_at', beforeCreatedAt);
  }

  const { data, error } = await query;

  if (error) {
    log.error(`HATA roomId=${roomId}:`, error.message, error.code, error.details);
    throw mapDatabaseError(error);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Hızlı harita oluştur
  const mapById = new Map<string, any>();
  data.forEach((item: any) => mapById.set(String(item.id), item));

  // MADDE 3: Sadece daha önce sorgulanmamış ve silinmemiş reply_to ID'lerini filtrele
  const missingReplyIds = data
    .map((item: any) => item.reply_to)
    .filter((id: any) => id && !mapById.has(String(id)) && !deletedReplyIdsCache.has(String(id)));

  if (missingReplyIds.length > 0) {
    try {
      const { data: missingParents } = await supabase
        .from('messages')
        .select(`
          id,
          user_id,
          type,
          body,
          caption,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .in('id', missingReplyIds);

      const foundIds = new Set<string>();
      if (missingParents) {
        missingParents.forEach((p: any) => {
          mapById.set(String(p.id), p);
          foundIds.add(String(p.id));
        });
      }

      // Bulunamayan / silinmiş olanları cache'le ki tekrar boş sorgu gitmesin (#25, #28...)
      for (const reqId of missingReplyIds) {
        if (!foundIds.has(String(reqId))) {
          deletedReplyIdsCache.add(String(reqId));
        }
      }
    } catch (e) {
      log.warn('Eksik yanıt mesajları çekilemedi:', e);
    }
  }

  const mapped = data.map((item: any) => {
    const profile = item.profiles ?? item.public_profiles;
    const userName = profile
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Kullanıcı'
      : 'Kullanıcı';

    let replyToMessage: { userName: string; body: string } | null = null;
    if (item.reply_to && mapById.has(String(item.reply_to))) {
      const parent = mapById.get(String(item.reply_to));
      const parentProfile = parent.profiles ?? parent.public_profiles;
      const parentUserName = parentProfile
        ? `${parentProfile.first_name ?? ''} ${parentProfile.last_name ?? ''}`.trim() || 'Kullanıcı'
        : 'Kullanıcı';

      let parentSnippet = parent.body;
      if (parent.type === 'image') parentSnippet = parent.caption ? `📷 ${parent.caption}` : '📷 Fotoğraf';
      else if (parent.type === 'audio') parentSnippet = '🎤 Sesli mesaj';
      else if (parent.type === 'location') parentSnippet = '📍 Konum';

      replyToMessage = {
        userName: parentUserName,
        body: parentSnippet || '',
      };
    } else if (item.reply_to && deletedReplyIdsCache.has(String(item.reply_to))) {
      replyToMessage = {
        userName: 'Silinmiş Mesaj',
        body: 'Bu mesaj silinmiş',
      };
    }

    return {
      id: String(item.id),
      roomId: item.city_id,
      userId: item.user_id,
      userName,
      userAvatarUrl: profile?.avatar_url ?? null,
      isUserPhoneHidden: profile?.hide_phone ?? true,
      type: item.type ?? 'text',
      body: item.body,
      mediaPath: item.media_key,
      caption: item.caption,
      lat: item.lat,
      lng: item.lng,
      replyToId: item.reply_to,
      replyToMessage,
      durationSec: item.duration_sec,
      isEdited: item.is_edited ?? false,
      createdAt: item.created_at,
    };
  });

  // En yeni 50 mesajı çektik, ekranda normal WhatsApp akışı (eski -> yeni) için kronolojik sıraya çeviriyoruz
  return mapped.slice().reverse();
};

export const fetchPinnedListings = async (
  roomId: number
): Promise<readonly PinnedListing[]> => {
  log.debug(`fetchPinnedListings roomId=${roomId}`);

  const { data, error } = await supabase
    .from('pinned_listings')
    .select(`
      id,
      city_id,
      message_id,
      user_id,
      starts_at,
      expires_at,
      messages (
        body,
        user_id,
        type,
        media_key,
        caption,
        lat,
        lng,
        duration_sec
      ),
      profiles:user_id (
        first_name,
        last_name,
        avatar_url,
        hide_phone
      )
    `)
    .eq('city_id', roomId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('starts_at', { ascending: false });

  if (error) {
    log.error(`HATA roomId=${roomId}:`, error.message, error.code, error.details);
    throw mapDatabaseError(error);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((item: any) => {
    const profile = item.profiles ?? item.public_profiles;
    const userName = profile
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'İlan Sahibi'
      : 'İlan Sahibi';

    return {
      id: String(item.id),
      roomId: item.city_id,
      messageId: String(item.message_id),
      userId: item.user_id,
      userName,
      userPhone: undefined,
      isPhoneHidden: profile?.hide_phone ?? true,
      avatarUrl: profile?.avatar_url ?? null,
      body: item.messages?.body ?? 'Sabit Şehir İlanı',
      type: item.messages?.type ?? 'text',
      mediaPath: item.messages?.media_key ?? null,
      caption: item.messages?.caption ?? null,
      lat: item.messages?.lat ?? null,
      lng: item.messages?.lng ?? null,
      durationSec: item.messages?.duration_sec ?? null,
      startsAt: item.starts_at,
      expiresAt: item.expires_at,
    };
  });
};

export const fetchCallablePhone = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase.rpc('get_callable_phone', { p_user_id: userId });
  if (error) throw mapDatabaseError(error);
  return (data as string | null) ?? null;
};

export const sendMessage = async (
  userId: string,
  userName: string,
  input: SendMessageInput,
  userAvatarUrl?: string | null
): Promise<RoomMessage> => {
  log.debug(`sendMessage roomId=${input.roomId} userId=${userId} type=${input.type}`);

  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        city_id: input.roomId,
        user_id: userId,
        type: input.type,
        body: input.body,
        media_key: input.mediaPath,
        caption: input.caption ?? null,
        lat: input.lat,
        lng: input.lng,
        reply_to: input.replyToId,
        duration_sec: input.durationSec ?? null,
      },
    ])
    .select('id, created_at')
    .single();

  if (error) {
    log.error('sendMessage HATA:', error.message, error.code, error.details);

    if (error.message?.includes('Çok hızlı')) {
      throw new AppError('RATE_LIMITED', 'Çok hızlı mesaj gönderiyorsunuz (3 saniye bekleme süresi).', error);
    }
    if (error.message?.includes('engellenmiştir')) {
      throw new AppError('ACCOUNT_BANNED', 'Hesabınız engellenmiştir.', error);
    }
    if (error.code === '42501') {
      throw new AppError('UNAUTHORIZED', 'Mesaj göndermek için giriş yapmanız gerekiyor.', error);
    }

    throw mapDatabaseError(error);
  }

  return {
    id: String(data.id),
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
    replyToMessage: input.replyToMessage ?? null,
    durationSec: input.durationSec,
    createdAt: data.created_at ?? new Date().toISOString(),
  };
};

/**
 * Mesajı herkesten siler (Delete for everyone via RPC delete_room_message)
 */
export const deleteRoomMessage = async (messageId: string): Promise<void> => {
  log.debug(`deleteRoomMessage messageId=${messageId}`);
  const { error } = await supabase.rpc('delete_room_message', {
    p_message_id: messageId,
  });

  if (error) {
    log.error('deleteRoomMessage HATA:', error.message, error.code);
    throw mapDatabaseError(error);
  }
};

/**
 * Mesajı günceller: soft-delete veya metin/caption düzenleme
 */
export const updateMessage = async (
  input: UpdateMessageInput
): Promise<void> => {
  log.debug(`updateMessage messageId=${input.messageId}`);

  const patch: Record<string, unknown> = {};

  if (input.isDeleted !== undefined) {
    patch.is_deleted = input.isDeleted;
  }
  if (input.body !== undefined) {
    patch.body = input.body;
    patch.is_edited = true;
    patch.edited_at = new Date().toISOString();
  }
  if (input.caption !== undefined) {
    patch.caption = input.caption;
    patch.is_edited = true;
    patch.edited_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('messages')
    .update(patch)
    .eq('id', input.messageId);

  if (error) {
    log.error('updateMessage HATA:', error.message, error.code);
    throw mapDatabaseError(error);
  }
};

// Güvenli sabitleme: RPC reserve_pin çağrılır
export const reservePinListing = async (
  messageId: string,
  roomId: number
): Promise<{ pin_id: string; starts_at: string; expires_at: string; status: string }> => {
  log.debug(`reservePinListing messageId=${messageId} roomId=${roomId}`);

  const { data, error } = await supabase.rpc('reserve_pin', {
    p_message_id: messageId,
    p_city_id: roomId,
  });

  if (error) {
    log.error('reservePinListing HATA:', error.message, error.code, error.details);

    if (error.message?.includes('PIN_QUOTA_FULL')) {
      throw new AppError('PIN_QUOTA_FULL', 'Bu odanın bugünkü sabit ilan kontenjanı dolmuştur.', error);
    }
    if (error.message?.includes('NOT_OWNER')) {
      throw new AppError('PIN_NOT_OWNER', 'Sadece kendi mesajınızı sabitleyebilirsiniz.', error);
    }
    if (error.message?.includes('ALREADY_PINNED')) {
      throw new AppError('PIN_ALREADY_PINNED', 'Bu mesaj zaten sabitlenmiş. Önce mevcut sabitlemeyi kaldırın.', error);
    }
    throw mapDatabaseError(error);
  }

  return (data as { pin_id: string; starts_at: string; expires_at: string; status: string }) ?? {
    pin_id: '',
    starts_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    status: 'active',
  };
};
