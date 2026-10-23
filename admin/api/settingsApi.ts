import { createClient } from '@/lib/client';
import { cityApi, type CityQuota } from '@/api/cityApi';

export type AppSettings = {
  id: number;
  max_pins_per_room: number;
  price_pin_24h: number;
  price_monthly: number;
  price_yearly: number;
  free_mode: boolean;
  updated_at?: string;
};

export type { CityQuota };

export const settingsApi = {
  async getSettings(): Promise<AppSettings> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('id, max_pins_per_room, price_pin_24h, price_monthly, price_yearly, free_mode, updated_at')
      .eq('id', 1)
      .single();

    if (error) throw error;
    return data as AppSettings;
  },

  async updateSettings(settings: {
    free_mode?: boolean;
    price_monthly?: number;
    price_yearly?: number;
    price_pin_24h?: number;
    max_pins_per_room?: number;
  }): Promise<AppSettings> {
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof settings.free_mode === 'boolean') payload.free_mode = settings.free_mode;
    if (typeof settings.price_monthly === 'number') payload.price_monthly = settings.price_monthly;
    if (typeof settings.price_yearly === 'number') payload.price_yearly = settings.price_yearly;
    if (typeof settings.price_pin_24h === 'number') payload.price_pin_24h = settings.price_pin_24h;
    if (typeof settings.max_pins_per_room === 'number') payload.max_pins_per_room = settings.max_pins_per_room;

    const { data, error } = await supabase
      .from('app_settings')
      .update(payload)
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return data as AppSettings;
  },

  async getCities(): Promise<CityQuota[]> {
    return cityApi.getCityQuotas();
  },

  async updateCityPinLimit(cityId: number, maxLimit: number): Promise<void> {
    return cityApi.updateCityQuota({ cityId, maxLimit }).then(() => undefined);
  },
};
