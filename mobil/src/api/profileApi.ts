import { supabase } from '../lib/supabase';
import { Profile, PublicProfile, CreateProfileInput, UpdateProfileInput } from '../types/profile.types';
import { mapDatabaseError } from '../lib/errors';
import { CITIES_DATA } from '../data/cities';

// 1. KULLANICININ KENDİ PROFİLİ
export const getProfile = async (
  userId: string,
  options?: { includeStats?: boolean }
): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, city_id, avatar_url, hide_phone, phone, role, is_banned, banned_at, banned_reason, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  if (!data) {
    return null;
  }

  let blockedCount = 0;
  let convCount = 0;

  // MADDE 5: HEAD isteklerini sadece profil ekranı gerçekten istatistik istediğinde yap
  if (options?.includeStats) {
    const [blockedRes, convRes] = await Promise.all([
      supabase.from('blocked_users').select('*', { count: 'exact', head: true }).eq('blocker_id', userId),
      supabase.from('conversations').select('*', { count: 'exact', head: true }).or(`user_a.eq.${userId},user_b.eq.${userId}`),
    ]);
    blockedCount = blockedRes.count ?? 0;
    convCount = convRes.count ?? 0;
  }

  const cityData = CITIES_DATA.find((c) => c.id === data.city_id);
  const cityName = cityData?.name ?? 'İstanbul';
  const plateCode = cityData?.plateCode ?? '34';

  return {
    id: data.id,
    first_name: data.first_name ?? '',
    last_name: data.last_name ?? '',
    city_id: data.city_id ?? 34,
    avatar_url: data.avatar_url,
    hide_phone: data.hide_phone ?? true,
    phone: data.phone,
    role: data.role ?? 'user',
    is_banned: data.is_banned ?? false,
    banned_at: data.banned_at ?? null,
    banned_reason: data.banned_reason ?? null,
    blocked_count: blockedCount ?? 0,
    conversations_count: convCount ?? 0,
    created_at: data.created_at,
    // UI Helpers
    ad: data.first_name ?? '',
    soyad: data.last_name ?? '',
    sehir: cityName,
    plate_code: plateCode,
    numara_gizli: data.hide_phone ?? true,
  };
};

// 2. BAŞKA BİRİNİN PROFİLİ (public_profiles view'ı - Numara gizliliği garantili)
export const getPublicProfile = async (userId: string): Promise<PublicProfile | null> => {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw mapDatabaseError(error);
  }

  const cityData = CITIES_DATA.find((c) => c.id === data.city_id);
  return {
    ...(data as PublicProfile),
    plate_code: cityData?.plateCode ?? '34',
  };
};

// 3. PROFİL OLUŞTURMA (UPSERT)
export const createProfile = async (
  userId: string,
  input: CreateProfileInput
): Promise<Profile> => {
  const firstName = input.first_name ?? input.ad ?? '';
  const lastName = input.last_name ?? input.soyad ?? '';
  const hidePhone = input.hide_phone ?? input.numara_gizli ?? true;
  let cityId = input.city_id;

  if (!cityId && input.sehir) {
    cityId = CITIES_DATA.find((c) => c.name === input.sehir)?.id ?? 34;
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        city_id: cityId ?? 34,
        avatar_url: input.avatar_url,
        hide_phone: hidePhone,
        phone: input.phone ?? null,
      },
      { onConflict: 'id' }
    )
    .select('id, first_name, last_name, city_id, avatar_url, hide_phone, phone, role, is_banned, banned_at, banned_reason, created_at')
    .single();

  if (error) {
    throw mapDatabaseError(error);
  }

  const cityName = CITIES_DATA.find((c) => c.id === data.city_id)?.name ?? 'İstanbul';

  return {
    ...data,
    ad: data.first_name,
    soyad: data.last_name,
    sehir: cityName,
    numara_gizli: data.hide_phone,
    phone: data.phone,
    blocked_count: 0,
    conversations_count: 0,
  };
};

// 4. PROFİL GÜNCELLEME
export const updateProfile = async (
  userId: string,
  input: UpdateProfileInput
): Promise<Profile> => {
  const updatePayload: Record<string, any> = {};

  if (input.first_name !== undefined || input.ad !== undefined) {
    updatePayload.first_name = input.first_name ?? input.ad;
  }
  if (input.last_name !== undefined || input.soyad !== undefined) {
    updatePayload.last_name = input.last_name ?? input.soyad;
  }
  if (input.phone !== undefined) {
    updatePayload.phone = input.phone;
  }
  if (input.hide_phone !== undefined || input.numara_gizli !== undefined) {
    updatePayload.hide_phone = input.hide_phone ?? input.numara_gizli;
  }
  if (input.avatar_url !== undefined) {
    updatePayload.avatar_url = input.avatar_url;
  }
  if (input.city_id !== undefined) {
    updatePayload.city_id = input.city_id;
  } else if (input.sehir !== undefined) {
    updatePayload.city_id = CITIES_DATA.find((c) => c.name === input.sehir)?.id ?? 34;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select('id, first_name, last_name, city_id, avatar_url, hide_phone, phone, role, is_banned, banned_at, banned_reason, created_at')
    .single();

  if (error) {
    throw mapDatabaseError(error);
  }

  const cityName = CITIES_DATA.find((c) => c.id === data.city_id)?.name ?? 'İstanbul';

  return {
    ...data,
    ad: data.first_name,
    soyad: data.last_name,
    sehir: cityName,
    numara_gizli: data.hide_phone,
  };
};

// 5. HESAP VE VERİ SİLME (Apple & Google Play Store Compliance)
export const deleteAccountAndData = async (userId: string): Promise<void> => {
  // Katman 1: Güvenli RPC (delete_user_account) çağrısı
  const { error: rpcError } = await supabase.rpc('delete_user_account');

  if (rpcError) {
    // Katman 2: Edge Function (delete-account) çağrısı
    const { error: fnError } = await supabase.functions.invoke('delete-account', {
      body: { userId },
    });

    if (fnError) {
      // Katman 3: Doğrudan kullanıcıya ait verileri temizlemeyi dene
      try {
        await supabase.from('messages').delete().eq('user_id', userId);
        await supabase.from('direct_messages').delete().eq('sender_id', userId);
        await supabase.from('pinned_listings').delete().eq('user_id', userId);
        await supabase.from('blocked_users').delete().eq('blocker_id', userId);
        await supabase.from('profiles').delete().eq('id', userId);
      } catch (err) {
        console.warn('[deleteAccountAndData] Veri temizleme adımı uyarısı:', err);
      }
    }
  }

  // Katman 4: Tüm oturum tokenlerini temizle ve çıkış yap
  await supabase.auth.signOut();
};
