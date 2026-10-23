import { createClient } from "@/lib/client";

export type AdminLog = {
  id: string;
  admin_id: string | null;
  admin_email?: string | null;
  admin_first_name?: string | null;
  admin_last_name?: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  target_first_name?: string | null;
  target_last_name?: string | null;
  target_phone?: string | null;
  target_city_id?: string | null;
  target_avatar_url?: string | null;
};

export const logsApi = {
  async getLogs(limit = 100): Promise<AdminLog[]> {
    const supabase = createClient();
    // admin_logs_view joins auth.users to provide admin_email
    const { data, error } = await supabase
      .from("admin_logs_view")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      // Fallback to direct admin_logs table if view isn't cached yet
      const fallback = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (fallback.error) throw fallback.error;
      return (fallback.data || []) as AdminLog[];
    }
    return (data || []) as AdminLog[];
  },

  async logAction(params: {
    action: string;
    target_type?: string;
    target_id?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_logs").insert({
        admin_id: user?.id ?? null,
        action: params.action,
        target_type: params.target_type ?? null,
        target_id: params.target_id ?? null,
        details: params.details ?? null,
      });
    } catch (err) {
      console.warn("Failed to write admin log:", err);
    }
  },
};
