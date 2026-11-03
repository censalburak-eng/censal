import { useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { touchLastSeen } from '../api/directMessagesApi';
import { useI18n, TranslationStructure } from '../i18n';
import { logger } from '../lib/logger';

const log = logger.scope('usePresence');

// Konuk kullanıcılar için kalıcı oturum anahtarı
let sessionGuestKey: string | null = null;
const getGuestKey = (): string => {
  if (!sessionGuestKey) {
    sessionGuestKey = `guest_${Math.random().toString(36).substring(2, 9)}`;
  }
  return sessionGuestKey;
};

type PresencePayload = {
  user_id?: string;
  room_id?: number | null;
  online_at: string;
};

// Global paylaşılan durum
let globalPresenceChannel: ReturnType<typeof supabase.channel> | null = null;
let currentPresenceState: Record<string, PresencePayload[]> = {};
const stateListeners = new Set<() => void>();

const notifyListeners = () => {
  stateListeners.forEach((fn) => fn());
};

// --- Store ---
const me: { key: string; userId?: string; roomId: number | null } = { key: '', roomId: null };
let snapshot = { roomCounts: {} as Record<number, number>, onlineUserIds: new Set<string>() };

const shallowEqual = (a: Record<number, number>, b: Record<number, number>): boolean => {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => a[+k] === b[+k]);
};

function recompute() {
  const counts: Record<number, number> = {};
  const ids = new Set<string>();

  for (const [key, presences] of Object.entries(currentPresenceState)) {
    if (key === me.key) continue; // Kendimizi aşağıda lokal state ile ekliyoruz (optimistic)
    const p = presences[presences.length - 1]; // Key başına tek kişi
    if (!p) continue;
    if (typeof p.room_id === 'number') {
      counts[p.room_id] = (counts[p.room_id] ?? 0) + 1;
    }
    if (!key.startsWith('guest_')) {
      ids.add(key);
    }
    if (p.user_id) {
      ids.add(p.user_id);
    }
  }

  // Optimistic: kendi durumumuz sunucuyu beklemeden anında yansır
  if (typeof me.roomId === 'number') {
    counts[me.roomId] = (counts[me.roomId] ?? 0) + 1;
  }
  if (me.userId) {
    ids.add(me.userId);
  }

  const isSameCounts = shallowEqual(snapshot.roomCounts, counts);
  const isSameIds =
    snapshot.onlineUserIds.size === ids.size &&
    Array.from(ids).every((id) => snapshot.onlineUserIds.has(id));

  if (!isSameCounts || !isSameIds) {
    snapshot = {
      roomCounts: isSameCounts ? snapshot.roomCounts : counts,
      onlineUserIds: isSameIds ? snapshot.onlineUserIds : ids,
    };
    notifyListeners();
  }
}

const trackMe = () => {
  if (globalPresenceChannel && globalPresenceChannel.state === 'joined') {
    globalPresenceChannel.track({
      user_id: me.userId,
      room_id: me.roomId,
      online_at: new Date().toISOString(),
    });
  }
};

/**
 * Oda ekranı bunu çağırır — hem anlık optimistic UI sağlar hem de sunucuya bildirir
 */
export const setMyRoom = (roomId: number | null) => {
  if (me.roomId === roomId) return;
  me.roomId = roomId;
  recompute(); // UI anında güncellenir
  trackMe();   // diğer kullanıcılara gider
};

function closeGlobalChannel() {
  const ch = globalPresenceChannel;
  globalPresenceChannel = null;
  currentPresenceState = {};
  recompute();
  if (ch) {
    supabase.removeChannel(ch);
  }
  supabase
    .getChannels()
    .filter((c) => c.topic === 'realtime:global_presence')
    .forEach((c) => supabase.removeChannel(c));
}

function createGlobalChannel(myPresenceKey: string) {
  closeGlobalChannel();

  log.info('Realtime global_presence kanalı başlatılıyor...');
  const ch = supabase.channel('global_presence', {
    config: {
      presence: {
        key: myPresenceKey,
      },
    },
  });

  ch.on('presence', { event: 'sync' }, () => {
    if (!globalPresenceChannel) return;
    currentPresenceState = globalPresenceChannel.presenceState() as Record<string, PresencePayload[]>;
    recompute();
  }).subscribe((status) => {
    log.info(`[Presence] Kanal durumu: ${status}`);
    if (status === 'SUBSCRIBED') {
      trackMe();
    }
  });

  globalPresenceChannel = ch;
}

