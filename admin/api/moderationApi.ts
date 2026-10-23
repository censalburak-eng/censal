import { createClient } from '@/lib/client';

export type ReportItem = {
  id: string;
  reporter_id: string | null;
  reporter_name: string | null;
  reported_user_id: string | null;
  reported_user_name: string | null;
  reported_user_banned: boolean;
  message_id: string | null;
  room_id: number | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  message_body: string | null;
  message_type: 'text' | 'image' | 'audio' | 'location' | null;
  message_media_key: string | null;
  message_duration_sec: number | null;
  message_is_deleted: boolean;
};

export type ActivePinItem = {
  id: string;
  city_id: number;
  city_name: string | null;
  message_id: string;
  user_id: string;
  user_name: string | null;
  user_phone: string | null;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  message_body: string | null;
  message_type: string | null;
  message_media_key: string | null;
};

export type BanAppealItem = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_phone: string | null;
  ban_reason: string | null;
  message: string;
  appeal_count: number;
  status: 'pending' | 'reviewed' | 'resolved';
  admin_reply: string | null;
  created_at: string;
  updated_at: string | null;
  is_banned: boolean;
};

export const moderationApi = {
  async getReports(limit = 100): Promise<ReportItem[]> {
    const supabase = createClient();
    
    // 1. Fetch only the reports required
    const { data: reports, error: reportsErr } = await supabase
      .from('reports')
      .select('id, reporter_id, reported_user_id, message_id, room_id, reason, details, status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (reportsErr) throw reportsErr;
    if (!reports || reports.length === 0) return [];

    // 2. Targeted query for referenced profiles and messages only (No full-table scan, PERFORMANCE_ADMIN 4.4)
    const profileIdSet = new Set<string>();
    const messageIdSet = new Set<string>();

    reports.forEach((r) => {
      if (r.reporter_id) profileIdSet.add(r.reporter_id);
      if (r.reported_user_id) profileIdSet.add(r.reported_user_id);
      if (r.message_id) messageIdSet.add(r.message_id);
    });

    const [profilesRes, messagesRes] = await Promise.all([
      profileIdSet.size > 0
        ? supabase.from('profiles').select('id, first_name, last_name, is_banned').in('id', Array.from(profileIdSet))
        : { data: [] },
      messageIdSet.size > 0
        ? supabase.from('messages').select('id, body, type, media_key, duration_sec, is_deleted').in('id', Array.from(messageIdSet))
        : { data: [] },
    ]);

    const userMap = new Map<string, { first_name?: string | null; last_name?: string | null; is_banned?: boolean }>();
    (profilesRes.data || []).forEach((u: { id: string; first_name?: string | null; last_name?: string | null; is_banned?: boolean }) => {
      userMap.set(u.id, u);
    });

    const msgMap = new Map<string, { body?: string | null; type?: 'text' | 'image' | 'audio' | 'location' | null; media_key?: string | null; duration_sec?: number | null; is_deleted?: boolean }>();
    (messagesRes.data || []).forEach((m: { id: string; body?: string | null; type?: 'text' | 'image' | 'audio' | 'location' | null; media_key?: string | null; duration_sec?: number | null; is_deleted?: boolean }) => {
      msgMap.set(m.id, m);
    });

    return reports.map((r) => {
      const rep = r.reporter_id ? userMap.get(r.reporter_id) : null;
      const targ = r.reported_user_id ? userMap.get(r.reported_user_id) : null;
      const msg = r.message_id ? msgMap.get(r.message_id) : null;

      return {
        id: r.id,
        reporter_id: r.reporter_id,
        reporter_name: rep ? `${rep.first_name || ''} ${rep.last_name || ''}`.trim() : 'Anonim',
        reported_user_id: r.reported_user_id,
        reported_user_name: targ ? `${targ.first_name || ''} ${targ.last_name || ''}`.trim() : 'Bilinmiyor',
        reported_user_banned: Boolean(targ?.is_banned),
        message_id: r.message_id,
        room_id: r.room_id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        created_at: r.created_at,
        message_body: msg ? msg.body ?? null : null,
        message_type: msg ? msg.type ?? null : null,
        message_media_key: msg ? msg.media_key ?? null : null,
        message_duration_sec: msg ? msg.duration_sec ?? null : null,
        message_is_deleted: Boolean(msg?.is_deleted),
      };
    });
  },

  async resolveReport(
    reportId: string,
    status: string,
    deleteMessage = false,
    messageId?: string
  ): Promise<void> {
    const supabase = createClient();
    const { error: repErr } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', reportId);

    if (repErr) throw repErr;

    if (deleteMessage && messageId) {
      await supabase.from('messages').update({ is_deleted: true }).eq('id', messageId);
    }
  },

  async deleteMessage(messageId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId);

    if (error) throw error;
  },

  async getBannedWords(): Promise<string[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('banned_words')
      .select('word')
      .order('word', { ascending: true });

    if (error) throw error;
    return (data || []).map((w: { word: string }) => w.word);
  },

  async addBannedWord(word: string): Promise<void> {
    const clean = word.trim().toLowerCase();
    if (!clean) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('banned_words')
      .upsert({ word: clean });

    if (error) throw error;
  },

  async deleteBannedWord(word: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('banned_words')
      .delete()
      .eq('word', word);

    if (error) throw error;
  },

  async getActivePinnedListings(limit = 100): Promise<ActivePinItem[]> {
    const supabase = createClient();

    // 1. Only fetch active & unexpired pins (Indexed by idx_pinned_listings_active_city)
    const { data: pins, error: pinsErr } = await supabase
      .from('pinned_listings')
      .select('id, city_id, message_id, user_id, status, starts_at, expires_at, created_at')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (pinsErr) throw pinsErr;
    if (!pins || pins.length === 0) return [];

    // 2. Fetch only referenced cities, profiles, messages
    const cityIds = Array.from(new Set(pins.map((p) => p.city_id).filter(Boolean)));
    const userIds = Array.from(new Set(pins.map((p) => p.user_id).filter(Boolean)));
    const msgIds = Array.from(new Set(pins.map((p) => p.message_id).filter(Boolean)));

    const [citiesRes, profilesRes, messagesRes] = await Promise.all([
      cityIds.length > 0
        ? supabase.from('cities').select('id, name').in('id', cityIds)
        : { data: [] },
      userIds.length > 0
        ? supabase.from('profiles').select('id, first_name, last_name, phone').in('id', userIds)
        : { data: [] },
      msgIds.length > 0
        ? supabase.from('messages').select('id, body, type, media_key').in('id', msgIds)
        : { data: [] },
    ]);

    const cityMap = new Map<number, string>();
    (citiesRes.data || []).forEach((c: { id: number; name: string }) => cityMap.set(c.id, c.name));

    const userMap = new Map<string, { first_name?: string | null; last_name?: string | null; phone?: string | null }>();
    (profilesRes.data || []).forEach((u: { id: string; first_name?: string | null; last_name?: string | null; phone?: string | null }) => userMap.set(u.id, u));

    const msgMap = new Map<string, { body?: string | null; type?: string | null; media_key?: string | null }>();
    (messagesRes.data || []).forEach((m: { id: string; body?: string | null; type?: string | null; media_key?: string | null }) => msgMap.set(m.id, m));

    return pins.map((p) => {
      const usr = p.user_id ? userMap.get(p.user_id) : null;
      const msg = p.message_id ? msgMap.get(p.message_id) : null;

      return {
        id: p.id,
        city_id: p.city_id,
        city_name: cityMap.get(p.city_id) || `Oda #${p.city_id}`,
        message_id: p.message_id,
        user_id: p.user_id,
        user_name: usr ? `${usr.first_name || ''} ${usr.last_name || ''}`.trim() : 'Kullanıcı',
        user_phone: usr?.phone || null,
        status: p.status,
        starts_at: p.starts_at,
        expires_at: p.expires_at,
        created_at: p.created_at,
        message_body: msg?.body || null,
        message_type: msg?.type || null,
        message_media_key: msg?.media_key || null,
      };
    });
  },

  async cancelPinnedListing(pinId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pinned_listings')
      .update({ status: 'expired', expires_at: new Date().toISOString() })
      .eq('id', pinId);

    if (error) throw error;
  },

  async getBanAppeals(limit = 100): Promise<BanAppealItem[]> {
    const supabase = createClient();
    const { data: appeals, error: appealsErr } = await supabase
      .from('ban_appeals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (appealsErr) throw appealsErr;
    if (!appeals || appeals.length === 0) return [];

    const userIds = Array.from(new Set(appeals.map((a) => a.user_id).filter(Boolean)));

    const profilesRes = userIds.length > 0
      ? await supabase.from('profiles').select('id, is_banned, first_name, last_name, phone, banned_reason').in('id', userIds)
      : { data: [] };

    const profileMap = new Map<string, { first_name?: string | null; last_name?: string | null; phone?: string | null; banned_reason?: string | null; is_banned?: boolean }>();
    (profilesRes.data || []).forEach((p: { id: string; first_name?: string | null; last_name?: string | null; phone?: string | null; banned_reason?: string | null; is_banned?: boolean }) => {
      profileMap.set(p.id, p);
    });

    return appeals.map((a) => {
      const prof = profileMap.get(a.user_id);
      return {
        id: a.id,
        user_id: a.user_id,
        user_name: a.user_name || (prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Kullanıcı'),
        user_phone: a.user_phone || prof?.phone || null,
        ban_reason: a.ban_reason || prof?.banned_reason || 'Topluluk kurallarını ihlal',
        message: a.message,
        appeal_count: a.appeal_count || 1,
        status: a.status,
        admin_reply: a.admin_reply,
        created_at: a.created_at,
        updated_at: a.updated_at,
        is_banned: Boolean(prof?.is_banned),
      };
    });
  },

  async reviewBanAppeal(params: {
    appealId: string;
    userId: string;
    action: 'approve' | 'reject';
    adminReply?: string;
  }): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (params.action === 'approve') {
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ is_banned: false, banned_at: null, banned_reason: null })
        .eq('id', params.userId);
      if (profErr) throw profErr;

      const { error: appErr } = await supabase
        .from('ban_appeals')
        .update({
          status: 'resolved',
          admin_reply: params.adminReply || 'İtirazınız kabul edildi ve hesabınızın yasağı kaldırıldı.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.appealId);
      if (appErr) throw appErr;

      await supabase.from('admin_logs').insert({
        admin_id: user?.id ?? null,
        action: 'BAN_APPEAL_APPROVED',
        target_type: 'profiles',
        target_id: params.userId,
        details: {
          appeal_id: params.appealId,
          result: 'Kullanıcının banı kaldırıldı',
        },
      });
    } else {
      const { error: appErr } = await supabase
        .from('ban_appeals')
        .update({
          status: 'reviewed',
          admin_reply: params.adminReply || 'İtirazınız incelendi ancak kurallar gereği hesabınızın yasağı kaldırılamamıştır.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.appealId);
      if (appErr) throw appErr;

      await supabase.from('admin_logs').insert({
        admin_id: user?.id ?? null,
        action: 'BAN_APPEAL_REJECTED',
        target_type: 'profiles',
        target_id: params.userId,
        details: {
          appeal_id: params.appealId,
          result: 'İtiraz reddedildi, ban devam ediyor',
        },
      });
    }
  },
};
