import { supabase } from '../lib/supabase';
import { mapDatabaseError } from '../lib/errors';

export type BanAppeal = {
  id: string;
  user_id: string;
  user_name?: string | null;
  user_phone?: string | null;
  ban_reason?: string | null;
  message: string;
  appeal_count?: number;
  status: 'pending' | 'reviewed' | 'resolved';
  admin_reply?: string | null;
  created_at: string;
  updated_at?: string;
};

export const banAppealApi = {
  async sendBanAppeal(params: { message: string }): Promise<BanAppeal> {
    const { data, error } = await supabase.rpc('submit_ban_appeal', {
      p_message: params.message.trim(),
    });

    if (error) {
      if (error.message?.includes('APPEAL_LIMIT_EXCEEDED')) {
        throw new Error('Maksimum 2 itiraz hakkınızı doldurdunuz. Yeni bir itiraz mesajı gönderemezsiniz.');
      }
      throw mapDatabaseError(error);
    }
    return data as BanAppeal;
  },

  async getMyBanAppeals(): Promise<BanAppeal[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('ban_appeals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw mapDatabaseError(error);
    return (data || []) as BanAppeal[];
  },
};