/**
 * Root layout (_layout.tsx) içinde tek seferlik çağrılır: bağlantıyı ve AppState'i yönetir
 */
export const usePresenceConnection = (userId?: string) => {
  useEffect(() => {
    me.userId = userId;
    me.key = userId || getGuestKey();
    createGlobalChannel(me.key);

    touchLastSeen();
    const interval = setInterval(() => {
      touchLastSeen();
    }, 60_000);

    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        touchLastSeen();
        trackMe();
      } else {
        // Arka plana gidince odadan düş, untrack çağır
        globalPresenceChannel?.untrack();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
      closeGlobalChannel();
    };
  }, [userId]);
};

const subscribe = (fn: () => void) => {
  stateListeners.add(fn);
  return () => {
    stateListeners.delete(fn);
  };
};

export const useRoomCounts = (): Record<number, number> =>
  useSyncExternalStore(subscribe, () => snapshot.roomCounts);

export const useOnlineUserIds = (): Set<string> =>
  useSyncExternalStore(subscribe, () => snapshot.onlineUserIds);

/**
 * Geriye dönük uyumluluk için sarmalayıcı hook
 */
export const useGlobalPresence = (userId?: string, roomId?: number | null) => {
  const roomCounts = useRoomCounts();
  const onlineUserIds = useOnlineUserIds();

  useEffect(() => {
    if (typeof roomId === 'number') {
      setMyRoom(roomId);
      return () => {
        setMyRoom(null);
      };
    }
  }, [roomId]);

  const getRoomOnlineCount = useCallback(
    (targetRoomId: number): number => {
      return roomCounts[targetRoomId] || 0;
    },
    [roomCounts]
  );

  const isUserOnline = useCallback(
    (targetUserId: string): boolean => {
      return onlineUserIds.has(targetUserId);
    },
    [onlineUserIds]
  );

  return {
    roomCounts,
    onlineUserIds,
    getRoomOnlineCount,
    isUserOnline,
  };
};

/**
 * Son görülme zamanını yerel dile göre insansı formatlayan yardımcı
 */
export const formatLastSeenTime = (
  dateStr: string | null | undefined,
  t: TranslationStructure,
  locale = 'tr-TR',
  isOnline = false
): string => {
  if (isOnline) {
    return t.directChat.online;
  }
  if (!dateStr) {
    return t.directChat.offline;
  }

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  // 2 dakikadan azsa çevrim içi kabul edilir
  if (diffMins < 2) {
    return t.directChat.online;
  }

  // 60 dakikadan azsa
  if (diffMins < 60) {
    return t.directChat.minutesAgo(diffMins);
  }

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timePart = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) {
    return t.directChat.todayAt(timePart);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return t.directChat.yesterdayAt(timePart);
  }

  // Aynı yıl içindeyse gün ve ay
  if (date.getFullYear() === now.getFullYear()) {
    const dayMonth = date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
    });
    return `${dayMonth} ${timePart}`;
  }

  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Özel sohbette karşı kullanıcının çevrim içi durumunu ve son görülmesini veren hook
 */
export const useUserPresence = (targetUserId?: string, lastSeenAt?: string | null) => {
  const { t, isRTL, language } = useI18n();
  const locale = isRTL ? 'ar-EG' : language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'tr-TR';
  const onlineUserIds = useOnlineUserIds();

  const isOnline = useMemo(() => {
    if (!targetUserId) return false;
    if (onlineUserIds.has(targetUserId)) return true;
    if (lastSeenAt) {
      const diffMs = Date.now() - new Date(lastSeenAt).getTime();
      return diffMs < 90_000; // 90 saniyeden yeniyse çevrim içi
    }
    return false;
  }, [targetUserId, lastSeenAt, onlineUserIds]);

  const statusText = useMemo(() => {
    if (isOnline) {
      return t.directChat.online;
    }
    if (!lastSeenAt) {
      return t.directChat.offline;
    }

    const formatted = formatLastSeenTime(lastSeenAt, t, locale, false);
    if (formatted === t.directChat.online) {
      return t.directChat.online;
    }
    return t.directChat.lastSeen(formatted);
  }, [isOnline, lastSeenAt, locale, t]);

  return {
    isOnline,
    statusText,
  };
};
