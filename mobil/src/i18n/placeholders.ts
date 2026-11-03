import type { TranslationStructure } from './types';

/**
 * Mesaj gövdesi, yanıt önizlemesi ve son mesaj özetinde kullanılan sabit yer tutucular.
 * Bunlar veritabanına ve önbelleğe Türkçe olarak yazılıyor; ekranda gösterilirken
 * kullanıcının diline çevrilir. (Kaydedilen veri değişmediği için eski mesajlar da çevrilir.)
 */
const PLACEHOLDER_TRANSLATORS: Record<string, (t: TranslationStructure) => string> = {
  '📷 Fotoğraf': (t) => `📷 ${t.attach.photo}`,
  '🎤 Ses': (t) => `🎤 ${t.attach.voice}`,
  '📍 Konum': (t) => `📍 ${t.attach.location}`,
  Sen: (t) => t.directChat.you,
  'İleti': (t) => t.directChat.messageLabel,
};

export const localizeMessagePlaceholder = (
  text: string | null | undefined,
  t: TranslationStructure
): string => {
  if (!text) return text ?? '';
  const translate = PLACEHOLDER_TRANSLATORS[text];
  return translate ? translate(t) : text;
};
