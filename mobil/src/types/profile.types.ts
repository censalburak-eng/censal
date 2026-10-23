export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  city_id: number;
  avatar_url?: string | null;
  hide_phone: boolean;
  phone?: string | null;
  role?: 'user' | 'admin';
  is_banned?: boolean;
  banned_at?: string | null;
  banned_reason?: string | null;
  blocked_count?: number; // Kullanıcının engellediği kişi sayısı
  conversations_count?: number; // Aktif özel sohbet sayısı
  unread_messages_count?: number; // Okunmamış DM sayısı
  created_at?: string;
  // UI kolaylığı için alias alanlar
  ad: string;
  soyad: string;
  sehir: string;
  plate_code?: string;
  numara_gizli: boolean;
  foto_url?: string | null;
};

export type PublicProfile = {
  id: string;
  first_name: string;
  last_name: string;
  city_id: number;
  avatar_url?: string | null;
  phone?: string | null;
  hide_phone?: boolean;
  role?: string;
  created_at?: string;
  plate_code?: string;
};

export type CreateProfileInput = {
  first_name?: string;
  last_name?: string;
  city_id?: number;
  avatar_url?: string | null;
  hide_phone?: boolean;
  phone?: string | null;
  role?: 'user' | 'admin';
  ad?: string;
  soyad?: string;
  sehir?: string;
  numara_gizli?: boolean;
  foto_url?: string | null;
};

export type UpdateProfileInput = Partial<CreateProfileInput>;
