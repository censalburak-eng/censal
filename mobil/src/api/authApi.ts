import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { mapAuthError, AppError } from '../lib/errors';

WebBrowser.maybeCompleteAuthSession();

export const sendPhoneOtp = async (phone: string): Promise<void> => {
  const cleanedDigits = phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanedDigits.startsWith('90')
    ? `+${cleanedDigits}`
    : `+90${cleanedDigits}`;

  const { error } = await supabase.auth.signInWithOtp({
    phone: formattedPhone,
  });

  if (error) {
    throw mapAuthError(error);
  }
};

export const verifyPhoneOtp = async (
  phone: string,
  token: string
): Promise<{ user: unknown; session: unknown }> => {
  const cleanedDigits = phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanedDigits.startsWith('90')
    ? `+${cleanedDigits}`
    : `+90${cleanedDigits}`;

  const { data, error } = await supabase.auth.verifyOtp({
    phone: formattedPhone,
    token,
    type: 'sms',
  });

  if (error) {
    throw mapAuthError(error);
  }

  return {
    user: data.user,
    session: data.session,
  };
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return data.user;
};

export const signOut = async (): Promise<void> => {
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

export const signInWithSocialMock = async (
  provider: 'apple' | 'google'
): Promise<{ user: unknown; session: unknown }> => {
  const email = provider === 'apple' ? 'apple.demo.user@gmail.com' : 'google.demo.user@gmail.com';
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: 'Password123!',
  });

  if (error) {
    throw mapAuthError(error);
  }

  return {
    user: data.user,
    session: data.session,
  };
};
