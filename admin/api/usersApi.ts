import { createClient } from '@/lib/client';

export type AdminUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_banned: boolean;
  banned_at?: string | null;
  banned_reason?: string | null;
  role: string;
  city_id: string | null;
  avatar_url: string | null;
  created_at: string;
  subscription_id: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
  subscription_source: string | null;
};

export const usersApi = {
  async getUsers(search?: string, limit = 100): Promise<AdminUser[]> {
    const supabase = createClient();

    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, is_banned, banned_at, banned_reason, role, city_id, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (search && search.trim().length > 0) {
      const term = search.trim();
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    const { data: profiles, error: profilesErr } = await query;
    if (profilesErr) throw profilesErr;
    if (!profiles || profiles.length === 0) return [];

    // Query subscriptions only for the returned users (Eliminates full table scan of subscriptions)
    const userIds = profiles.map((p) => p.id);
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan, status, expires_at, source, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    const subsByUser: Record<string, { id: string; plan: string; status: string; expires_at: string; source: string }> = {};
    (subs || []).forEach((sub) => {
      if (!subsByUser[sub.user_id]) {
        subsByUser[sub.user_id] = sub;
      }
    });

    return profiles.map((p) => {
      const sub = subsByUser[p.id];
      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        is_banned: Boolean(p.is_banned),
        banned_at: p.banned_at,
        banned_reason: p.banned_reason,
        role: p.role || 'user',
        city_id: p.city_id,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        subscription_id: sub ? sub.id : null,
        subscription_plan: sub ? sub.plan : null,
        subscription_status: sub ? sub.status : null,
        subscription_expires_at: sub ? sub.expires_at : null,
        subscription_source: sub ? sub.source : null,
      };
    });
  },

  async toggleBan(userId: string, isBanned: boolean, reason?: string): Promise<void> {
    const supabase = createClient();
    const updatePayload: Record<string, unknown> = {
      is_banned: isBanned,
    };
    if (isBanned) {
      updatePayload.banned_at = new Date().toISOString();
      updatePayload.banned_reason = reason || 'Topluluk kurallarını ihlal';
    } else {
      updatePayload.banned_at = null;
      updatePayload.banned_reason = null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('admin_logs').insert({
      admin_id: user?.id ?? null,
      action: isBanned ? 'USER_BAN' : 'USER_UNBAN',
      target_type: 'profiles',
      target_id: userId,
      details: {
        is_banned: isBanned,
        reason: isBanned ? (reason || 'Topluluk kurallarını ihlal') : 'Yasak kaldırıldı',
      },
    });

    if (error) throw error;
  },

  async grantSubscription(userId: string, plan: 'monthly' | 'yearly', durationDays = 30): Promise<void> {
    const supabase = createClient();

    const { data: existingSubs, error: readErr } = await supabase
      .from('subscriptions')
      .select('id, source, expires_at')
      .eq('user_id', userId);

    // Okuma başarısızsa mükerrer satır eklememek için işlemi durdur
    if (readErr) throw readErr;

    // Süre, kullanıcının en geç biten aktif aboneliğinin üzerine eklenir (mevcut süre kısalmaz)
    const now = new Date();
    const latestActiveExpiry = (existingSubs || [])
      .map((s) => new Date(s.expires_at))
      .filter((d) => d > now)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const expiresAt = new Date(latestActiveExpiry ?? now);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Mağaza (google/apple/revenuecat) kaynaklı satırlara dokunulmaz; yalnızca manuel satır güncellenir veya yenisi eklenir
    const manualSub = (existingSubs || []).find((s) => s.source === 'manual');

    let subErr;
    if (manualSub) {
      const res = await supabase
        .from('subscriptions')
        .update({
          plan,
          status: 'active',
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', manualSub.id);
      subErr = res.error;
    } else {
      const res = await supabase.from('subscriptions').insert({
        user_id: userId,
        plan,
        source: 'manual',
        status: 'active',
        expires_at: expiresAt.toISOString(),
      });
      subErr = res.error;
    }
    if (subErr) throw subErr;

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('admin_logs').insert({
      admin_id: user?.id ?? null,
      action: 'SUBSCRIPTION_GRANT',
      target_type: 'profiles',
      target_id: userId,
      details: {
        plan,
        duration_days: durationDays,
        expires_at: expiresAt.toISOString(),
        source: 'manual',
      },
    });
  },

  async extendSubscription(subscriptionId: string, additionalDays: number): Promise<void> {
    const supabase = createClient();
    const { data: current, error: getErr } = await supabase
      .from('subscriptions')
      .select('user_id, expires_at, plan')
      .eq('id', subscriptionId)
      .single();

    if (getErr) throw getErr;

    const baseDate = current?.expires_at && new Date(current.expires_at) > new Date()
      ? new Date(current.expires_at)
      : new Date();

    baseDate.setDate(baseDate.getDate() + additionalDays);

    const { error: updateErr } = await supabase
      .from('subscriptions')
      .update({ expires_at: baseDate.toISOString(), status: 'active' })
      .eq('id', subscriptionId);

    if (updateErr) throw updateErr;

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('admin_logs').insert({
      admin_id: user?.id ?? null,
      action: 'SUBSCRIPTION_EXTEND',
      target_type: 'profiles',
      target_id: current?.user_id ?? subscriptionId,
      details: {
        additional_days: additionalDays,
        new_expires_at: baseDate.toISOString(),
        subscription_id: subscriptionId,
      },
    });
  },

  async addAdmin(userId: string, role = 'admin'): Promise<void> {
    const supabase = createClient();

    // 1. admins tablosuna ekle
    const { error: adminErr } = await supabase.from('admins').upsert({
      user_id: userId,
      role,
    });
    if (adminErr) throw adminErr;

    // 2. profiles tablosunda rolü admin yap
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);

    // 3. Log kaydı
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('admin_logs').insert({
      admin_id: user?.id ?? null,
      action: 'ADMIN_ROLE_GRANT',
      target_type: 'profiles',
      target_id: userId,
      details: { role },
    });
  },

  async removeAdmin(userId: string): Promise<void> {
    const supabase = createClient();

    // 1. admins tablosundan sil
    const { error: adminErr } = await supabase.from('admins').delete().eq('user_id', userId);
    if (adminErr) throw adminErr;

    // 2. profiles tablosunda rolü user yap
    await supabase.from('profiles').update({ role: 'user' }).eq('id', userId);

    // 3. Log kaydı
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('admin_logs').insert({
      admin_id: user?.id ?? null,
      action: 'ADMIN_ROLE_REVOKE',
      target_type: 'profiles',
      target_id: userId,
      details: { revoked: true },
    });
  },

  async getAdmins(): Promise<{
    user_id: string;
    role: string;
    created_at: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  }[]> {
    const supabase = createClient();
    const { data: admins, error } = await supabase
      .from('admins')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!admins || admins.length === 0) return [];

    const userIds = admins.map((a) => a.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone')
      .in('id', userIds);

    const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));
    return admins.map((a) => {
      const p = profilesMap.get(a.user_id);
      return {
        ...a,
        first_name: p?.first_name ?? null,
        last_name: p?.last_name ?? null,
        phone: p?.phone ?? null,
      };
    });
  },
};
