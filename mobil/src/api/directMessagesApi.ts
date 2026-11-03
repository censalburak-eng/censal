import { supabase } from '../lib/supabase';
import {
  Conversation,
  DirectMessage,
  SendDirectMessageInput,
  BlockedUser,
} from '../types/directMessages.types';
import { mapDatabaseError, AppError } from '../lib/errors';
import { CITIES_DATA } from '../data/cities';
import { logger } from '../lib/logger';

const log = logger.scope('directMessagesApi');

// 1. ENGELLEME İŞLEMLERİ
export const blockUser = async (blockedId: string): Promise<void> => {
  log.debug('blockUser blockedId:', blockedId);
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) {
    throw new Error('Kullanıcı oturumu bulunamadı.');
  }

  const { error } = await supabase
    .from('blocked_users')
    .insert([{ blocker_id: user.id, blocked_id: blockedId }]);

  if (error) {
    log.error('blockUser HATA:', error.message, error.code, error.details);
    throw mapDatabaseError(error);
  }
};

export const unblockUser = async (blockedId: string): Promise<void> => {
  log.debug('unblockUser blockedId:', blockedId);
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) {
    throw new Error('Kullanıcı oturumu bulunamadı.');
  }

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocked_id', blockedId)
    .eq('blocker_id', user.id);

  if (error) {
    log.error('unblockUser HATA:', error.message, error.code, error.details);
    throw mapDatabaseError(error);
  }
};

export const fetchBlockedUsers = async (): Promise<readonly BlockedUser[]> => {
  log.debug('fetchBlockedUsers');
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('blocked_users')
    .select(`
      blocker_id,
      blocked_id,
      created_at,
      profiles:blocked_id (
        first_name,
        last_name,
        avatar_url,
        city_id
      )
    `)
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('fetchBlockedUsers HATA:', error.message, error.code, error.details);
    throw mapDatabaseError(error);
  }

  return (data ?? []).map((item: any) => {
    const prof = item.profiles ?? item.public_profiles;
    const cityId = prof?.city_id;
    const plateCode = CITIES_DATA.find((c) => c.id === cityId)?.plateCode ?? '34';
    return {
      blocker_id: item.blocker_id,
      blocked_id: item.blocked_id,
      created_at: item.created_at,
      first_name: prof?.first_name ?? 'Kullanıcı',
      last_name: prof?.last_name ?? '',
      avatar_url: prof?.avatar_url,
      city_id: cityId,
      plate_code: plateCode,
    };
  });
};

// 2. KONUŞMALAR (CONVERSATIONS)
export const getOrCreateConversation = async (
  otherUserId: string
): Promise<string> => {
  log.debug('getOrCreateConversation otherUserId:', otherUserId);
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_other: otherUserId,
  });

  if (error) {
    log.error('getOrCreateConversation HATA:', error.message, error.code, error.details);
    if (error.message?.includes('BLOCKED')) {
      throw new AppError('DM_BLOCKED', 'Bu kullanıcıyla engelleme nedeniyle mesajlaşamazsınız.', error);
    }
    throw mapDatabaseError(error);
  }

  return data as string;
};

// Profil önbelleği (5 dakika geçerli) - mükerrer profil sorgularını keser
const profileCache = new Map<string, { data: any; expiresAt: number }>();

