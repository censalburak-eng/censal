import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { useEntitlement } from '../hooks/useEntitlement';
import { useAuth } from '../hooks/useAuth';
import { AppButton } from '../components/ui/AppButton';
import { LegalTermsModal, LegalTab } from '../components/LegalTermsModal';
import { SubscriptionPlan } from '../types/settings.types';

export const PaywallScreen: React.FC = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const { user, isAuthenticated } = useAuth();
  const { settings, mockSubscribe, isSubscribing, hasActiveSubscription } = useEntitlement(user?.id);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');

  const monthlyPrice = settings?.price_monthly ? `₺${settings.price_monthly}` : '₺99.99';
  const yearlyPrice = settings?.price_yearly ? `₺${settings.price_yearly}` : '₺999.99';

  const handleSubscribe = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        t.common.error,
        t.auth.cardSubtitle,
        [
          { text: t.common.cancel, style: 'cancel' },
          { text: t.auth.cardTitle, onPress: () => router.push('/(auth)/phone') },
        ]
      );
      return;
    }

    try {
      await mockSubscribe(selectedPlan);
      Alert.alert(
        t.common.success,
        t.paywall.subscribedSuccess,
        [
          {
            text: t.common.ok,
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            },
          },
        ]
      );
    } catch (err: unknown) {
      Alert.alert(t.common.error, err instanceof Error ? err.message : 'İşlem başarısız');
    }
  };

  const handleRestore = () => {
    Alert.alert(
      t.paywall.restorePurchases,
      hasActiveSubscription
        ? t.paywall.subscribedSuccess
        : (isRTL ? 'لا توجد مشتريات نشطة مسجلة.' : 'Kayıtlı aktif bir abonelik bulunamadı.')
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      {/* Üst Bar / Kapat & Geri Yükle */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          paddingVertical: tokens.verticalScale(tokens.spacing.xs),
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
          hitSlop={12}
          style={({ pressed }) => [
            {
              width: tokens.scale(36),
              height: tokens.scale(36),
              borderRadius: tokens.radii.full,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              justifyContent: 'center',
              alignItems: 'center',
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>

        <Pressable onPress={handleRestore} hitSlop={8}>
          <Text
            style={{
              fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
              color: colors.primaryText,
              fontWeight: tokens.typography.fontWeight.semibold,
            }}
          >
            {t.paywall.restorePurchases}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: tokens.scale(tokens.spacing.lg),
          paddingTop: tokens.verticalScale(tokens.spacing.sm),
          paddingBottom: tokens.verticalScale(tokens.spacing.xxl),
          gap: tokens.verticalScale(tokens.spacing.lg),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Bölümü */}
        <View style={{ alignItems: 'center', gap: tokens.verticalScale(tokens.spacing.sm) }}>
          {/* Rozet */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: tokens.scale(tokens.spacing.md),
              paddingVertical: tokens.verticalScale(4),
              borderRadius: tokens.radii.full,
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
              borderWidth: 1,
              borderColor: isDark ? '#F59E0B66' : '#FDE68A',
            }}
          >
            <Ionicons name="sparkles" size={14} color="#D97706" />
            <Text
              style={{
                fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                fontWeight: tokens.typography.fontWeight.heavy,
                color: isDark ? '#FBBF24' : '#B45309',
                letterSpacing: 0.5,
              }}
            >
              {t.paywall.badge}
            </Text>
          </View>

          {/* Başlık & Açıklama */}
          <Text
            style={{
              fontSize: tokens.moderateScale(tokens.typography.fontSize.xxl),
              fontWeight: tokens.typography.fontWeight.heavy,
              color: colors.text,
              textAlign: 'center',
              letterSpacing: -0.5,
            }}
          >
            {t.paywall.title}
          </Text>

          <Text
            style={{
              fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
              color: colors.muted,
              textAlign: 'center',
              lineHeight: 22,
              paddingHorizontal: tokens.scale(tokens.spacing.sm),
            }}
          >
            {t.paywall.subtitle}
          </Text>
        </View>

        {/* Özellikler Kartı */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: tokens.moderateScale(tokens.radii.xl),
            padding: tokens.scale(tokens.spacing.lg),
            borderWidth: 1,
            borderColor: colors.border,
            gap: tokens.verticalScale(tokens.spacing.md),
          }}
        >
          <Text
            style={{
              fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
              fontWeight: tokens.typography.fontWeight.bold,
              color: colors.muted,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {t.paywall.featuresTitle}
          </Text>

          {[t.paywall.feature1, t.paywall.feature2, t.paywall.feature3, t.paywall.feature4].map((feature, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                gap: tokens.scale(tokens.spacing.md),
              }}
            >
              <View
                style={{
                  width: tokens.scale(26),
                  height: tokens.scale(26),
                  borderRadius: tokens.radii.full,
                  backgroundColor: colors.primaryTint,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="checkmark" size={16} color={colors.primaryText} />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                  color: colors.text,
                  fontWeight: tokens.typography.fontWeight.medium,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Fiyat Plan Seçenekleri */}
        <View style={{ gap: tokens.verticalScale(tokens.spacing.sm) }}>
          {/* Yıllık Plan (Öne Çıkan) */}
          <Pressable
            onPress={() => setSelectedPlan('yearly')}
            style={({ pressed }) => [
              {
                backgroundColor: selectedPlan === 'yearly' ? colors.primaryTint : colors.surface,
                borderRadius: tokens.moderateScale(tokens.radii.xl),
                padding: tokens.scale(tokens.spacing.base),
                borderWidth: 2,
                borderColor: selectedPlan === 'yearly' ? colors.primary : colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View
              style={{
                position: 'absolute',
                top: -10,
                right: isRTL ? undefined : tokens.scale(tokens.spacing.base),
                left: isRTL ? tokens.scale(tokens.spacing.base) : undefined,
                backgroundColor: colors.primary,
                borderRadius: tokens.radii.full,
                paddingHorizontal: tokens.scale(tokens.spacing.sm),
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: tokens.moderateScale(10),
                  fontWeight: tokens.typography.fontWeight.heavy,
                }}
              >
                {t.paywall.popularBadge}
              </Text>
            </View>

            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: tokens.scale(tokens.spacing.md) }}>
              <View
                style={{
                  width: tokens.scale(22),
                  height: tokens.scale(22),
                  borderRadius: tokens.radii.full,
                  borderWidth: 2,
                  borderColor: selectedPlan === 'yearly' ? colors.primary : colors.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {selectedPlan === 'yearly' && (
                  <View
                    style={{
                      width: tokens.scale(10),
                      height: tokens.scale(10),
                      borderRadius: tokens.radii.full,
                      backgroundColor: colors.primary,
                    }}
                  />
                )}
              </View>

              <View>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    style={{
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                      fontWeight: tokens.typography.fontWeight.bold,
                      color: colors.text,
                    }}
                  >
                    {t.paywall.yearlyPlan}
                  </Text>
                  <View
                    style={{
                      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7',
                      borderRadius: tokens.radii.sm,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                    }}
                  >
                    <Text style={{ color: '#16A34A', fontSize: 10, fontWeight: '700' }}>
                      {t.paywall.saveBadge}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                    color: colors.muted,
                  }}
                >
                  {isRTL ? 'دفعة واحدة سنوية' : 'Tek çekim / yıllık'}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
                  fontWeight: tokens.typography.fontWeight.heavy,
                  color: colors.text,
                }}
              >
                {yearlyPrice}
              </Text>
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  color: colors.muted,
                }}
              >
                {t.paywall.perYear}
              </Text>
            </View>
          </Pressable>

          {/* Aylık Plan */}
          <Pressable
            onPress={() => setSelectedPlan('monthly')}
            style={({ pressed }) => [
              {
                backgroundColor: selectedPlan === 'monthly' ? colors.primaryTint : colors.surface,
                borderRadius: tokens.moderateScale(tokens.radii.xl),
                padding: tokens.scale(tokens.spacing.base),
                borderWidth: 2,
                borderColor: selectedPlan === 'monthly' ? colors.primary : colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: tokens.scale(tokens.spacing.md) }}>
              <View
                style={{
                  width: tokens.scale(22),
                  height: tokens.scale(22),
                  borderRadius: tokens.radii.full,
                  borderWidth: 2,
                  borderColor: selectedPlan === 'monthly' ? colors.primary : colors.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {selectedPlan === 'monthly' && (
                  <View
                    style={{
                      width: tokens.scale(10),
                      height: tokens.scale(10),
                      borderRadius: tokens.radii.full,
                      backgroundColor: colors.primary,
                    }}
                  />
                )}
              </View>

              <View>
                <Text
                  style={{
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                    fontWeight: tokens.typography.fontWeight.bold,
                    color: colors.text,
                  }}
                >
                  {t.paywall.monthlyPlan}
                </Text>
                <Text
                  style={{
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                    color: colors.muted,
                  }}
                >
                  {isRTL ? 'إلغاء في أي وقت' : 'İstediğin an iptal et'}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
                  fontWeight: tokens.typography.fontWeight.heavy,
                  color: colors.text,
                }}
              >
                {monthlyPrice}
              </Text>
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  color: colors.muted,
                }}
              >
                {t.paywall.perMonth}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Bilgilendirme Notu */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.scale(tokens.spacing.sm),
            backgroundColor: isDark ? 'rgba(79, 70, 229, 0.12)' : 'rgba(79, 70, 229, 0.06)',
            borderRadius: tokens.moderateScale(tokens.radii.lg),
            padding: tokens.scale(tokens.spacing.md),
          }}
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.primaryText} />
          <Text
            style={{
              flex: 1,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
              color: colors.muted,
              lineHeight: 17,
            }}
          >
            {t.paywall.paymentNotice}
          </Text>
        </View>

        {/* Ana Aksiyon Butonu */}
        <View style={{ gap: tokens.verticalScale(tokens.spacing.sm) }}>
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            label={t.paywall.subscribeButton}
            icon="arrow-forward"
            iconPosition="right"
            loading={isSubscribing}
            disabled={isSubscribing}
            onPress={handleSubscribe}
          />

          <Text
            style={{
              fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
              color: colors.muted,
              textAlign: 'center',
              lineHeight: 16,
              paddingHorizontal: tokens.scale(tokens.spacing.sm),
            }}
          >
            {t.paywall.termsNotice}
          </Text>

          {/* Apple Guideline 3.1.2 - Doğrudan Kullanım Koşulları & Gizlilik Bağlantıları */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: tokens.scale(tokens.spacing.md),
              marginTop: tokens.verticalScale(tokens.spacing.xs),
            }}
          >
            <Pressable
              onPress={() => {
                setLegalModalTab('terms');
                setLegalModalVisible(true);
              }}
              hitSlop={8}
            >
              <Text
                style={{
                  fontSize: tokens.moderateScale(12),
                  color: colors.primaryText,
                  textDecorationLine: 'underline',
                  fontWeight: tokens.typography.fontWeight.medium,
                }}
              >
                {t.auth.termsOfUse}
              </Text>
            </Pressable>

            <Text style={{ color: colors.muted, fontSize: 12 }}>•</Text>

            <Pressable
              onPress={() => {
                setLegalModalTab('privacy');
                setLegalModalVisible(true);
              }}
              hitSlop={8}
            >
              <Text
                style={{
                  fontSize: tokens.moderateScale(12),
                  color: colors.primaryText,
                  textDecorationLine: 'underline',
                  fontWeight: tokens.typography.fontWeight.medium,
                }}
              >
                {t.auth.privacyPolicy}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Kullanım Koşulları (EULA) & Gizlilik Politikası Modalı */}
      <LegalTermsModal
        visible={legalModalVisible}
        initialTab={legalModalTab}
        onClose={() => setLegalModalVisible(false)}
      />
    </SafeAreaView>
  );
};
