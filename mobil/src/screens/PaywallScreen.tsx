import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { getErrorText } from '../lib/errors';
import { useEntitlement } from '../hooks/useEntitlement';
import { useAuth } from '../hooks/useAuth';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { useModal } from '../hooks/useModal';
import { AppButton } from '../components/ui/AppButton';
import { BackButton } from '../components/ui/BackButton';
import { AppModal } from '../components/ui/AppModal';
import { LegalTermsModal, LegalTab } from '../components/LegalTermsModal';
import { SubscriptionPlan } from '../types/settings.types';
import { requestPayment, getUserPendingPaymentRequest, subscriptionKeys } from '../api/subscriptionApi';

export const PaywallScreen: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const { user, isAuthenticated } = useAuth();
  const { settings, hasActiveSubscription } = useEntitlement(user?.id);
  const { packages, purchase, restore, refetchOfferings, isPro, monthlyPriceString, yearlyPriceString } = useRevenueCat();
  const [isProcessing, setIsProcessing] = useState(false);
  const { show: showModal, hide: hideModal, modalProps } = useModal();

  // Paywall her açıldığında app_settings'i tazele (fiyat değişimlerini anında yansıt)
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['app_settings'] });
  }, [queryClient]);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');
  const [isAgreed, setIsAgreed] = useState(false);

  const { data: pendingReq, refetch: refetchPendingReq } = useQuery({
    queryKey: subscriptionKeys.pendingPayment(user?.id),
    queryFn: () => getUserPendingPaymentRequest(user?.id),
    enabled: !!user?.id,
  });

  const isPendingApproval = (Platform.OS === 'ios' || Platform.OS === 'web') && !!pendingReq;

  const formatPriceDisplay = (val?: string | number) => {
    if (!val) return '';
    const clean = String(val).replace('₺', '').trim();
    return `${clean} ₺`;
  };

  // Fiyatı yalnızca app_settings'ten al (admin panelinden kontrol edilir)
  // RevenueCat/Google Play fiyatı görmezden gelinir
  const monthlyPrice =
    settings?.price_monthly
      ? formatPriceDisplay(settings.price_monthly)
      : '99,99 ₺';
  const yearlyPrice =
    settings?.price_yearly
      ? formatPriceDisplay(settings.price_yearly)
      : '999,99 ₺';

  const selectedPrice = selectedPlan === 'yearly' ? yearlyPrice : monthlyPrice;

  const handleSubscribe = async () => {
    if (!isAuthenticated || !user) {
      showModal({
        title: t.common.error,
        message: t.auth.cardSubtitle,
        actions: [
          { label: t.common.cancel, style: 'cancel', onPress: hideModal },
          {
            label: t.auth.cardTitle,
            style: 'default',
            onPress: () => {
              hideModal();
              router.push('/(auth)/phone');
            },
          },
        ],
      });
      return;
    }

    if (!isAgreed) {
      showModal({
        title: t.common.info,
        message: t.paywall.consentRequiredError,
        actions: [{ label: t.common.understood, style: 'default', onPress: hideModal }],
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (Platform.OS === 'android') {
        const targetPackage = selectedPlan === 'yearly' ? packages.yearly : packages.monthly;

        // Mağaza paketi yüklenemediyse abonelik verilmez; paketler arka planda yeniden denenir
        if (!targetPackage) {
          refetchOfferings().catch(() => {});
          throw new Error(t.paywall.storeUnavailable);
        }

        // Gerçek Google Play In-App Purchase
        const result = await purchase(targetPackage);
        if (result.userCancelled) {
          return;
        }

        if (!result.success) {
          // Hata yoksa ödeme alınmış ama yetki henüz doğrulanamamış olabilir
          throw new Error(result.error?.message ?? t.paywall.purchaseNotVerified);
        }

        showModal({
          title: t.common.success,
          message: t.paywall.subscribedSuccess,
          actions: [
            {
              label: t.common.ok,
              style: 'default',
              onPress: () => {
                hideModal();
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              },
            },
          ],
        });
        return;
      }

      // iOS ve Web: iOS In-App Purchase henüz olmadığı için yönetici onaylı ödeme talebi
      await requestPayment(selectedPlan);
      await refetchPendingReq();
      showModal({
        title: t.paywall.paymentRequestedTitle,
        message: t.paywall.paymentRequestedMessage,
        actions: [
          {
            label: t.common.ok,
            style: 'default',
            onPress: () => {
              hideModal();
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            },
          },
        ],
      });
    } catch (err: unknown) {
      showModal({
        title: t.common.error,
        message: getErrorText(err, t, t.paywall.purchaseFailed),
        actions: [{ label: t.common.ok, style: 'default', onPress: hideModal }],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    try {
      const res = await restore();
      if (res.isPro || hasActiveSubscription) {
        showModal({
          title: t.paywall.restorePurchases,
          message: t.paywall.subscribedSuccess,
          actions: [{ label: t.common.ok, style: 'default', onPress: hideModal }],
        });
      } else {
        showModal({
          title: t.paywall.restorePurchases,
          message: t.paywall.noActiveSubscription,
          actions: [{ label: t.common.ok, style: 'default', onPress: hideModal }],
        });
      }
    } catch (err: unknown) {
      showModal({
        title: t.common.error,
        message: getErrorText(err, t, t.paywall.restoreFailed),
        actions: [{ label: t.common.ok, style: 'default', onPress: hideModal }],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right', 'bottom']}>
      {/* Üst Bar / Geri Dön & Geri Yükle */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          paddingVertical: tokens.verticalScale(tokens.spacing.xs),
        }}
      >
        <BackButton onPress={() => router.back()} />

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
          paddingBottom: Math.max(insets.bottom, 16) + tokens.verticalScale(48),
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

        {/* Onay Bekleyen Talep Bildirimi (Yalnızca iOS & Web) */}
        {(Platform.OS === 'ios' || Platform.OS === 'web') && pendingReq && (
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
              borderRadius: tokens.radii.lg,
              padding: tokens.scale(tokens.spacing.md),
              borderWidth: 1,
              borderColor: isDark ? '#F59E0B66' : '#FDE68A',
            }}
          >
            <Ionicons name="hourglass-outline" size={24} color="#D97706" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: isDark ? '#FBBF24' : '#B45309',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {t.paywall.pendingApproval}
              </Text>
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  color: colors.text,
                  lineHeight: 16,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {t.paywall.pendingRequestNotice} (
                {pendingReq.package_type === 'yearly' ? t.paywall.yearlyPlan : t.paywall.monthlyPlan})
              </Text>
            </View>
          </View>
        )}

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
                  {t.paywall.yearlyBillingNote}
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
                  {t.paywall.monthlyCancelNote}
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



        {/* Mesafeli Satış & Ön Bilgilendirme Onay Kutusu (Checkbox) */}
        <Pressable
          onPress={() => setIsAgreed(!isAgreed)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isAgreed }}
          style={({ pressed }) => [
            {
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              gap: tokens.scale(tokens.spacing.sm),
              padding: tokens.scale(tokens.spacing.sm),
              borderRadius: tokens.moderateScale(tokens.radii.lg),
              backgroundColor: isAgreed
                ? isDark
                  ? 'rgba(79, 70, 229, 0.12)'
                  : 'rgba(79, 70, 229, 0.05)'
                : 'transparent',
              borderWidth: 1.5,
              borderColor: isAgreed ? colors.primary : isDark ? '#334155' : '#CBD5E1',
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View
            style={{
              width: tokens.scale(22),
              height: tokens.scale(22),
              borderRadius: tokens.radii.xs,
              borderWidth: 2,
              borderColor: isAgreed ? colors.primary : colors.muted,
              backgroundColor: isAgreed ? colors.primary : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 2,
            }}
          >
            {isAgreed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: tokens.moderateScale(12),
                color: colors.text,
                lineHeight: 18,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t.paywall.checkboxConsentPrefix}
              <Text
                onPress={(e) => {
                  e.stopPropagation();
                  setLegalModalTab('sales_terms');
                  setLegalModalVisible(true);
                }}
                style={{
                  color: colors.primary,
                  fontWeight: tokens.typography.fontWeight.bold,
                  textDecorationLine: 'underline',
                }}
              >
                {t.paywall.distanceSalesLink}
              </Text>
              {t.paywall.checkboxConsentMiddle}
              <Text style={{ color: colors.muted }}>
                {t.paywall.checkboxConsentSuffix}
              </Text>
            </Text>
          </View>
        </Pressable>

        {/* Ana Aksiyon Butonu */}
        <View style={{ gap: tokens.verticalScale(tokens.spacing.sm) }}>
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            label={
              isPendingApproval
                ? t.paywall.pendingApproval
                : Platform.OS === 'ios'
                ? `${t.paywall.requestAccess} • ${selectedPrice}`
                : `${t.paywall.subscribeButton} • ${selectedPrice}`
            }
            icon={isPendingApproval ? 'time-outline' : 'arrow-forward'}
            iconPosition="right"
            loading={isProcessing}
            disabled={!isAgreed || isProcessing || isPendingApproval}
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

          {/* Google Play & Apple Yasal Bağlantılar Bölümü */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: tokens.scale(tokens.spacing.xs),
              marginTop: tokens.verticalScale(tokens.spacing.sm),
              paddingVertical: tokens.verticalScale(tokens.spacing.xs),
              marginBottom: tokens.verticalScale(tokens.spacing.sm),
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
                  fontSize: tokens.moderateScale(11),
                  color: colors.primaryText,
                  textDecorationLine: 'underline',
                  fontWeight: tokens.typography.fontWeight.medium,
                }}
              >
                {t.auth.termsOfUse}
              </Text>
            </Pressable>

            <Text style={{ color: colors.muted, fontSize: 11 }}>•</Text>

            <Pressable
              onPress={() => {
                setLegalModalTab('privacy');
                setLegalModalVisible(true);
              }}
              hitSlop={8}
            >
              <Text
                style={{
                  fontSize: tokens.moderateScale(11),
                  color: colors.primaryText,
                  textDecorationLine: 'underline',
                  fontWeight: tokens.typography.fontWeight.medium,
                }}
              >
                {t.auth.privacyPolicy}
              </Text>
            </Pressable>

            <Text style={{ color: colors.muted, fontSize: 11 }}>•</Text>

            <Pressable
              onPress={() => {
                setLegalModalTab('sales_terms');
                setLegalModalVisible(true);
              }}
              hitSlop={8}
            >
              <Text
                style={{
                  fontSize: tokens.moderateScale(11),
                  color: colors.primaryText,
                  textDecorationLine: 'underline',
                  fontWeight: tokens.typography.fontWeight.medium,
                }}
              >
                {t.paywall.distanceSalesTab}
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

      <AppModal {...modalProps} />
    </SafeAreaView>
  );
};
