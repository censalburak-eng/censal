import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { mapAuthError, AppError } from '../lib/errors';
import { clearPushTokenFromSupabase } from '../lib/notifications';
import { logoutRevenueCatUser } from '../lib/purchases';

WebBrowser.maybeCompleteAuthSession();


export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return data.user;
};

export const signOut = async (): Promise<void> => {
  // Oturum hâlâ geçerliyken bu cihazı önceki kullanıcıdan ayır:
  // push token silinmezse aynı telefonda giriş yapan bir sonraki kişi, öncekinin bildirimlerini alır
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) {
    await clearPushTokenFromSupabase(session.user.id);
  }
  await logoutRevenueCatUser();

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw mapAuthError(error);
  }
};

export const signInWithGoogleOAuth = async (): Promise<{ user: unknown; session: unknown }> => {
  const redirectUrl = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    throw mapAuthError(error || new Error('Google OAuth başlatılamadı'));
  }

  const authResponse = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (authResponse.type === 'cancel' || authResponse.type === 'dismiss') {
    throw new AppError('CANCELLED', 'Giriş işlemi iptal edildi');
  }

  if (authResponse.type === 'success' && authResponse.url) {
    const parsed = Linking.parse(authResponse.url);

    // 1) PKCE akışı (?code=...)
    const code = parsed.queryParams?.code as string | undefined;
    if (code) {
      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw mapAuthError(exchangeError);
      return {
        user: exchangeData.user,
        session: exchangeData.session,
      };
    }

    // 2) Implicit akışı (#access_token=...&refresh_token=...)
    let accessToken: string | undefined = parsed.queryParams?.access_token as string | undefined;
    let refreshToken: string | undefined = parsed.queryParams?.refresh_token as string | undefined;

    if (!accessToken && authResponse.url.includes('#')) {
      const hashPart = authResponse.url.split('#')[1];
      const params = new URLSearchParams(hashPart);
      accessToken = params.get('access_token') || undefined;
      refreshToken = params.get('refresh_token') || undefined;
    }

    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) throw mapAuthError(sessionError);

      return {
        user: sessionData.user,
        session: sessionData.session,
      };
    }

    throw new AppError('UNKNOWN', 'Oturum bilgileri doğrulanamadı');
  }

  throw new AppError('UNKNOWN', 'Google ile giriş tamamlanamadı');
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<{ user: unknown; session: unknown }> => {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw mapAuthError(error);
  }

  return {
    user: data.user,
    session: data.session,
  };
};

export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<{ user: unknown; session: unknown }> => {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw mapAuthError(error);
  }

  if (!data.session && data.user) {
    try {
      const loginRes = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (loginRes.data.session) {
        return {
          user: loginRes.data.user,
          session: loginRes.data.session,
        };
      }
    } catch {
      // noop
    }
  }

  return {
    user: data.user,
    session: data.session,
  };
};
