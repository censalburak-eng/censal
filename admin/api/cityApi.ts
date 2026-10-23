import { createClient } from "@/lib/client";
import { z } from "zod";

export const pinnedStatusSchema = z.enum(['reserved', 'active', 'expired']);

export const pinnedListingSchema = z.object({
    id: z.string().uuid(),
    city_id: z.number().int(),
    message_id: z.string().uuid(),
    user_id: z.string().uuid(),
    status: pinnedStatusSchema,
    starts_at: z.string().nullable(),
    expires_at: z.string().nullable(),
    created_at: z.string(),
});

export type PinnedStatus = z.infer<typeof pinnedStatusSchema>;
export type PinnedListing = z.infer<typeof pinnedListingSchema>;

export type CityQuota = {
    id: number;
    name: string;
    plate: number;
    max_pinned_limit: number;
    active_pins_count: number;
};

export const cityApi = {
    async getCityQuotas(): Promise<CityQuota[]> {
        const supabase = createClient();

        // 1. Fast server-side aggregated view (PERFORMANCE_ADMIN.md Scenario 2)
        const { data, error } = await supabase
            .from('city_quotas_view')
            .select('id, name, plate, max_pinned_limit, active_pins_count')
            .order('plate', { ascending: true });

        if (!error && data) {
            return data.map((c) => ({
                id: c.id,
                name: c.name,
                plate: c.plate,
                max_pinned_limit: c.max_pinned_limit ?? 3,
                active_pins_count: Number(c.active_pins_count) || 0,
            }));
        }

        // Fallback in case view is not accessible
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('cities')
            .select('id, name, plate, max_pinned_limit')
            .order('plate', { ascending: true });

        if (fallbackError) throw fallbackError;

        const { data: activePins } = await supabase
            .from('pinned_listings')
            .select('city_id')
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString());

        const counts: Record<number, number> = {};
        (activePins || []).forEach((p: { city_id: number }) => {
            counts[p.city_id] = (counts[p.city_id] || 0) + 1;
        });

        return (fallbackData || []).map((c) => ({
            id: c.id,
            name: c.name,
            plate: c.plate ?? c.id,
            max_pinned_limit: c.max_pinned_limit ?? 3,
            active_pins_count: counts[c.id] || 0,
        }));
    },

    async updateCityQuota({ cityId, maxLimit }: { cityId: number; maxLimit: number }) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('cities')
            .update({ max_pinned_limit: maxLimit })
            .eq('id', cityId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};
