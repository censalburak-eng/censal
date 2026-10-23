import { Dimensions, PixelRatio, useWindowDimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Standart mobil referans tasarımı (iPhone X/11/13 tabanlı: 375 x 812)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Yatay orantılama (genişlik, yatay padding/margin için)
 */
export const scale = (size: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size);
};

/**
 * Dikey orantılama (yükseklik, dikey padding/margin için)
 */
export const verticalScale = (size: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / BASE_HEIGHT) * size);
};

/**
 * Dengeli orantılama (Font boyutları, border-radius ve ikonlar için idealdir)
 * factor = 0.5 varsayılanı, boyutu aşırı büyütüp küçültmeden ekranla orantılar.
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  return PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor);
};

/**
 * Yüzdelik genişlik (Örn: wp(90) -> ekran genişliğinin %90'ı)
 */
export const wp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percentage) / 100);
};

/**
 * Yüzdelik yükseklik (Örn: hp(50) -> ekran yüksekliğinin %50'si)
 */
export const hp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * percentage) / 100);
};

/**
 * Ekran değişimlerini (rotasyon, tablet split-view vs.) dinamik takip eden Responsive Hook
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isSmallDevice = width < 375;
  const isMediumDevice = width >= 375 && width < 414;
  const isLargeDevice = width >= 414 && width < 768;
  const isTablet = width >= 768;

  const s = (size: number) => PixelRatio.roundToNearestPixel((width / BASE_WIDTH) * size);
  const vs = (size: number) => PixelRatio.roundToNearestPixel((height / BASE_HEIGHT) * size);
  const ms = (size: number, factor = 0.5) => PixelRatio.roundToNearestPixel(size + (s(size) - size) * factor);

  const rWp = (percentage: number) => PixelRatio.roundToNearestPixel((width * percentage) / 100);
  const rHp = (percentage: number) => PixelRatio.roundToNearestPixel((height * percentage) / 100);

  return {
    width,
    height,
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    isTablet,
    scale: s,
    verticalScale: vs,
    moderateScale: ms,
    wp: rWp,
    hp: rHp,
  };
};
