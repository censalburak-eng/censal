import { createClient } from '@/lib/client';

export type PaymentRecord = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_phone: string | null;
  amount: number;
  currency: string;
  channel: 'apple' | 'google' | 'paytr' | 'paycell';
  package_type: 'monthly' | 'yearly' | 'pin_24h';
  status: 'success' | 'failed' | 'refunded';
  error_reason: string | null;
  city_id: number | null;
  created_at: string;

};

export type RevenueStats = {
  daily_revenue: number;
  weekly_revenue: number;
  monthly_revenue: number;
  total_revenue: number;
  channel_breakdown: Record<string, number>;
  failed_count: number;
  success_count: number;
};

export const paymentsApi = {
  async getPayments(limit = 100): Promise<PaymentRecord[]> {
    const supabase = createClient();

    const [subsRes, pinsRes, settingsRes] = await Promise.all([
      supabase.from('subscriptions').select('id, user_id, plan, source, status, created_at').order('created_at', { ascending: false }).limit(limit),
      supabase.from('pinned_listings').select('id, user_id, city_id, status, created_at').order('created_at', { ascending: false }).limit(limit),
      supabase.from('app_settings').select('price_monthly, price_yearly, price_pin_24h').eq('id', 1).single(),
    ]);

    const userIds = new Set<string>();
    (subsRes.data || []).forEach((s) => { if (s.user_id) userIds.add(s.user_id); });
    (pinsRes.data || []).forEach((p) => { if (p.user_id) userIds.add(p.user_id); });

    const profilesRes = userIds.size > 0
      ? await supabase.from('profiles').select('id, first_name, last_name, phone').in('id', Array.from(userIds))
      : { data: [] };

    const userMap = new Map<string, { first_name?: string | null; last_name?: string | null; phone?: string | null }>();
    (profilesRes.data || []).forEach((u: { id: string; first_name?: string | null; last_name?: string | null; phone?: string | null }) => userMap.set(u.id, u));

    const priceMonthly = Number(settingsRes.data?.price_monthly) || 99.99;
    const priceYearly = Number(settingsRes.data?.price_yearly) || 999.99;
    const pricePin = Number(settingsRes.data?.price_pin_24h) || 199.99;

    const list: PaymentRecord[] = [];

    // Abonelikler
    (subsRes.data || []).forEach((sub) => {
      const u = sub.user_id ? userMap.get(sub.user_id) : null;
      const isYearly = sub.plan === 'yearly';
      const amount = sub.source === 'manual' ? 0 : (isYearly ? priceYearly : priceMonthly);
      const channel = (['apple', 'google', 'paytr', 'paycell'].includes(sub.source)
        ? sub.source
        : 'apple') as PaymentRecord['channel'];

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
      list.push({
        id: pin.id,
        user_id: pin.user_id,
        user_name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Kullanıcı',
        user_phone: u?.phone || null,
        amount: pricePin,
        currency: 'TRY',
        channel: 'paytr',
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
    const list = await paymentsApi.getPayments(200);

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
    const channel_breakdown: Record<string, number> = {
      apple: 0,
      google: 0,
      paytr: 0,
      paycell: 0,
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
    };
  },
};
