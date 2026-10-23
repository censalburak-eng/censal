import { supabase } from '../lib/supabase';
import { UserSubscription, SubscriptionPlan } from '../types/settings.types';
import { mapDatabaseError } from '../lib/errors';

export const subscriptionKeys = {
  all: ['entitlement', 'subscription'] as const,
  detail: (userId?: string) => ['entitlement', 'subscription', userId ?? 'anonymous'] as const,
};

export const getActiveSubscription = async (userId?: string): Promise<UserSubscription | null> => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan, source, status, expires_at, created_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  return data as UserSubscription | null;
};

export const createMockSubscription = async (
  userId: string,
  plan: SubscriptionPlan = 'monthly'
): Promise<UserSubscription> => {
  const durationDays = plan === 'yearly' ? 365 : 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan,
      source: 'mock',
      status: 'active',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw mapDatabaseError(error);
  }

  return data as UserSubscription;
};
