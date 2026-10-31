import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  savePushTokenToSupabase,
  handleNotificationNavigation,
} from '../lib/notifications';
import { logger } from '../lib/logger';
import { useI18n } from '../i18n';
import type { AppNotificationData } from '../types/notifications.types';

const log = logger.scope('useNotifications');

export function useNotifications(userId?: string | null) {
  const router = useRouter();
  const { language } = useI18n();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // 1) Push Token Kaydı
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    async function setupToken() {
      try {
        // Açılışta popup çıkarmadan sadece önceden izin verilmişse sessizce kaydeder
        const token = await registerForPushNotificationsAsync({ requestIfMissing: false });
        if (token && isMounted && userId) {
          await savePushTokenToSupabase(userId, token, language);
        }
      } catch (err) {
        log.error('Token alma hatası:', err);
      }
    }

    setupToken();

    return () => {
      isMounted = false;
    };
  }, [userId, language]);

  // 2) Uygulama kapalıyken bildirime tıklanarak açıldıysa kontrol et
  useEffect(() => {
    let isMounted = true;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response) return;
      const data = response.notification.request.content.data as unknown as AppNotificationData;
      log.info('Uygulama bildirimle açıldı:', data);
      handleNotificationNavigation(data, (target) => {
        router.push(target as any);
      });
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  // 3) Bildirim dinleyicileri (Foreground & Tıklama)
  useEffect(() => {
    // Uygulama açıkken gelen bildirim
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      log.debug('Foreground bildirim geldi:', notification.request.content.title);
    });

    // Kullanıcı bildirime tıkladığında
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as unknown as AppNotificationData;
      log.info('Bildirime tıklandı:', data);
      handleNotificationNavigation(data, (target) => {
        router.push(target as any);
      });
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);
}
