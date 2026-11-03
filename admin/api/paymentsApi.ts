import { createClient } from '@/lib/client';

export type PaymentRecord = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_phone: string | null;
  amount: number;
  currency: string;
  channel: 'apple' | 'google' | 'manual';
  package_type: 'monthly' | 'yearly' | 'pin_24h';
  status: 'success' | 'failed' | 'refunded';
  error_reason: string | null;
  city_id: number | null;
  created_at: string;
};

export type PaymentRequestRecord = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_phone: string | null;
  package_type: 'monthly' | 'yearly' | 'pin_24h';
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  target_message_id: string | null;
  target_city_id: number | null;
  admin_note: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RevenueStats = {
  daily_revenue: number;
  weekly_revenue: number;
  monthly_revenue: number;
  total_revenue: number;
  channel_breakdown: Record<string, number>;
  failed_count: number;
  success_count: number;
  pending_count: number;
};

/**
 * RPC hata döndürmeden { success: false } dönerse (talep zaten işlenmiş, bulunamadı vb.)
 * işlemi başarılı saymamak için hata fırlatır.
 */
function assertRpcSucceeded(data: unknown, fallbackMessage: string): void {
  if (data && typeof data === 'object' && 'success' in data && (data as { success: unknown }).success === false) {
    const { message, error } = data as { message?: string; error?: string };
    throw new Error(message || error || fallbackMessage);
  }
}

