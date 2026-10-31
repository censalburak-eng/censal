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
    let logs: AdminLog[] = [];

    // admin_logs_view joins auth.users to provide admin_email
    const { data, error } = await supabase
      .from("admin_logs_view")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      // Fallback to direct admin_logs table if view isn't cached yet
      const fallback = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (fallback.error) throw fallback.error;
      logs = (fallback.data || []) as AdminLog[];
    } else {
      logs = (data || []) as AdminLog[];
    }

    // Profil veya admin bilgisi eksik olan satırları profiles tablosundan zenginleştir
    const missingTargetIds = Array.from(
      new Set(
        logs
          .filter(
            (l) =>
              (l.target_type === "profiles" ||
                l.target_type === "profile" ||
                l.target_type === "users") &&
              l.target_id &&
              !l.target_first_name &&
              !l.target_phone
          )
          .map((l) => l.target_id!)
      )
    );

    const missingAdminIds = Array.from(
      new Set(
        logs
          .filter((l) => l.admin_id && !l.admin_first_name && !l.admin_email)
          .map((l) => l.admin_id!)
      )
    );

    const allIdsToFetch = Array.from(new Set([...missingTargetIds, ...missingAdminIds]));

    if (allIdsToFetch.length > 0) {
      try {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, phone, city_id, avatar_url")
          .in("id", allIdsToFetch);

        if (profs && profs.length > 0) {
          const profMap = new Map(profs.map((p) => [p.id, p]));
          for (const log of logs) {
            if (log.target_id && profMap.has(log.target_id)) {
              const p = profMap.get(log.target_id)!;
              log.target_first_name = log.target_first_name || p.first_name;
              log.target_last_name = log.target_last_name || p.last_name;
              log.target_phone = log.target_phone || p.phone;
              log.target_city_id = log.target_city_id || p.city_id;
              log.target_avatar_url = log.target_avatar_url || p.avatar_url;
            }
            if (log.admin_id && profMap.has(log.admin_id)) {
              const p = profMap.get(log.admin_id)!;
              log.admin_first_name = log.admin_first_name || p.first_name;
              log.admin_last_name = log.admin_last_name || p.last_name;
            }
          }
        }
      } catch (err) {
        console.warn("Profil tamamlama hatası:", err);
      }
    }

    return logs;
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
