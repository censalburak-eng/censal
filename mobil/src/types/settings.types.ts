export type AppSettings = {
  id: number;
  free_mode: boolean;
  price_monthly: string;
  price_yearly: string;
  price_pin_24h: string;
};

export type SubscriptionPlan = 'monthly' | 'yearly';

export type UserSubscription = {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  source: string;
  status: string;
  expires_at: string;
  created_at: string;
};
