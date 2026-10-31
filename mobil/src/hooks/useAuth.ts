import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { signOut as authSignOut, signInWithSocialMock, signInWithGoogleOAuth, signInWithEmail, signUpWithEmail } from '../api/authApi';
import { profileKeys } from './useProfile';
import { getProfile } from '../api/profileApi';
import { subscriptionKeys, getActiveSubscription } from '../api/subscriptionApi';
import { fetchAppSettings } from '../api/settingsApi';

export const authKeys = {
  all: ['auth'] as const,
  session: ['auth', 'session'] as const,
  user: ['auth', 'user'] as const,
};

let cachedUser: User | null = null;
let cachedSession: Session | null = null;
let isAuthInitialized = false;
const listeners = new Set<(session: Session | null) => void>();

const validateAndSetSession = async (session: Session | null) => {
  if (session) {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.warn('[useAuth] Yerel oturum geçersiz veya kullanıcı DB\'den silinmiş (zombie session). Temizleniyor:', userError?.message);
        await supabase.auth.signOut();
        cachedSession = null;
        cachedUser = null;
        isAuthInitialized = true;
        listeners.forEach((fn) => fn(null));
        return;
      }
      cachedSession = session;
      cachedUser = userData.user;
    } catch (err) {
      console.warn('[useAuth] getUser kontrol hatası:', err);
      cachedSession = session;
      cachedUser = session.user;
    }
  } else {
    cachedSession = null;
    cachedUser = null;
  }
  isAuthInitialized = true;
  listeners.forEach((fn) => fn(cachedSession));
};

supabase.auth.getSession().then(({ data: { session } }) => {
  validateAndSetSession(session);
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    cachedSession = null;
    cachedUser = null;
    isAuthInitialized = true;
    listeners.forEach((fn) => fn(null));
    return;
  }
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
    validateAndSetSession(session);
  }
});

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [session, setSession] = useState<Session | null>(cachedSession);
  const [isLoading, setIsLoading] = useState(!isAuthInitialized);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleSession = (currentSession: Session | null) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);

      // Session çözüldüğü milisaniyede profile, subscription ve app_settings'i paralel başlat
      queryClient.prefetchQuery({
        queryKey: ['app_settings'],
        queryFn: fetchAppSettings,
        staleTime: 5 * 60 * 1000,
      });

      if (currentSession?.user?.id) {
        const uid = currentSession.user.id;
        queryClient.prefetchQuery({
          queryKey: profileKeys.detail(uid),
          queryFn: () => getProfile(uid),
          staleTime: 60_000,
        });
        queryClient.prefetchQuery({
          queryKey: subscriptionKeys.detail(uid),
          queryFn: () => getActiveSubscription(uid),
          staleTime: 5 * 60_000,
        });
      }
    };

    if (isAuthInitialized) {
      handleSession(cachedSession);
    }

    listeners.add(handleSession);
    return () => {
      listeners.delete(handleSession);
    };
  }, [queryClient]);

  const signOut = async () => {
    await authSignOut();
    cachedUser = null;
    cachedSession = null;
    setUser(null);
    setSession(null);
    listeners.forEach((fn) => fn(null));
  };

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signOut,
  };
};

export const useSocialAuth = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (provider: 'apple' | 'google') => {
      if (provider === 'google') {
        return await signInWithGoogleOAuth();
      }
      return await signInWithSocialMock(provider);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

export const useEmailSignIn = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return await signInWithEmail(email, password);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

export const useEmailSignUp = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return await signUpWithEmail(email, password);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};
