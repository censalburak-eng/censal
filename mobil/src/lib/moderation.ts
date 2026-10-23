/**
 * Görsel İçerik Moderasyonu — Sightengine API
 *
 * TF.js / NSFWJS yerine Sightengine HTTP API kullanır.
 * Ücretsiz plan: 2000 görsel/ay
 * https://sightengine.com/docs/moderate-stored-images
 *
 * Kurulum: .env.local dosyasına ekle:
 *   EXPO_PUBLIC_SIGHTENGINE_USER=xxxxxxx
 *   EXPO_PUBLIC_SIGHTENGINE_SECRET=xxxxxxxxxxxxxxxx
 */

export type ModerationResult = {
  isSafe: boolean;
  reason?: string;
  details?: Record<string, number>;
};

const SIGHTENGINE_USER = process.env.EXPO_PUBLIC_SIGHTENGINE_USER ?? '';
const SIGHTENGINE_SECRET = process.env.EXPO_PUBLIC_SIGHTENGINE_SECRET ?? '';

/**
 * Görseli Sightengine API üzerinden denetler.
 * @param base64 Görselin base64 string'i (data URI prefixsiz veya prefix'li)
 */
export async function checkImageModeration(base64: string): Promise<ModerationResult> {
  // API key yoksa → bloklama modu (güvenli taraf)
  if (!SIGHTENGINE_USER || !SIGHTENGINE_SECRET) {
    console.warn('[Moderation] Sightengine API anahtarları bulunamadı. Yükleme engellendi.');
    return {
      isSafe: false,
      reason: 'Görsel güvenlik denetimi yapılandırılmamış. Lütfen sistem yöneticisiyle iletişime geçin.',
    };
  }

  try {
    console.log('[Moderation] Sightengine NSFW denetimine gönderiliyor...');

    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

    // Base64 → Blob (React Native FormData)
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('media', blob as any, 'image.jpg');
    formData.append('models', 'nudity,offensive,gore');
    formData.append('api_user', SIGHTENGINE_USER);
    formData.append('api_secret', SIGHTENGINE_SECRET);

    const response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Moderation] Sightengine HTTP hatası:', response.status, text);
      // API erişim sorunu → bloklama (güvenli taraf)
      return {
        isSafe: false,
        reason: 'Görsel denetim servisi şu an erişilemiyor. Lütfen tekrar deneyin.',
      };
    }

    const result = await response.json();
    console.log('[Moderation] Sightengine yanıtı:', JSON.stringify(result));

    return evaluateSightengineResult(result);
  } catch (err) {
    console.error('[Moderation] Denetim hatası:', err);
    // Hata durumunda → BLOKLAMA (önceki gibi geçirme!)
    return {
      isSafe: false,
      reason: 'Görsel güvenlik denetimi tamamlanamadı. Lütfen tekrar deneyin.',
    };
  }
}

/**
 * Sightengine yanıtını değerlendirip güvenlik kararı verir
 */
function evaluateSightengineResult(result: any): ModerationResult {
  // Hata yanıtı
  if (result.status === 'failure') {
    console.error('[Moderation] Sightengine API hatası:', result.error);
    return {
      isSafe: false,
      reason: 'Görsel denetimi sırasında bir sorun oluştu. Lütfen tekrar deneyin.',
    };
  }

  const nudity = result.nudity ?? {};
  const offensive = result.offensive ?? {};
  const gore = result.gore ?? {};

  // Çıplaklık tespiti
  const rawScore: number = nudity.raw ?? 0;
  const partialScore: number = nudity.partial ?? 0;

  if (rawScore > 0.5) {
    return {
      isSafe: false,
      reason: 'Bu görsel çıplaklık / pornografik içerik barındırdığı için yüklenemiyor.',
      details: { rawNudity: rawScore },
    };
  }

  if (partialScore > 0.7) {
    return {
      isSafe: false,
      reason: 'Bu görsel müstehcen içerik barındırdığı için topluluk kurallarına aykırıdır.',
      details: { partialNudity: partialScore },
    };
  }

  // Saldırgan içerik (ırkçı semboller vb.)
  const offensiveProb: number = offensive.prob ?? 0;
  if (offensiveProb > 0.8) {
    return {
      isSafe: false,
      reason: 'Bu görsel saldırgan veya nefret içerikli materyal barındırdığı için yüklenemiyor.',
      details: { offensive: offensiveProb },
    };
  }

  // Kan / şiddet içeriği
  const goreScore: number = gore.prob ?? 0;
  if (goreScore > 0.85) {
    return {
      isSafe: false,
      reason: 'Bu görsel şiddet / kan içeriği barındırdığı için yüklenemiyor.',
      details: { gore: goreScore },
    };
  }

  console.log('[Moderation] Görsel güvenli.', { rawScore, partialScore, offensiveProb, goreScore });
  return { isSafe: true };
}
