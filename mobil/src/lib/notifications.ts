import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { logger } from './logger';
import type { AppNotificationData } from '../types/notifications.types';

const log = logger.scope('Notifications');

export const NOTIFICATIONS_STORAGE_KEY = '@censal/notifications_enabled';

// Uygulama açıkken (foreground) gelen bildirimlerin nasıl gösterileceğini belirle
// Kullanıcı uygulamadayken bildirimlerin rahatsız etmemesi için tüm gösterimler kapalı
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

export type RegisterPushOptions = {
  /** false ise sadece önceden izin verilmişse sessizce token çeker, izin verilmemişse popup açmaz. */
  requestIfMissing?: boolean;
  /** true ise kullanıcının yerel kapatma tercihini bypass eder (ayarlardan tekrar açıldığında) */
  force?: boolean;
};

/**
 * Cihazın mevcut bildirim iznini kontrol eder.
 */
export async function checkNotificationPermissionAsync(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Kullanıcının bildirimlerinin hem yerel tercih hem de cihaz izni açısından aktif olup olmadığını kontrol eder.
 */
export async function isNotificationsEnabledAsync(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const userPref = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    // Kullanıcı ayarlardan bildirimleri açıkça kapattıysa daima false döner
    if (userPref === 'false') return false;

    // Cihaz düzeyinde bildirim izni var mı?
    const hasOsPermission = await checkNotificationPermissionAsync();
    return hasOsPermission;
  } catch {
    return false;
  }
}

/**
 * Kullanıcının bildirim tercihini günceller.
 * enabled = false ise:
 * - AsyncStorage'a 'false' yazar.
 * - Supabase'den push_token'ı temizler.
 * - Cihazdaki aktif bildirimleri kapatır.
 * 
 * enabled = true ise:
 * - AsyncStorage'a 'true' yazar.
 * - İzin ister ve token'ı Supabase'e kaydeder.
 */
export async function setNotificationsEnabledAsync(
  enabled: boolean,
  userId?: string,
  language?: string
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    if (!enabled) {
      // 1) Yerel tercihi kapalı olarak işaretle
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, 'false');

      // 2) Supabase'deki push token'ı temizle
      if (userId) {
        await clearPushTokenFromSupabase(userId);
      }

      // 3) Mevcut aktif veya bekleyen bildirimleri kapat
      await Notifications.dismissAllNotificationsAsync().catch(() => { });
      await Notifications.cancelAllScheduledNotificationsAsync().catch(() => { });

      log.info('Bildirimler kullanıcı tarafından ayarlardan tamamen kapatıldı.');
      return false;
    } else {
      // Kullanıcı ayarlardan bildirimleri açmak istiyor
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, 'true');
      const token = await registerForPushNotificationsAsync({ requestIfMissing: true, force: true });
      if (token) {
        if (userId) {
          await savePushTokenToSupabase(userId, token, language);
        }
        return true;
      } else {
        // Cihaz izni reddedildiyse tercihi 'false' olarak güncelle
        await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, 'false');
        return false;
      }
    }
  } catch (err) {
    log.error('setNotificationsEnabledAsync hata:', err);
    return false;
  }
}

/**
 * Cihazdan Expo Push Token alır ve Android için bildirim kanallarını ayarlar.
 * Varsayılan olarak (requestIfMissing: false) açılışta izinsiz popup tetiklemez.
 */
