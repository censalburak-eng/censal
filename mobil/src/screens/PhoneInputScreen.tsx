import React, { useState } from 'react';
import { View, Text, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSocialAuth } from '../hooks/useAuth';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { mapAuthError, getLocalizedErrorMessage, AppErrorCode } from '@/lib/errors';
import { useI18n } from '@/i18n';
import { AppButton } from '@/components/ui/AppButton';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { LegalTermsModal, LegalTab } from '@/components/LegalTermsModal';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

type SocialProvider = 'apple' | 'google';

export const PhoneInputScreen: React.FC = () => {
  const [errorCode, setErrorCode] = useState<AppErrorCode | null>(null);
  const [activeProvider, setActiveProvider] = useState<SocialProvider | null>(null);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');
  const { colors, isDark } = useTheme();
  const socialAuthMutation = useSocialAuth();
  const { t } = useI18n();

  const TEST_EMAIL = 'asdkq@sehiroda.com';
  const TEST_PASSWORD = 'TestPassword123!';


  const signInAsTestUser = async () => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (!signInError) return;

    // Kullanıcı yoksa oluştur
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,

    });

    if (signUpError) throw signUpError;

    // E-posta onayı kapalıysa signUp zaten session döner
    if (!data.session) {
      const { error } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      if (error) throw error;
    }
  };

  const handleSocialLogin = async (provider: SocialProvider) => {
    try {
      setActiveProvider(provider);
      setErrorCode(null);

      if (provider !== 'google') {
        // Diğer sağlayıcılar (mock/test kullanıcı)
        await signInAsTestUser();
      }

      await socialAuthMutation.mutateAsync(provider);
    } catch (err: unknown) {
      const appError = mapAuthError(err);
      if (appError.code !== 'CANCELLED') {
        setErrorCode(appError.code);
      }
    } finally {
      setActiveProvider(null);
    }
  };

  const isBusy = socialAuthMutation.isPending || activeProvider !== null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <LanguageSwitcher />

      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: tokens.scale(tokens.spacing.lg),
          gap: tokens.verticalScale(tokens.spacing.xl),
        }}
      >
        {/* Logo & Marka Başlığı */}
        <View style={{ alignItems: 'center', gap: tokens.verticalScale(tokens.spacing.sm) }}>
          <Image
            source={require('../../assets/images/censal-logo.png')}
            style={{
              width: tokens.scale(80),
              height: tokens.scale(80),
              borderRadius: tokens.moderateScale(20),
            }}
            contentFit="cover"
          />

          <Text
            style={{
              color: colors.text,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.xxl),
              fontWeight: tokens.typography.fontWeight.heavy,
              letterSpacing: -0.5,
              marginTop: tokens.verticalScale(tokens.spacing.xs),
            }}
          >
            {t.auth.appName}
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
              textAlign: 'center',
              lineHeight: 22,
              paddingHorizontal: tokens.scale(tokens.spacing.md),
            }}
          >
            {t.auth.subtitle}
          </Text>
        </View>

        {/* Giriş Seçenekleri Kartı */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: tokens.moderateScale(tokens.radii.xl),
            padding: tokens.scale(tokens.spacing.lg),
            gap: tokens.verticalScale(tokens.spacing.md),
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <View style={{ gap: 4, marginBottom: tokens.verticalScale(tokens.spacing.xs) }}>
            <Text
              style={{
                color: colors.text,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.md),
                fontWeight: tokens.typography.fontWeight.bold,
                textAlign: 'center',
              }}
            >
              {t.auth.cardTitle}
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                textAlign: 'center',
              }}
            >
              {t.auth.cardSubtitle}
            </Text>
          </View>

          {/* Apple ile Giriş */}
          {(Platform.OS === 'ios' || Platform.OS === 'web') && (
            <AppButton
              label={t.auth.continueWithApple}
              icon="logo-apple"
              onPress={() => handleSocialLogin('apple')}
              disabled={isBusy}
              loading={activeProvider === 'apple'}
              fullWidth
              accessibilityLabel={t.auth.loginWithAppleA11y}
              size="lg"
            />
          )}

          {/* Google ile Giriş */}
          <AppButton
            label={t.auth.continueWithGoogle}
            icon="logo-google"
            onPress={() => handleSocialLogin('google')}
            disabled={isBusy}
            loading={activeProvider === 'google'}
            fullWidth
            accessibilityLabel={t.auth.loginWithGoogleA11y}
            size="lg"
          />

          {errorCode && (
            <View
              style={{
                backgroundColor: isDark ? '#7F1D1D33' : '#FEE2E2',
                borderRadius: tokens.radii.sm,
                padding: tokens.scale(tokens.spacing.sm),
                borderWidth: 1,
                borderColor: '#EF444455',
              }}
            >
              <Text
                style={{
                  color: colors.danger,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                  fontWeight: tokens.typography.fontWeight.medium,
                  textAlign: 'center',
                }}
              >
                {getLocalizedErrorMessage(errorCode, t)}
              </Text>
            </View>
          )}

          {/* Bilgilendirme ve Koşullar */}
          <Text
            style={{
              color: colors.muted,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
              textAlign: 'center',
              lineHeight: 18,
              marginTop: tokens.verticalScale(tokens.spacing.xs),
            }}
          >
            {t.auth.termsPrefix}{' '}
            <Text
              onPress={() => {
                setLegalModalTab('terms');
                setLegalModalVisible(true);
              }}
              style={{ color: colors.primaryText, fontWeight: tokens.typography.fontWeight.semibold, textDecorationLine: 'underline' }}
            >
              {t.auth.termsOfUse}
            </Text>{' '}
            {t.auth.and}{' '}
            <Text
              onPress={() => {
                setLegalModalTab('privacy');
                setLegalModalVisible(true);
              }}
              style={{ color: colors.primaryText, fontWeight: tokens.typography.fontWeight.semibold, textDecorationLine: 'underline' }}
            >
              {t.auth.privacyPolicy}
            </Text>
            {t.auth.termsSuffix}
          </Text>
        </View>

        {/* Alt Özellik Rozetleri */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: tokens.scale(tokens.spacing.lg),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(tokens.typography.fontSize.caption) }}>
              {t.auth.badgeVerified}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flash" size={16} color="#F59E0B" />
            <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(tokens.typography.fontSize.caption) }}>
              {t.auth.badgeInstant}
            </Text>
          </View>
        </View>
      </View>

      {/* Kullanım Koşulları & Gizlilik Politikası Modalı */}
      <LegalTermsModal
        visible={legalModalVisible}
        initialTab={legalModalTab}
        onClose={() => setLegalModalVisible(false)}
      />
    </SafeAreaView>
  );
};