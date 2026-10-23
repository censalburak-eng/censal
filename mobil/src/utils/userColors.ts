// WhatsApp / Telegram tarzı tutarlı ve estetik kullanıcı renkleri
// Her kullanıcı id veya ismine göre hep aynı rengi alır

const LIGHT_USER_COLORS = [
  '#E11D48', // Gül Kırmızısı
  '#D97706', // Kehribar
  '#059669', // Zümrüt Yeşili
  '#0284C7', // Canlı Mavi
  '#7C3AED', // Menekşe Moru
  '#DB2777', // Pembe
  '#2563EB', // İndigo Mavi
  '#0D9488', // Deniz Mavisi / Teal
  '#C2410C', // Turuncu
  '#9333EA', // Canlı Mor
  '#15803D', // Koyu Yeşil
  '#A21CAF', // Fuşya
];

const DARK_USER_COLORS = [
  '#FB7185', // Gül Kırmızısı (Açık)
  '#FBBF24', // Kehribar (Açık)
  '#34D399', // Zümrüt Yeşili (Açık)
  '#38BDF8', // Canlı Mavi (Açık)
  '#A78BFA', // Menekşe Moru (Açık)
  '#F472B6', // Pembe (Açık)
  '#60A5FA', // İndigo Mavi (Açık)
  '#2DD4BF', // Teal (Açık)
  '#FB923C', // Turuncu (Açık)
  '#C084FC', // Mor (Açık)
  '#4ADE80', // Açık Yeşil
  '#E879F9', // Fuşya (Açık)
];

export function getUserColor(idOrName?: string | null, isDark = false): string {
  if (!idOrName) {
    return isDark ? '#38BDF8' : '#0284C7';
  }

  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash * 31 + idOrName.charCodeAt(i)) | 0;
  }

  const colors = isDark ? DARK_USER_COLORS : LIGHT_USER_COLORS;
  const index = Math.abs(hash) % colors.length;
  return colors[index] ?? (isDark ? '#38BDF8' : '#0284C7');
}
