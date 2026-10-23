import { Buffer } from 'buffer';
import { supabase } from '../lib/supabase';
// import { checkImageModeration } from '../lib/moderation';

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
 * (Moderasyon kontrolü dev build/kurulum tamamlanana kadar geçici olarak devre dışı bırakıldı)
 */
export async function uploadModeratedImage({
  bucket,
  base64,
  fileExtension = 'jpg',
  prefix,
}: UploadImageOptions): Promise<UploadResult> {
  // 1. Görsel Moderasyonu (Şimdilik devre dışı, dev build sonrası aktif edilecek)
  /*
  console.log(`[Storage] Görsel ${bucket} için NSFW denetimine gönderiliyor...`);
  const moderation = await checkImageModeration(base64);

  if (!moderation.isSafe) {
    console.warn('[Storage] Görsel güvenlik denetiminden geçemedi:', moderation.reason);
    throw new Error(moderation.reason || 'Yüklenen görsel topluluk kurallarına aykırıdır.');
  }
  */

  console.log('[Storage] Görsel yükleniyor...');

  // 2. Kullanıcı oturumu kontrolü (getSession() yerel bellekten okur, ekstra HTTP isteği atmaz)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id ?? 'anonymous';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const cleanPrefix = prefix ? `${prefix}_` : '';
  const fileName = `${userId}/${cleanPrefix}${timestamp}_${randomStr}.${fileExtension}`;

  // 3. Base64'ten Buffer oluştur
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const fileBuffer = Buffer.from(cleanBase64, 'base64');

  // 4. Supabase Storage'a yükle
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, fileBuffer, {
    contentType: fileExtension === 'png' ? 'image/png' : 'image/jpeg',
    upsert: true,
  });

  if (error) {
    console.error('[Storage] Yükleme hatası:', error.message);
    throw new Error('Görsel sunucuya yüklenemedi: ' + error.message);
  }

  // 5. Public URL al
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
 * Profil fotoğrafı yükler (NSFW denetimli)
 */
export async function uploadAvatarImage(base64: string): Promise<string> {
  const result = await uploadModeratedImage({
    bucket: 'avatars',
    base64,
    prefix: 'avatar',
  });
  return result.url;
}

/**
 * Sohbet görseli yükler (NSFW denetimli)
 */
export async function uploadChatImage(base64: string): Promise<string> {
  const result = await uploadModeratedImage({
    bucket: 'chat-media',
    base64,
    prefix: 'chat',
  });
  return result.url;
}