export async function registerForPushNotificationsAsync(
  options: RegisterPushOptions = { requestIfMissing: false }
): Promise<string | null> {
  // Web veya emülatör kontrolü
  if (Platform.OS === 'web') {
    return null;
  }

  // Android 8.0+ için bildirim kanalı zorunludur
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Varsayılan',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ffffff',
    });

    await Notifications.setNotificationChannelAsync('direct_messages', {
      name: 'Özel Mesajlar (DM)',
      description: 'Birebir sohbet mesajları için anlık bildirimler',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 200, 200],
    });

    await Notifications.setNotificationChannelAsync('announcements', {
      name: 'Duyurular ve Hatırlatmalar',
      description: 'Sabit ilan süresi ve itiraz yanıtları',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  if (!Device.isDevice) {
    log.info('Emülatörde çalışıyor, fiziksel cihaz olmadığı için token alınamadı.');
    return null;
  }

  // Kullanıcı ayarlardan bildirimleri kapattıysa ve 'force' zorlaması yoksa token alma
  if (!options.force) {
    try {
      const userPref = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (userPref === 'false') {
        log.debug('Kullanıcı bildirimleri ayarlardan kapattığı için token alınmadı.');
        return null;
      }
    } catch { }
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      if (!options.requestIfMissing) {
        log.debug('Bildirim izni henüz verilmemiş; açılışta kullanıcıyı rahatsız etmemek için popup açılmıyor.');
        return null;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      log.info('Kullanıcı bildirim iznini vermedi.');
      return null;
    }

    // EAS projectId'yi app config'den çek
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      'eebd28a9-68e9-48c8-bddc-20935386b58d';

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    log.info('Expo Push Token başarıyla alındı:', tokenResponse.data);
    return tokenResponse.data;
  } catch (error) {
    log.error('Push token alınırken hata oluştu:', error);
    return null;
  }
}

/**
 * Kullanıcı bildirimin gerektiği bir eyleme bastığında (DM atarken, sabit ilan verirken vb.)
 * izin ister ve token'ı Supabase'e kaydeder.
 */
export async function requestNotificationPermissionAsync(
  userId?: string,
  language?: string
): Promise<boolean> {
  try {
    const userPref = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (userPref === 'false') {
      return false;
    }

    const token = await registerForPushNotificationsAsync({ requestIfMissing: true });
    if (token) {
      if (userId) {
        await savePushTokenToSupabase(userId, token, language);
      }
      return true;
    }
    return false;
  } catch (err) {
    log.error('requestNotificationPermissionAsync hata:', err);
    return false;
  }
}

/**
 * Alınan token'ı ve kullanıcının tercih ettiği dili profil tablosuna kaydeder.
 */
export async function savePushTokenToSupabase(
  userId: string,
  token: string,
  language?: string
): Promise<void> {
  try {
    const updatePayload: Record<string, unknown> = {
      push_token: token,
      push_token_platform: Platform.OS,
      push_token_updated_at: new Date().toISOString(),
    };

    if (language) {
      updatePayload.preferred_language = language;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload as any)
      .eq('id', userId);

    if (error) {
      log.error('Token veritabanına kaydedilemedi:', error.message);
    } else {
      log.info('Token ve dil tercihi Supabase profiline kaydedildi.');
    }
  } catch (err) {
    log.error('savePushTokenToSupabase beklenmedik hata:', err);
  }
}

/**
 * Kullanıcı çıkış yaptığında token'ı temizler.
 */
export async function clearPushTokenFromSupabase(userId: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({
        push_token: null,
        push_token_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (err) {
    log.error('clearPushTokenFromSupabase hata:', err);
  }
}

/**
 * Bildirim tıklandığında gelen veriye göre ilgili ekrana yönlendirir.
 */
export function handleNotificationNavigation(
  data: AppNotificationData | Record<string, unknown> | undefined,
  navigate: (route: { pathname: string; params?: Record<string, string> } | string) => void
): void {
  if (!data || typeof data !== 'object') return;

  const rawData = data as unknown as AppNotificationData;
  const type = rawData.type;

  switch (type) {
    case 'dm': {
      const dmData = rawData as AppNotificationData & { conversationId?: string; id?: string };
      const conversationId = dmData.conversationId || dmData.id;
      if (conversationId) {
        navigate({
          pathname: '/dm/[id]',
          params: { id: String(conversationId) },
        });
      }
      break;
    }

    case 'ban_appeal': {
      navigate('/banned');
      break;
    }

    case 'pin_expiry': {
      const pinData = rawData as AppNotificationData & { cityId?: number | string };
      if (pinData.cityId) {
        navigate({
          pathname: '/room/[cityId]',
          params: { cityId: String(pinData.cityId) },
        });
      } else {
        navigate('/');
      }
      break;
    }

    default:
      log.debug('Bilinmeyen bildirim türü:', type);
      break;
  }
}
