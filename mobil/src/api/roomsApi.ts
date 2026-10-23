import { supabase } from '../lib/supabase';
import { mapDatabaseError } from '../lib/errors';
import { CITIES_DATA } from '../data/cities';
import { CityRoom } from '../types/rooms.types';

/**
 * Supabase cities tablosundan tüm şehirleri ve kontenjanlarını çeker.
 * Yerel CITIES_DATA'nın kusursuz plaka sırasını (01 Adana ... 81 Düzce) baz alıp,
 * DB'deki güncel max_pinned_limit ve diğer alanlarla birleştirerek döner.
 */
export const fetchRoomsApi = async (): Promise<readonly CityRoom[]> => {
  // 1. city_quotas_view ile sıralı ve aktif ilan sayılarıyla hızlı çek
  const { data, error } = await supabase
    .from('city_quotas_view')
    .select('id, name, plate, max_pinned_limit, active_pins_count')
    .order('plate', { ascending: true });

  if (!error && data && data.length > 0) {
    const dbMap = new Map<number, (typeof data)[number]>();
    for (const item of data) {
      if (item.id != null) dbMap.set(Number(item.id), item);
    }

    return CITIES_DATA.map((local) => {
      const dbItem = dbMap.get(local.id);
      return {
        ...local,
        name: dbItem?.name ?? local.name,
        plateCode:
          dbItem?.plate != null
            ? String(dbItem.plate).padStart(2, '0')
            : local.plateCode,
        maxPinnedLimit:
          dbItem?.max_pinned_limit != null
            ? Number(dbItem.max_pinned_limit)
            : (local.maxPinnedLimit ?? 3),
        pinnedCount: dbItem?.active_pins_count ?? local.pinnedCount ?? 0,
      };
    });
  }

  // Fallback to cities table with explicit order
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('cities')
    .select('id, name, plate, max_pinned_limit')
    .order('plate', { ascending: true });

  if (fallbackError) {
    throw mapDatabaseError(fallbackError);
  }

  if (!fallbackData || fallbackData.length === 0) {
    return CITIES_DATA;
  }

  const dbMap = new Map<number, (typeof fallbackData)[number]>();
  for (const item of fallbackData) {
    dbMap.set(Number(item.id), item);
  }

  return CITIES_DATA.map((local) => {
    const dbItem = dbMap.get(local.id);
    return {
      ...local,
      name: (dbItem?.name as string | undefined) ?? local.name,
      plateCode:
        dbItem?.plate != null
          ? String(dbItem.plate).padStart(2, '0')
          : local.plateCode,
      maxPinnedLimit:
        (dbItem?.max_pinned_limit as number | undefined) ??
        local.maxPinnedLimit ??
        3,
    };
  });
};

/**
 * Tek bir odanın güncel detayını Supabase'den çeker.
 */
export const fetchRoomDetailApi = async (roomId: number): Promise<CityRoom> => {
  const local = CITIES_DATA.find((c) => c.id === roomId);

  const { data, error } = await supabase
    .from('city_quotas_view')
    .select('id, name, plate, max_pinned_limit, active_pins_count')
    .eq('id', roomId)
    .single();

  if (!error && data) {
    const plateFormatted =
      data.plate != null
        ? String(data.plate).padStart(2, '0')
        : local?.plateCode ?? String(roomId).padStart(2, '0');

    return {
      id: data.id as number,
      name: data.name ?? local?.name ?? '',
      plateCode: plateFormatted,
      region: local?.region ?? 'Türkiye',
      pinnedCount: data.active_pins_count ?? local?.pinnedCount ?? 0,
      isLocked: local?.isLocked ?? false,
      maxPinnedLimit:
        data.max_pinned_limit != null
          ? Number(data.max_pinned_limit)
          : (local?.maxPinnedLimit ?? 3),
      activeUsersCount: local?.activeUsersCount,
      lastMessageSnippet: local?.lastMessageSnippet,
      lastMessageTime: local?.lastMessageTime,
    };
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('cities')
    .select('id, name, plate, max_pinned_limit')
    .eq('id', roomId)
    .single();

  if (fallbackError) {
    if (local) return local;
    throw mapDatabaseError(fallbackError);
  }

  const plateFormatted =
    fallbackData.plate != null
      ? String(fallbackData.plate).padStart(2, '0')
      : local?.plateCode ?? String(roomId).padStart(2, '0');

  return {
    id: fallbackData.id as number,
    name: (fallbackData.name as string) ?? local?.name ?? '',
    plateCode: plateFormatted,
    region: local?.region ?? 'Türkiye',
    pinnedCount: local?.pinnedCount ?? 0,
    isLocked: local?.isLocked ?? false,
    maxPinnedLimit: (fallbackData.max_pinned_limit as number | undefined) ?? local?.maxPinnedLimit ?? 3,
    activeUsersCount: local?.activeUsersCount,
    lastMessageSnippet: local?.lastMessageSnippet,
    lastMessageTime: local?.lastMessageTime,
  };
};
