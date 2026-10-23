import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { AppSettings } from '../types/settings.types';
import { mapDatabaseError } from '../lib/errors';

const SETTINGS_CACHE_KEY = '@app_settings_cache';
let memorySettingsCache: AppSettings | null = null;

AsyncStorage.getItem(SETTINGS_CACHE_KEY).then((raw) => {
  if (raw) {
    try {
      memorySettingsCache = JSON.parse(raw);
    } catch { }
  }
});

export const settingsKeys = {
  all: ['app_settings'] as const,
};

export const getCachedAppSettings = (): AppSettings | undefined => {
  return memorySettingsCache ?? undefined;
};

export const fetchAppSettings = async (): Promise<AppSettings> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('id, free_mode, price_monthly, price_yearly, price_pin_24h, updated_at')
    .limit(1)
    .single();

  if (error) {
    if (memorySettingsCache) return memorySettingsCache;
    throw mapDatabaseError(error);
  }

  const settings: AppSettings = {
    id: data.id,
    free_mode: data.free_mode ?? false,
    price_monthly: String(data.price_monthly ?? '99.99'),
    price_yearly: String(data.price_yearly ?? '999.99'),
    price_pin_24h: String(data.price_pin_24h ?? '199.99'),
  };

  memorySettingsCache = settings;
  AsyncStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings)).catch(() => { });

  return settings;
};

export const getAppSettings = fetchAppSettings;
