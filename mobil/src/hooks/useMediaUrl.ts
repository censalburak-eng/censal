import { useQuery } from '@tanstack/react-query';
import { getDirectMessageMediaUrl, isRemoteMediaUrl } from '../api/storageApi';

/**
 * Mesajdaki medya değerini gösterilebilir bir URL'e çevirir.
 * - Tam URL ise (eski DM mesajları, oda medyası) olduğu gibi döner.
 * - Private `dm-media` yolu ise imzalı URL üretir ve süresi dolmadan önbellekte tutar.
 */
export const useMediaUrl = (mediaValue?: string | null): string | null => {
  const isPrivatePath = !!mediaValue && !isRemoteMediaUrl(mediaValue);

  const { data } = useQuery({
    queryKey: ['dm_media_url', mediaValue],
    queryFn: () => getDirectMessageMediaUrl(mediaValue as string),
    enabled: isPrivatePath,
    // İmzalı URL 1 saat geçerli; süre dolmadan yenilenir
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
  });

  if (!mediaValue) return null;
  return isPrivatePath ? data ?? null : mediaValue;
};
