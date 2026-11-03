import { Buffer } from 'buffer';
import { supabase } from '../lib/supabase';
import { AppError } from '../lib/errors';

/** DM medyası için özel (private) bucket. Dosyalar yalnızca imzalı URL ile okunabilir. */
export const DM_MEDIA_BUCKET = 'dm-media';

/** DM imzalı URL geçerlilik süresi (saniye) */
const DM_SIGNED_URL_TTL_SEC = 60 * 60;

/**
 * Medyanın nereye yükleneceği:
 * - room: herkese açık oda sohbeti → public `chat-media` bucket, mesajda public URL saklanır
 * - dm: özel mesaj → private `dm-media` bucket, mesajda yalnızca dosya yolu saklanır
 */
export type MediaUploadTarget = { kind: 'room' } | { kind: 'dm'; conversationId: string };

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

/** Mesajdaki medya değeri tam URL mi (eski mesajlar / oda medyası) yoksa private bucket yolu mu? */
export const isRemoteMediaUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const createRandomId = (): string =>
  `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

const getCurrentUserId = async (): Promise<string> => {
  // getSession() yerel bellekten okur, ekstra HTTP isteği atmaz
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;
  if (!userId) {
    throw new AppError('UNAUTHORIZED', 'Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  }
  return userId;
};

const base64ToBuffer = (base64: string): Buffer =>
  Buffer.from(base64.replace(/^data:\w+\/[\w.+-]+;base64,/, ''), 'base64');

/**
 * Görseli herkese açık bir bucket'a (avatars / chat-media) yükler.
 */
export async function uploadImage({
  bucket,
  base64,
  fileExtension = 'jpg',
  prefix,
}: UploadImageOptions): Promise<UploadResult> {
  console.log('[Storage] Görsel yükleniyor...');

  // 1. Kullanıcı oturumu kontrolü (oturum yoksa yükleme yapılmaz)
  const userId = await getCurrentUserId();
  const cleanPrefix = prefix ? `${prefix}_` : '';
  const fileName = `${userId}/${cleanPrefix}${createRandomId()}.${fileExtension}`;

  // 2. Supabase Storage'a yükle (mevcut dosyanın üzerine yazılmaz)
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, base64ToBuffer(base64), {
    contentType: fileExtension === 'png' ? 'image/png' : 'image/jpeg',
    upsert: false,
  });

  if (error) {
    console.error('[Storage] Yükleme hatası:', error.message);
    // UNKNOWN: ekran kendi çevrilmiş "yüklenemedi" metnini gösterir
    throw new AppError('UNKNOWN', 'Görsel sunucuya yüklenemedi: ' + error.message, error);
  }

  // 3. Public URL al
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  console.log('[Storage] Yükleme tamamlandı.');

  return {
    url: publicUrl,
    path: data.path,
  };
}

/**
 * DM medyasını private `dm-media` bucket'a yükler ve dosya yolunu döner.
 * Yol `{conversationId}/...` ile başlar; storage policy'leri konuşmanın iki katılımcısına izin verir.
 */
async function uploadDirectMessageMedia(
  conversationId: string,
  base64: string,
  fileExtension: string,
  contentType: string
): Promise<string> {
  await getCurrentUserId();
  const path = `${conversationId}/${createRandomId()}.${fileExtension}`;

  const { data, error } = await supabase.storage
    .from(DM_MEDIA_BUCKET)
    .upload(path, base64ToBuffer(base64), { contentType, upsert: false });

  if (error) {
    console.error('[Storage] DM medya yükleme hatası:', error.message);
    throw new AppError('UNKNOWN', 'Dosya sunucuya yüklenemedi: ' + error.message, error);
  }

  return data.path;
}

/**
 * Private DM medyası için süreli imzalı URL üretir.
 */
export async function getDirectMessageMediaUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DM_MEDIA_BUCKET)
    .createSignedUrl(path, DM_SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    throw new AppError('UNKNOWN', error?.message ?? 'Medya bağlantısı oluşturulamadı.', error);
  }
  return data.signedUrl;
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
 * Sohbet görseli yükler.
 * Oda için public URL, DM için private bucket dosya yolu döner (mesajın media_key alanına yazılır).
 */
export async function uploadChatImage(
  base64: string,
  target: MediaUploadTarget = { kind: 'room' }
): Promise<string> {
  if (target.kind === 'dm') {
    return uploadDirectMessageMedia(target.conversationId, base64, 'jpg', 'image/jpeg');
  }

  const result = await uploadImage({
    bucket: 'chat-media',
    base64,
    prefix: 'chat',
  });
  return result.url;
}

/**
 * Sesli mesaj yükler.
 * Oda için public URL, DM için private bucket dosya yolu döner.
 */
export async function uploadVoiceMessage(
  base64: string,
  target: MediaUploadTarget = { kind: 'room' }
): Promise<string> {
  if (target.kind === 'dm') {
    return uploadDirectMessageMedia(target.conversationId, base64, 'm4a', 'audio/m4a');
  }

  const userId = await getCurrentUserId();
  const { data, error } = await supabase.storage
    .from('chat-media')
    .upload(`${userId}/voice_${createRandomId()}.m4a`, base64ToBuffer(base64), {
      contentType: 'audio/m4a',
      upsert: false,
    });

  if (error) throw new AppError('UNKNOWN', error.message, error);

  const {
    data: { publicUrl },
  } = supabase.storage.from('chat-media').getPublicUrl(data.path);
  return publicUrl;
}
