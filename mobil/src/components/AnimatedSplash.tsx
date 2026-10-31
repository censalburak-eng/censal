import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';

// Native splash, JS animasyonu hazır olana kadar ekranda kalsın
SplashScreen.preventAutoHideAsync().catch(() => { });

const LOGO_SIZE = 120; // app.json -> expo-splash-screen imageWidth ile aynı olmalı
const MIN_DURATION_MS = 1600;

type AnimatedSplashProps = {
  /** Uygulama (auth/profil) hazır olduğunda true olur */
  isReady: boolean;
  /** Çıkış animasyonu bitince çağrılır */
  onFinish: () => void;
};

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ isReady, onFinish }) => {
  const { colors, isDark } = useTheme();
  const mountedAt = useRef(Date.now());
  const [minTimePassed, setMinTimePassed] = useState(false);

  const logoScale = useSharedValue(1);
  const logoRotate = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslate = useSharedValue(12);
  const containerOpacity = useSharedValue(1);

  // Giriş animasyonu
  const startIntro = () => {
    SplashScreen.hideAsync().catch(() => { });

    logoScale.value = withSequence(
      withTiming(0.88, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(1.08, { duration: 320, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 220 }),
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      )
    );
    logoRotate.value = withSequence(
      withTiming(-4, { duration: 220 }),
      withTiming(0, { duration: 420, easing: Easing.out(Easing.back(3)) })
    );

    ringOpacity.value = withDelay(
      450,
      withRepeat(
        withSequence(withTiming(0.55, { duration: 0 }), withTiming(0, { duration: 1400 })),
        -1
      )
    );
    ringScale.value = withDelay(
      450,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.9, { duration: 1400, easing: Easing.out(Easing.cubic) })
        ),
        -1
      )
    );

    textOpacity.value = withDelay(500, withTiming(1, { duration: 450 }));
    textTranslate.value = withDelay(500, withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }));
  };

  useEffect(() => {
    const t = setTimeout(
      () => setMinTimePassed(true),
      Math.max(0, MIN_DURATION_MS - (Date.now() - mountedAt.current))
    );
    return () => clearTimeout(t);
  }, []);

  // Çıkış animasyonu
  useEffect(() => {
    if (!isReady || !minTimePassed) return;
    logoScale.value = withTiming(1.35, { duration: 380, easing: Easing.in(Easing.cubic) });
    containerOpacity.value = withTiming(0, { duration: 380 });
    const t = setTimeout(onFinish, 400);
    return () => clearTimeout(t);
  }, [isReady, minTimePassed]); // eslint-disable-line react-hooks/exhaustive-deps

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }, { rotate: `${logoRotate.value}deg` }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslate.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: colors.bg }, containerStyle]}
      onLayout={startIntro}
    >
      <View style={styles.center}>
        <Animated.View style={[styles.ring, { borderColor: colors.primary }, ringStyle]} />
        <Animated.View style={logoStyle}>
          <Image
            source={require('../../assets/images/censal-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.textWrap, textStyle]}>
        <Text style={[styles.title, { color: colors.text }]}>Censal</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Şehrinin iş ve ticaret odası</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  center: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 2,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 28,
  },
  textWrap: {
    position: 'absolute',
    bottom: '22%',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
  },
});

