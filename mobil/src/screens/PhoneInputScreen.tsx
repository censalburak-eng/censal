import React, { useState } from 'react';
import {
  View,
  Text,
  Platform,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSocialAuth, useEmailSignIn, useEmailSignUp } from '../hooks/useAuth';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { mapAuthError, getLocalizedErrorMessage, AppErrorCode } from '@/lib/errors';
import { useI18n } from '@/i18n';
import { AppButton } from '@/components/ui/AppButton';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { LegalTermsModal, LegalTab } from '@/components/LegalTermsModal';
import { SupportContactModal } from '@/components/SupportContactModal';

type AuthMode = 'login' | 'register';

export const PhoneInputScreen: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();

  const socialAuthMutation = useSocialAuth();
  const emailSignInMutation = useEmailSignIn();
  const emailSignUpMutation = useEmailSignUp();

  // E-posta ile giriş / kayıt sadece iOS'ta görünür
  const showEmailAuth = Platform.OS === 'ios';

  const isBusy =
    socialAuthMutation.isPending ||
    emailSignInMutation.isPending ||
    emailSignUpMutation.isPending;

  const handleEmailAuth = async () => {
    setErrorMessage(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage(t.auth.enterValidEmail);
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage(t.auth.enterValidPassword);
      return;
    }

    try {
      if (authMode === 'login') {
        await emailSignInMutation.mutateAsync({ email: cleanEmail, password });
      } else {
        await emailSignUpMutation.mutateAsync({ email: cleanEmail, password });
      }
    } catch (err: unknown) {
      const appErr = mapAuthError(err);
      setErrorMessage(getLocalizedErrorMessage(appErr.code, t));
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage(null);
      await socialAuthMutation.mutateAsync();
    } catch (err: unknown) {
      const appError = mapAuthError(err);
      if (appError.code !== 'CANCELLED') {
        setErrorMessage(getLocalizedErrorMessage(appError.code, t));
      }
    }
  };

  const rowDirection = isRTL ? 'row-reverse' : 'row';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right', 'bottom']}>
      <LanguageSwitcher />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: tokens.scale(tokens.spacing.lg),
            paddingVertical: tokens.verticalScale(tokens.spacing.md),
            gap: tokens.verticalScale(tokens.spacing.lg),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Marka Başlığı */}
          <View style={{ alignItems: 'center', gap: tokens.verticalScale(tokens.spacing.xs) }}>
            <Image
              source={require('../../assets/images/censal-logo.png')}
              style={{
                width: tokens.scale(72),
                height: tokens.scale(72),
                borderRadius: tokens.moderateScale(18),
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
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                textAlign: 'center',
                lineHeight: 20,
                paddingHorizontal: tokens.scale(tokens.spacing.md),
              }}
            >
              {t.auth.subtitle}
            </Text>
          </View>

          {/* Giriş / Kayıt Kartı */}
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
            {/* Android: sadece Google girişi başlığı */}
            {!showEmailAuth && (
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
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
            )}

            {showEmailAuth && (
              <>
                {/* Sekme Değiştirici: Giriş Yap / Kayıt Ol */}
                <View
                  style={{
                    flexDirection: rowDirection,
                    backgroundColor: colors.bg,
                    borderRadius: tokens.radii.md,
                    padding: 4,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Pressable
                    onPress={() => {
                      setAuthMode('login');
                      setErrorMessage(null);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: tokens.verticalScale(8),
                      borderRadius: tokens.radii.sm,
                      backgroundColor: authMode === 'login' ? colors.surface : 'transparent',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: authMode === 'login' ? 0.1 : 0,
                      shadowRadius: 2,
                      elevation: authMode === 'login' ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                        fontWeight: authMode === 'login' ? tokens.typography.fontWeight.bold : tokens.typography.fontWeight.medium,
                        color: authMode === 'login' ? colors.primaryText : colors.muted,
                      }}
                    >
                      {t.auth.loginTab}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setAuthMode('register');
                      setErrorMessage(null);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: tokens.verticalScale(8),
                      borderRadius: tokens.radii.sm,
                      backgroundColor: authMode === 'register' ? colors.surface : 'transparent',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: authMode === 'register' ? 0.1 : 0,
                      shadowRadius: 2,
                      elevation: authMode === 'register' ? 2 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                        fontWeight: authMode === 'register' ? tokens.typography.fontWeight.bold : tokens.typography.fontWeight.medium,
                        color: authMode === 'register' ? colors.primaryText : colors.muted,
                      }}
                    >
                      {t.auth.registerTab}
                    </Text>
                  </Pressable>
                </View>

                {/* E-posta Alanı */}
                <View style={{ gap: 6 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                      fontWeight: tokens.typography.fontWeight.semibold,
                    }}
                  >
                    {t.auth.email}
                  </Text>
                  <View
                    style={{
                      flexDirection: rowDirection,
                      alignItems: 'center',
                      backgroundColor: colors.bg,
                      borderRadius: tokens.radii.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: tokens.scale(tokens.spacing.md),
                      height: tokens.verticalScale(46),
                      gap: 10,
                    }}
                  >
                    <Ionicons name="mail-outline" size={18} color={colors.muted} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder={t.auth.emailPlaceholder}
                      placeholderTextColor={colors.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="emailAddress"
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    />
                  </View>
                </View>

                {/* Şifre Alanı */}
                <View style={{ gap: 6 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                      fontWeight: tokens.typography.fontWeight.semibold,
                    }}
                  >
                    {t.auth.password}
                  </Text>
                  <View
                    style={{
                      flexDirection: rowDirection,
                      alignItems: 'center',
                      backgroundColor: colors.bg,
                      borderRadius: tokens.radii.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: tokens.scale(tokens.spacing.md),
                      height: tokens.verticalScale(46),
                      gap: 10,
                    }}
                  >
                    <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder={t.auth.passwordPlaceholder}
                      placeholderTextColor={colors.muted}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="password"
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Şifreyi Göster/Gizle"
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={colors.muted}
                      />
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            {/* Hata Mesajı Kutusu (iOS ve Android) */}
            {errorMessage && (
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
                  {errorMessage}
                </Text>
              </View>
            )}

            {showEmailAuth && (
              <>
                {/* Giriş / Kayıt Butonu */}
                <AppButton
                  label={authMode === 'login' ? t.auth.loginButton : t.auth.registerButton}
                  icon={authMode === 'login' ? 'log-in-outline' : 'person-add-outline'}
                  onPress={handleEmailAuth}
                  disabled={isBusy}
                  loading={emailSignInMutation.isPending || emailSignUpMutation.isPending}
                  fullWidth
                  size="lg"
                />

                {/* Bölücü Çizgi */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginVertical: tokens.verticalScale(2),
                  }}
                >
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                  <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(12) }}>
                    {t.auth.orDivider}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                </View>
              </>
            )}

            {/* Google ile Giriş (iOS ve Android) */}
            <AppButton
              label={t.auth.continueWithGoogle}
              icon="logo-google"
              onPress={handleGoogleLogin}
              disabled={isBusy}
              loading={socialAuthMutation.isPending}
              fullWidth
              variant={showEmailAuth ? 'secondary' : undefined}
              accessibilityLabel={t.auth.loginWithGoogleA11y}
              size={showEmailAuth ? 'md' : 'lg'}
            />

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

          {/* Yardım & Canlı Destek (WhatsApp & E-posta) */}
          {showEmailAuth && (
            <Pressable
              onPress={() => setSupportModalVisible(true)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Yardım ve Canlı Destek (WhatsApp ve E-posta)"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: tokens.verticalScale(4),
                opacity: pressed ? 0.6 : 0.85,
              })}
            >
              <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
              <Text
                style={{
                  color: colors.text,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
              >
                {t.profileScreen.support}
              </Text>
              <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11) }}>
                • WhatsApp & E-posta
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Kullanım Koşulları & Gizlilik Politikası Modalı */}
      <LegalTermsModal
        visible={legalModalVisible}
        initialTab={legalModalTab}
        onClose={() => setLegalModalVisible(false)}
      />

      {/* Yardım & Destek Modalı (WhatsApp & E-posta) */}
      <SupportContactModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
      />
    </SafeAreaView>
  );
};