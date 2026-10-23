import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { getProfile } from '../../api/profileApi';
import { useTheme } from '../../theme';

export default function AuthCallback() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const params = useLocalSearchParams();

  useEffect(() => {
    let isCancelled = false;

    const resolveAuthAndNavigate = async () => {
      try {
        let currentUserId = user?.id;

        if (!currentUserId) {
          const code = params.code as string | undefined;
          if (code) {
            const { data } = await supabase.auth.exchangeCodeForSession(code).catch(() => ({ data: null }));
            currentUserId = data?.user?.id;
          }
          if (!currentUserId) {
            const { data: { session } } = await supabase.auth.getSession();
            currentUserId = session?.user?.id;
          }
        }

        if (!currentUserId) {
          if (!isCancelled) router.replace('/(auth)/phone');
          return;
        }

        const profile = await getProfile(currentUserId).catch(() => null);

        if (!isCancelled) {
          if (!profile || !profile.first_name || !profile.city_id) {
            router.replace('/(auth)/complete-profile');
          } else {
            router.replace('/');
          }
        }
      } catch (err) {
        console.warn('[AuthCallback] Yönlendirme hatası:', err);
        if (!isCancelled) router.replace('/(auth)/complete-profile');
      }
    };

    resolveAuthAndNavigate();

    return () => {
      isCancelled = true;
    };
  }, [user, params, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
