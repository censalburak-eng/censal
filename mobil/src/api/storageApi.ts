import { Buffer } from 'buffer';
import { supabase } from '../lib/supabase';

export type UploadImageOptions = {
  bucket: 'avatars' | 'chat-media';
  base64: string;
  fileExtension?: string;
  prefix?: string;
};

export type UploadResult = {
  url: string;
  path: string;
};

/**
 * Görseli Supabase Storage'a yükler.
 */
export async function uploadImage({
  bucket,
  base64,
  fileExtension = 'jpg',
  prefix,
}: UploadImageOptions): Promise<UploadResult> {
  console.log('[Storage] Görsel yükleniyor...');

  // 1. Kullanıcı oturumu kontrolü (getSession() yerel bellekten okur, ekstra HTTP isteği atmaz)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id ?? 'anonymous';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const cleanPrefix = prefix ? `${prefix}_` : '';
  const fileName = `${userId}/${cleanPrefix}${timestamp}_${randomStr}.${fileExtension}`;

  // 2. Base64'ten Buffer oluştur
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const fileBuffer = Buffer.from(cleanBase64, 'base64');

  // 3. Supabase Storage'a yükle
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, fileBuffer, {
    contentType: fileExtension === 'png' ? 'image/png' : 'image/jpeg',
    upsert: true,
  });

  if (error) {
    console.error('[Storage] Yükleme hatası:', error.message);
    throw new Error('Görsel sunucuya yüklenemedi: ' + error.message);
  }

  // 4. Public URL al
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  console.log('[Storage] Yükleme tamamlandı. Public URL:', publicUrl);

  return {
    url: publicUrl,
    path: data.path,
  };
}

/**
 * Profil fotoğrafı yükler
 */
export async function uploadAvatarImage(base64: string): Promise<string> {
  const result = await uploadImage({
    bucket: 'avatars',
    base64,
    prefix: 'avatar',
  });
  return result.url;
}

/**
 * Sohbet görseli yükler
 */
export async function uploadChatImage(base64: string): Promise<string> {
  const result = await uploadImage({
    bucket: 'chat-media',
    base64,
    prefix: 'chat',
  });
  return result.url;
}
