import { supabase } from '../lib/supabase';
import { mapAuthError } from '../lib/errors';

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