const getCachedProfiles = async (userIds: string[]): Promise<Map<string, any>> => {
  const result = new Map<string, any>();
  const now = Date.now();
  const missingIds: string[] = [];

  for (const id of userIds) {
    const cached = profileCache.get(id);
    if (cached && cached.expiresAt > now) {
      result.set(id, cached.data);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length > 0) {
    const { data: freshProfiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, city_id, hide_phone, last_seen_at')
      .in('id', missingIds);

    if (freshProfiles) {
      freshProfiles.forEach((p: any) => {
        profileCache.set(p.id, { data: p, expiresAt: now + 5 * 60_000 });
        result.set(p.id, p);
      });
    }
  }

  return result;
};

let inflightConversations: Promise<readonly Conversation[]> | null = null;
let inflightUserId: string | null = null;

export const fetchConversations = (
  currentUserId: string
): Promise<readonly Conversation[]> => {
  if (inflightConversations && inflightUserId === currentUserId) {
    return inflightConversations;
  }

  inflightUserId = currentUserId;
  inflightConversations = _doFetchConversations(currentUserId).finally(() => {
    inflightConversations = null;
    inflightUserId = null;
  });

  return inflightConversations;
};

const _doFetchConversations = async (
  currentUserId: string
): Promise<readonly Conversation[]> => {
  log.debug('fetchConversations currentUserId:', currentUserId);
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      user_a,
      user_b,
      last_message_at,
      created_at,
      user_a_cleared_at,
      user_b_cleared_at
    `)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (error) {
    log.error('fetchConversations HATA:', error.message, error.code, error.details);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Karşı tarafların profillerini ve son mesajları paralel çek
  const otherUserIds = Array.from(new Set(data.map((c: any) =>
    c.user_a === currentUserId ? c.user_b : c.user_a
  ).filter(Boolean)));

  const conversationIds = data.map((c: any) => c.id);

  let lastMessageMap = new Map<string, { body: string; unread: number; created_at: string }>();

  const [profilesMap, dmsRes] = await Promise.all([
    otherUserIds.length > 0 ? getCachedProfiles(otherUserIds) : Promise.resolve(new Map<string, any>()),
    conversationIds.length > 0
      ? supabase
        .from('direct_messages')
        .select('conversation_id, body, sender_id, read_at, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(100)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  if (dmsRes.data) {
    dmsRes.data.forEach((msg: any) => {
      const existing = lastMessageMap.get(msg.conversation_id);
      if (!existing) {
        lastMessageMap.set(msg.conversation_id, {
          body: msg.body,
          unread: msg.sender_id !== currentUserId && !msg.read_at ? 1 : 0,
          created_at: msg.created_at,
        });
      } else if (msg.sender_id !== currentUserId && !msg.read_at) {
        existing.unread += 1;
      }
    });
  }

  return data.map((c: any) => {
    const otherId = c.user_a === currentUserId ? c.user_b : c.user_a;
    const profile = profilesMap.get(otherId);
    const myClearedAt = c.user_a === currentUserId ? c.user_a_cleared_at : c.user_b_cleared_at;
    const lastMsgInfo = lastMessageMap.get(c.id);
    const hasCleared = myClearedAt && (!lastMsgInfo?.created_at || new Date(lastMsgInfo.created_at).getTime() <= new Date(myClearedAt).getTime());
    const cityId = profile?.city_id;
    const plateCode = CITIES_DATA.find((item) => item.id === cityId)?.plateCode ?? '34';

    return {
      id: c.id,
      user_a: c.user_a,
      user_b: c.user_b,
      last_message_at: c.last_message_at,
      created_at: c.created_at,
      user_a_cleared_at: c.user_a_cleared_at,
      user_b_cleared_at: c.user_b_cleared_at,
      lastMessageSnippet: hasCleared ? undefined : lastMsgInfo?.body,
      unreadCount: hasCleared ? 0 : (lastMsgInfo?.unread ?? 0),
      otherUser: profile
        ? {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
          city_id: profile.city_id,
          hide_phone: profile.hide_phone,
          plate_code: plateCode,
          last_seen_at: profile.last_seen_at,
        }
        : undefined,
    };
  });
};

export const fetchConversationById = async (
  conversationId: string,
  currentUserId: string
): Promise<Conversation | null> => {
  log.debug(`fetchConversationById conversationId=${conversationId}`);
  const { data, error } = await supabase
    .from('conversations')
    .select('id, user_a, user_b, last_message_at, created_at, user_a_cleared_at, user_b_cleared_at')
    .eq('id', conversationId)
    .maybeSingle();

  if (error || !data) return null;

  const otherId = data.user_a === currentUserId ? data.user_b : data.user_a;
  if (!otherId) return null;

  const cachedProfiles = await getCachedProfiles([otherId]);
  const profile = cachedProfiles.get(otherId);

  const cityId = profile?.city_id;
  const plateCode = CITIES_DATA.find((item) => item.id === cityId)?.plateCode ?? '34';

  return {
    id: data.id,
    user_a: data.user_a,
    user_b: data.user_b,
    last_message_at: data.last_message_at,
    created_at: data.created_at,
    otherUser: profile
      ? {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
        city_id: profile.city_id,
        hide_phone: profile.hide_phone,
        plate_code: plateCode,
        last_seen_at: profile.last_seen_at,
      }
      : undefined,
  };
};

// 3. DOĞRUDAN MESAJLAR (DIRECT MESSAGES)
export const fetchDirectMessages = async (
  conversationId: string,
  currentUserId?: string,
  limit = 50,
  beforeCreatedAt?: string
): Promise<readonly DirectMessage[]> => {
  log.debug(`fetchDirectMessages conversationId=${conversationId} limit=${limit} before=${beforeCreatedAt}`);

  let clearedAt: string | null = null;
  if (currentUserId) {
    const { data: conv } = await supabase
      .from('conversations')
      .select('user_a, user_b, user_a_cleared_at, user_b_cleared_at')
      .eq('id', conversationId)
      .maybeSingle();

    if (conv) {
      clearedAt = conv.user_a === currentUserId ? conv.user_a_cleared_at : conv.user_b_cleared_at;
    }
  }

  let query = supabase
    .from('direct_messages')
    .select('id, conversation_id, sender_id, type, body, media_key, duration_sec, lat, lng, read_at, is_deleted, created_at, reply_to')
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (clearedAt) {
    query = query.gt('created_at', clearedAt);
  }

  if (beforeCreatedAt) {
    query = query.lt('created_at', beforeCreatedAt);
  }

  const { data, error } = await query;

  if (error) {
    log.error('fetchDirectMessages HATA:', error.message, error.code, error.details);
    return [];
  }

  const rawList = data ?? [];
  const mapById = new Map<string, any>();
  rawList.forEach((m: any) => mapById.set(String(m.id), m));

  const missingReplyIds = Array.from(
    new Set(
      rawList
        .map((m: any) => m.reply_to)
        .filter((id: any) => id && !mapById.has(String(id)))
    )
  );

  if (missingReplyIds.length > 0) {
    try {
      const { data: missingParents } = await supabase
        .from('direct_messages')
        .select('id, body, type, sender_id')
        .in('id', missingReplyIds);

      if (missingParents) {
        missingParents.forEach((p: any) => mapById.set(String(p.id), p));
      }
    } catch (e) {
      log.warn('Eksik yanıt mesajları çekilemedi:', e);
    }
  }

  const mapped = rawList.map((item: any) => {
    let replyToMessage: { id: string; userName: string; body: string } | null = null;
    if (item.reply_to && mapById.has(String(item.reply_to))) {
      const parent = mapById.get(String(item.reply_to));
      const isParentMe = currentUserId ? parent.sender_id === currentUserId : false;
      const parentUserName = isParentMe ? 'Sen' : 'İleti';

      let parentSnippet = parent.body;
      if (parent.type === 'image') parentSnippet = '📷 Fotoğraf';
      else if (parent.type === 'audio') parentSnippet = '🎤 Ses';
      else if (parent.type === 'location') parentSnippet = '📍 Konum';

      replyToMessage = {
        id: String(parent.id),
        userName: parentUserName,
        body: parentSnippet || '',
      };
    }

    return {
      id: String(item.id),
      conversation_id: item.conversation_id,
      sender_id: item.sender_id,
      type: item.type,
      body: item.body ?? '',
      media_key: item.media_key,
      duration_sec: item.duration_sec,
      lat: item.lat,
      lng: item.lng,
      is_deleted: item.is_deleted ?? false,
      read_at: item.read_at,
      created_at: item.created_at,
      reply_to: item.reply_to ? String(item.reply_to) : null,
      replyToMessage,
    };
  });

  // En yeni 50 mesajı çektik, normal chat listesi için kronolojik sıraya çeviriyoruz
  return mapped.slice().reverse();
};

export const clearConversation = async (conversationId: string): Promise<string> => {
  log.debug(`clearConversation conversationId=${conversationId}`);
  const { data, error } = await supabase.rpc('clear_conversation', {
    p_conversation_id: conversationId,
  });

  if (error) {
    log.error('clearConversation HATA:', error.message, error.code);
    throw mapDatabaseError(error);
  }

  return (data as string) ?? new Date().toISOString();
};

export const sendDirectMessage = async (
  senderId: string,
  input: SendDirectMessageInput
): Promise<DirectMessage> => {
  log.debug(`sendDirectMessage conversationId=${input.conversationId} senderId=${senderId}`);

  const { data, error } = await supabase
    .from('direct_messages')
    .insert([
      {
        conversation_id: input.conversationId,
        sender_id: senderId,
        type: input.type,
        body: input.body,
        media_key: input.mediaKey ?? null,
        duration_sec: input.durationSec ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        reply_to: input.replyTo ?? null,
      },
    ])
    .select('id, created_at')
    .single();

  if (error) {
    log.error('sendDirectMessage HATA:', error.message, error.code, error.details);
    if (error.message?.includes('BLOCKED')) {
      throw new AppError('DM_BLOCKED', 'Bu kullanıcıya engelleme sebebiyle mesaj gönderemezsiniz.', error);
    }
    if (error.message?.includes('hızlı')) {
      throw new AppError('RATE_LIMITED', 'Lütfen mesaj göndermeden önce 1 saniye bekleyin.', error);
    }
    throw mapDatabaseError(error);
  }

  return {
    id: String(data.id),
    conversation_id: input.conversationId,
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
    created_at: data.created_at ?? new Date().toISOString(),
  };
};

export const deleteDirectMessage = async (messageId: string): Promise<void> => {
  log.debug(`deleteDirectMessage messageId=${messageId}`);
  const { error } = await supabase.rpc('delete_direct_message', {
    p_message_id: messageId,
  });

  if (error) {
    log.error('deleteDirectMessage HATA:', error.message, error.code);
    throw mapDatabaseError(error);
  }
};

export const markDirectMessageRead = async (
  conversationId: string,
  _currentUserId?: string
): Promise<void> => {
  log.debug(`markDirectMessageRead conversationId=${conversationId}`);
  const { error } = await supabase.rpc('mark_conversation_as_read', {
    p_conversation_id: conversationId,
  });

  if (error) {
    log.error('markDirectMessageRead HATA:', error.message, error.code, error.details);
  }
};

export const deleteConversation = async (conversationId: string): Promise<boolean> => {
  log.debug(`deleteConversation conversationId=${conversationId}`);
  const { data, error } = await supabase.rpc('delete_conversation', {
    p_conversation_id: conversationId,
  });

  if (error) {
    log.error('deleteConversation HATA:', error.message, error.code);
    throw mapDatabaseError(error);
  }

  return !!data;
};

let lastTouchTime = 0;
export const touchLastSeen = async (): Promise<void> => {
  const now = Date.now();
  if (now - lastTouchTime < 60_000) return;
  lastTouchTime = now;
  try {
    await supabase.rpc('touch_last_seen');
  } catch (err) {
    log.warn('touchLastSeen error:', err);
  }
};

