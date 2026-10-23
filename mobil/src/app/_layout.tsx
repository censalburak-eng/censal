import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { ThemeProvider, useTheme } from '../theme';
import { I18nProvider } from '../i18n';
import { usePresenceConnection } from '../hooks/usePresence';

function AuthNavigationGate() {
  const { user, isAuthenticated, isLoading } = useAuth();
  usePresenceConnection(user?.id);
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  const { data: profile, isLoading: isProfileLoading } = useProfile(user?.id);

  const hasProfile = !!profile;
  const isChecking = isLoading || (isAuthenticated && isProfileLoading);

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setHidden(false);
        NavigationBar.setStyle(isDark ? 'light' : 'dark');
      } catch (err) {
        console.warn('[NavigationBar] update error:', err);
      }
    }
  }, [isDark]);

  useEffect(() => {
    if (isChecking) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isCompleteProfile = inAuthGroup && segments[1] === 'complete-profile';

    // 1) Giriş yok → login
    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/phone');
      return;
    }

    // 2) Giriş var ama profil yok → complete-profile
    if (!hasProfile) {
      if (!isCompleteProfile) router.replace('/(auth)/complete-profile');
      return;
    }

    // 3) Kullanıcı banlandıysa → /banned ekranına yönlendir
    const isBannedRoute = segments[0] === 'banned';
    if (profile?.is_banned) {
      if (!isBannedRoute) router.replace('/banned');
      return;
    }

    // 4) Banlı değilse ama banned ekranındaysa anasayfaya dön
    if (isBannedRoute && !profile?.is_banned) {
      router.replace('/');
      return;
    }

    // 5) Giriş var, profil var, banlı değil → anasayfa
    if (inAuthGroup && !isCompleteProfile) router.replace('/');
  }, [isChecking, isAuthenticated, hasProfile, profile?.is_banned, router, segments]);

  if (isChecking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      {Platform.OS === 'android' && (
        <NavigationBar style={isDark ? 'light' : 'dark'} hidden={false} />
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
          navigationBarHidden: false,
          navigationBarColor: colors.bg,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="banned" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen
          name="paywall"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <I18nProvider>
            <AuthNavigationGate />
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}