export const paymentsApi = {
  async getPaymentRequests(): Promise<PaymentRequestRecord[]> {
    const supabase = createClient();
    const { data: requests, error } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false });

    // Hata yutulmaz: aksi halde yetki/ağ hatası "bekleyen talep yok" gibi görünür
    if (error) {
      console.error('getPaymentRequests error:', error);
      throw new Error(error.message);
    }

    const userIds = Array.from(new Set((requests || []).map((r) => r.user_id).filter(Boolean)));
    const profilesRes = userIds.length > 0
      ? await supabase.from('profiles').select('id, first_name, last_name, phone').in('id', userIds)
      : { data: [] };

    const userMap = new Map<string, { first_name?: string | null; last_name?: string | null; phone?: string | null }>();
    (profilesRes.data || []).forEach((u: { id: string; first_name?: string | null; last_name?: string | null; phone?: string | null }) => userMap.set(u.id, u));

    return (requests || []).map((r: any) => {
      const u = userMap.get(r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        user_name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Kullanıcı',
        user_phone: u?.phone || null,
        package_type: r.package_type,
        amount: Number(r.amount) || 0,
        currency: r.currency || 'TRY',
        status: r.status,
        target_message_id: r.target_message_id,
        target_city_id: r.target_city_id,
        admin_note: r.admin_note,
        approved_at: r.approved_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });
  },

  async approvePaymentRequest(requestId: string, note?: string): Promise<{ success: boolean }> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('approve_payment_request', {
      p_request_id: requestId,
      p_admin_note: note || 'Yönetici tarafından onaylandı.',
    });

    if (error) {
      throw new Error(error.message);
    }
    assertRpcSucceeded(data, 'Talep onaylanamadı (zaten işlenmiş veya bulunamamış olabilir).');
    return data;
  },

  async rejectPaymentRequest(requestId: string, reason?: string): Promise<{ success: boolean }> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('reject_payment_request', {
      p_request_id: requestId,
      p_admin_note: reason || 'Yönetici tarafından reddedildi.',
    });

    if (error) {
      throw new Error(error.message);
    }
    assertRpcSucceeded(data, 'Talep reddedilemedi (zaten işlenmiş veya bulunamamış olabilir).');
    return data;
  },

  async getPayments(limit = 100): Promise<PaymentRecord[]> {
    const supabase = createClient();

    const [subsRes, pinsRes, settingsRes, reqsRes, priceLogsRes] = await Promise.all([
      supabase.from('subscriptions').select('id, user_id, plan, source, status, expires_at, created_at').order('created_at', { ascending: false }).limit(limit),
      supabase.from('pinned_listings').select('id, user_id, city_id, status, created_at').order('created_at', { ascending: false }).limit(limit),
      supabase.from('app_settings').select('price_monthly, price_yearly, price_pin_24h').eq('id', 1).maybeSingle(),
      supabase.from('payment_requests').select('*').order('created_at', { ascending: false }).limit(limit),
      supabase.from('price_change_logs').select('product_id, old_price, new_price, status, created_at').eq('status', 'success').order('created_at', { ascending: true }),
    ]);

    // Sorgulardan biri başarısızsa eksik/yanlış liste ve sabit fiyatlarla sessizce devam etme
    const queryError = subsRes.error || pinsRes.error || settingsRes.error || reqsRes.error || priceLogsRes.error;
    if (queryError) {
      console.error('getPayments error:', queryError);
      throw new Error(queryError.message);
    }

    const userIds = new Set<string>();
    (subsRes.data || []).forEach((s) => { if (s.user_id) userIds.add(s.user_id); });
    (pinsRes.data || []).forEach((p) => { if (p.user_id) userIds.add(p.user_id); });
    (reqsRes.data || []).forEach((r) => { if (r.user_id) userIds.add(r.user_id); });

    const profilesRes = userIds.size > 0
      ? await supabase.from('profiles').select('id, first_name, last_name, phone').in('id', Array.from(userIds))
      : { data: [] };

    const userMap = new Map<string, { first_name?: string | null; last_name?: string | null; phone?: string | null }>();
    (profilesRes.data || []).forEach((u: { id: string; first_name?: string | null; last_name?: string | null; phone?: string | null }) => userMap.set(u.id, u));

    const priceMonthly = Number(settingsRes.data?.price_monthly) || 99.99;
    const priceYearly = Number(settingsRes.data?.price_yearly) || 999.99;
    const pricePin = Number(settingsRes.data?.price_pin_24h) || 199.99;

    // Fiyat değişiklik geçmişi: Eski kullanıcıların satın alma tarihindeki fiyatını korumak için
    const logs = ((priceLogsRes.data || []) as any[]).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const resolveHistoricalPrice = (
      typeKey: 'monthly' | 'yearly' | 'pin',
      createdAtIso: string,
      currentPrice: number
    ): number => {
      const targetTime = new Date(createdAtIso).getTime();
      const relevantLogs = logs.filter((l) => l.product_id?.toLowerCase().includes(typeKey));

      if (relevantLogs.length === 0) {
        return currentPrice;
      }

      // Eğer kullanıcı ilk fiyat değişikliğinden önce abone olduysa, o değişikliğin old_price'ını alır
      const firstChangeTime = new Date(relevantLogs[0].created_at).getTime();
      if (targetTime < firstChangeTime) {
        return Number(relevantLogs[0].old_price) || currentPrice;
      }

      // İlgili tarihte geçerli olan fiyatı bul
      let matchedPrice = currentPrice;
      for (let i = relevantLogs.length - 1; i >= 0; i--) {
        const changeTime = new Date(relevantLogs[i].created_at).getTime();
        if (targetTime >= changeTime) {
          matchedPrice = Number(relevantLogs[i].new_price);
          break;
        }
      }
      return matchedPrice;
    };

    const list: PaymentRecord[] = [];
    const seenSubs = new Set<string>();

    // Abonelikler
    (subsRes.data || []).forEach((sub: any) => {
      // Çift kayıt koruması: Aynı kullanıcının aynı bitiş tarihli veya yakın zamanlı kaydını tekilleştir
      const dedupeKey = sub.expires_at
        ? `${sub.user_id}_${sub.expires_at}`
        : `${sub.user_id}_${sub.plan}_${Math.floor(new Date(sub.created_at).getTime() / 15000)}`;

      if (seenSubs.has(dedupeKey)) {
        return;
      }
      seenSubs.add(dedupeKey);

      const u = sub.user_id ? userMap.get(sub.user_id) : null;
      const isYearly = sub.plan === 'yearly';
      // Eski kullanıcılar satın aldıkları tarihteki eski fiyattan, yeni kullanıcılar ise yeni fiyattan hesaplanır
      const historicalPrice = isYearly
        ? resolveHistoricalPrice('yearly', sub.created_at, priceYearly)
        : resolveHistoricalPrice('monthly', sub.created_at, priceMonthly);

      const amount = historicalPrice;
      const channel: PaymentRecord['channel'] =
        sub.source === 'google' ? 'google' : sub.source === 'manual' ? 'manual' : 'apple';

      list.push({
        id: sub.id,
        user_id: sub.user_id,
        user_name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Kullanıcı',
        user_phone: u?.phone || null,
        amount,
        currency: 'TRY',
        channel,
        package_type: isYearly ? 'yearly' : 'monthly',
        status: sub.status === 'failed' ? 'failed' : 'success',
        error_reason: sub.status === 'failed' ? 'Banka provizyonu onaylanmadı' : null,
        city_id: null,
        created_at: sub.created_at,
      });
    });

    // Sabit İlanlar (Vitrin Ödemeleri)
    (pinsRes.data || []).forEach((pin) => {
      const u = pin.user_id ? userMap.get(pin.user_id) : null;
      const pinHistoricalPrice = resolveHistoricalPrice('pin', pin.created_at, pricePin);

      list.push({
        id: pin.id,
        user_id: pin.user_id,
        user_name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Kullanıcı',
        user_phone: u?.phone || null,
        amount: pinHistoricalPrice,
        currency: 'TRY',
        channel: 'google',
        package_type: 'pin_24h',
        status: 'success',
        error_reason: null,
        city_id: pin.city_id,
        created_at: pin.created_at,
      });
    });

    // Tarihe göre sırala
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return list.slice(0, limit);
  },

  async getRevenueStats(): Promise<RevenueStats> {
    const [list, reqs] = await Promise.all([
      paymentsApi.getPayments(200),
      paymentsApi.getPaymentRequests(),
    ]);

    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;

    let daily_revenue = 0;
    let weekly_revenue = 0;
    let monthly_revenue = 0;
    let total_revenue = 0;
    let failed_count = 0;
    let success_count = 0;
    const pending_count = reqs.filter((r) => r.status === 'pending').length;
    const channel_breakdown: Record<string, number> = {
      google: 0,
      apple: 0,
      manual: 0,
    };

    list.forEach((item) => {
      const itemTime = new Date(item.created_at).getTime();
      const diff = now - itemTime;

      if (item.status === 'success') {
        const val = Number(item.amount) || 0;
        total_revenue += val;
        channel_breakdown[item.channel] = (channel_breakdown[item.channel] || 0) + val;
        success_count++;

        if (diff <= oneDay) daily_revenue += val;
        if (diff <= sevenDays) weekly_revenue += val;
        if (diff <= thirtyDays) monthly_revenue += val;
      } else if (item.status === 'failed') {
        failed_count++;
      }
    });

    return {
      daily_revenue,
      weekly_revenue,
      monthly_revenue,
      total_revenue,
      channel_breakdown,
      failed_count,
      success_count,
      pending_count,
    };
  },
};
