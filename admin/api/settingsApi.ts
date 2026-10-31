import { createClient } from '@/lib/client';
import { cityApi, type CityQuota } from '@/api/cityApi';

export type AppSettings = {
  id: number;
  max_pins_per_room?: number;
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
      .select('id, price_pin_24h, price_monthly, price_yearly, free_mode, updated_at')
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

    // Mevcut eski fiyatları al (fiyat değişikliği denetim kaydı için)
    const { data: currentSettings } = await supabase
      .from('app_settings')
      .select('price_monthly, price_yearly, price_pin_24h')
      .eq('id', 1)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof settings.free_mode === 'boolean') payload.free_mode = settings.free_mode;
    if (typeof settings.price_monthly === 'number') payload.price_monthly = settings.price_monthly;
    if (typeof settings.price_yearly === 'number') payload.price_yearly = settings.price_yearly;
    if (typeof settings.price_pin_24h === 'number') payload.price_pin_24h = settings.price_pin_24h;

    const { data, error } = await supabase
      .from('app_settings')
      .update(payload)
      .eq('id', 1)
      .select('id, price_pin_24h, price_monthly, price_yearly, free_mode, updated_at')
      .single();

    if (error) throw error;

    // Fiyat değiştiyse price_change_logs tablosuna kaydet (eski kullanıcıların fiyatını korumak için)
    const nowIso = new Date().toISOString();
    const logsToInsert: any[] = [];

    if (
      typeof settings.price_monthly === 'number' &&
      currentSettings &&
      Number(currentSettings.price_monthly) !== settings.price_monthly
    ) {
      logsToInsert.push({
        product_id: 'censal_premium_monthly',
        type: 'subscription',
        old_price: Number(currentSettings.price_monthly),
        new_price: settings.price_monthly,
        apply_to_existing: false,
        status: 'success',
        created_at: nowIso,
      });
    }

    if (
      typeof settings.price_yearly === 'number' &&
      currentSettings &&
      Number(currentSettings.price_yearly) !== settings.price_yearly
    ) {
      logsToInsert.push({
        product_id: 'censal_premium_yearly',
        type: 'subscription',
        old_price: Number(currentSettings.price_yearly),
        new_price: settings.price_yearly,
        apply_to_existing: false,
        status: 'success',
        created_at: nowIso,
      });
    }

    if (
      typeof settings.price_pin_24h === 'number' &&
      currentSettings &&
      Number(currentSettings.price_pin_24h) !== settings.price_pin_24h
    ) {
      logsToInsert.push({
        product_id: 'censal_pin_24h',
        type: 'onetime',
        old_price: Number(currentSettings.price_pin_24h),
        new_price: settings.price_pin_24h,
        apply_to_existing: false,
        status: 'success',
        created_at: nowIso,
      });
    }

    if (logsToInsert.length > 0) {
      await supabase.from('price_change_logs').insert(logsToInsert);
    }

    return data as AppSettings;
  },

  async getCities(): Promise<CityQuota[]> {
    return cityApi.getCityQuotas();
  },

  async updateCityPinLimit(cityId: number, maxLimit: number): Promise<void> {
    return cityApi.updateCityQuota({ cityId, maxLimit }).then(() => undefined);
  },
};
