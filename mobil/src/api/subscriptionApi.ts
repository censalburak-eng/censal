import { Platform } from 'react-native';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { supabase } from '../lib/supabase';
import { UserSubscription, SubscriptionPlan } from '../types/settings.types';
import { mapDatabaseError } from '../lib/errors';
import { CITIES_DATA } from '../data/cities';

export type UserPinnedListingItem = {
  id: string;
  cityId: number;
  cityName: string;
  cityPlate: string;
  messageId: string;
  messageBody: string;
  messageType?: string;
  startsAt: string;
  expiresAt: string;
  status: string;
  isActive: boolean;
  hoursLeft: number;
};

export const subscriptionKeys = {
  all: ['entitlement', 'subscription'] as const,
  detail: (userId?: string) => ['entitlement', 'subscription', userId ?? 'anonymous'] as const,
  userPins: (userId?: string) => ['user_pinned_listings', userId ?? 'anonymous'] as const,
  pendingPayment: (userId?: string) => ['payment_requests', 'pending', userId ?? 'anonymous'] as const,
};

export const getUserPinnedListings = async (
  userId?: string
): Promise<UserPinnedListingItem[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('pinned_listings')
    .select(`
      id,
      city_id,
      message_id,
      user_id,
      status,
      starts_at,
      expires_at,
      created_at,
      messages (
        body,
        type
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw mapDatabaseError(error);
  }

  if (!data || data.length === 0) return [];

  const now = new Date();

  return data.map((item: any) => {
    const city = CITIES_DATA.find((c) => c.id === item.city_id);
    const expiresAt = new Date(item.expires_at);
    const isActive = item.status === 'active' && expiresAt > now;
    const diffMs = expiresAt.getTime() - now.getTime();
    const hoursLeft = isActive ? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60))) : 0;

    const msg = Array.isArray(item.messages) ? item.messages[0] : item.messages;

    return {
      id: item.id,
      cityId: item.city_id,
      cityName: city?.name ?? `Oda #${item.city_id}`,
      cityPlate: city?.plateCode ?? `${item.city_id}`,
      messageId: item.message_id,
      messageBody: msg?.body ?? 'Sabitlenmiş İlan',
      messageType: msg?.type ?? 'text',
      startsAt: item.starts_at,
      expiresAt: item.expires_at,
      status: item.status,
      isActive,
      hoursLeft,
    };
  });
};

export const getActiveSubscription = async (userId?: string): Promise<UserSubscription | null> => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan, source, status, expires_at, created_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  return data as UserSubscription | null;
};

// Mükerrer / çift senkronizasyonu önlemek için hafıza içi kilit
let inFlightSyncPromise: Promise<UserSubscription | null> | null = null;
let lastSyncedSignature = '';
let lastSyncTimestamp = 0;

/**
 * RevenueCat'teki aktif aboneliği Supabase `subscriptions` tablosuna senkronize eder.
 * Böylece Admin paneli (Ödemeler, Kullanıcılar, Gelir İstatistikleri)
 * Google Play ve App Store satın alımlarını anında görür.
 */
export const syncRevenueCatSubscription = async (
  userId: string,
  customerInfo: CustomerInfo
): Promise<UserSubscription | null> => {
  if (!userId) return null;

  // RevenueCat SDK henüz bu kullanıcıya geçmediyse (Purchases.logIn tamamlanmadan) gelen bilgi
  // önceki kullanıcıya ait olabilir; yanlış hesaba abonelik yazmamak için senkronizasyonu atla
  try {
    const currentAppUserId = await Purchases.getAppUserID();
    if (currentAppUserId !== userId) return null;
  } catch {
    return null;
  }

  const proEntitlement = customerInfo.entitlements.active['censal_pro'];
  if (!proEntitlement || !proEntitlement.isActive) {
    return null;
  }

  const productId = (proEntitlement.productIdentifier ?? '').toLowerCase();
  const isYearly = productId.includes('yearly') || productId.includes('annual');
  const plan: SubscriptionPlan = isYearly ? 'yearly' : 'monthly';

  let expiresAtIso = proEntitlement.expirationDate;
  if (!expiresAtIso) {
    const d = new Date();
    d.setDate(d.getDate() + (isYearly ? 365 : 30));
    expiresAtIso = d.toISOString();
  }

  // İstek imzası (user + plan + expiresAt)
  const currentSignature = `${userId}:${plan}:${expiresAtIso}`;
  const now = Date.now();

  // Son 5 saniye içinde aynı veri zaten başarıyla gönderildiyse çift istek atma
  if (lastSyncedSignature === currentSignature && now - lastSyncTimestamp < 5000) {
    return null;
  }

  // Eğer şu an çalışan aktif bir senkronizasyon isteği varsa, tekrar RPC çağırma, mevcut promise'i bekle
  if (inFlightSyncPromise) {
    return inFlightSyncPromise;
  }

  const source = Platform.OS === 'android' ? 'google' : Platform.OS === 'ios' ? 'apple' : 'revenuecat';

  inFlightSyncPromise = (async () => {
    try {
      const { data, error } = await supabase.rpc('sync_revenuecat_subscription', {
        p_user_id: userId,
        p_plan: plan,
        p_source: source,
        p_expires_at: expiresAtIso,
      });

      if (error) {
        console.warn('[syncRevenueCatSubscription] RPC senkronizasyon hatası:', error.message);
        return null;
      }

      lastSyncedSignature = currentSignature;
      lastSyncTimestamp = Date.now();
      return data as UserSubscription;
    } catch (err) {
      console.warn('[syncRevenueCatSubscription] Beklenmeyen hata:', err);
      return null;
    } finally {
      inFlightSyncPromise = null;
    }
  })();

  return inFlightSyncPromise;
};

export type PaymentRequestItem = {
  id: string;
  user_id: string;
  package_type: 'monthly' | 'yearly' | 'pin_24h';
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  target_message_id?: string | null;
  target_city_id?: number | null;
  admin_note?: string | null;
  approved_at?: string | null;
  created_at: string;
};

export const requestPayment = async (
  packageType: 'monthly' | 'yearly' | 'pin_24h',
  targetMessageId?: string,
  targetCityId?: number
): Promise<PaymentRequestItem> => {
  const { data, error } = await supabase.rpc('request_payment', {
    p_package_type: packageType,
    p_target_message_id: targetMessageId ?? null,
    p_target_city_id: targetCityId ?? null,
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  return data as PaymentRequestItem;
};

export const getUserPendingPaymentRequest = async (
  userId?: string
): Promise<PaymentRequestItem | null> => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data as PaymentRequestItem | null;
};
