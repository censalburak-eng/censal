import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useEntitlement, useUserPinnedListings } from '../hooks/useEntitlement';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';
import { useI18n } from '../i18n';
import { BackButton, AppButton, LoadingView, EmptyView } from '../components/ui';
import { UserPinnedListingItem, getUserPendingPaymentRequest, subscriptionKeys } from '../api/subscriptionApi';
import { useQuery } from '@tanstack/react-query';

export const SubscriptionsScreen: React.FC = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const { user } = useAuth();

  const { customerInfo, isPro, refetchCustomerInfo, presentCustomerCenter, isLoading: isRevenueCatLoading } = useRevenueCat();
  const { subscription, hasActiveSubscription, isFreeMode, isLoading: isEntitlementLoading } = useEntitlement(user?.id);
  const {
    data: pinnedListings = [],
    isLoading: isPinsLoading,
    refetch: refetchPins,
    isRefetching,
  } = useUserPinnedListings(user?.id);

  const { data: pendingReq } = useQuery({
    queryKey: subscriptionKeys.pendingPayment(user?.id),
    queryFn: () => getUserPendingPaymentRequest(user?.id),
    enabled: !!user?.id,
  });

  const [filterTab, setFilterTab] = useState<'active' | 'all'>('active');

  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  const isUserPro = isPro || hasActiveSubscription;

  // Manage / Cancel Subscription handler
  const handleManageSubscription = async () => {
    try {
      if (Platform.OS !== 'web') {
        await presentCustomerCenter();
      } else {
        await Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
    } catch {
      // Fallback directly to Google Play Subscriptions management link
      const playUrl = 'https://play.google.com/store/account/subscriptions';
      Linking.openURL(playUrl).catch(() => {});
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchCustomerInfo(), refetchPins()]);
  };

  const activePins = pinnedListings.filter((p) => p.isActive);
  const displayedPins = filterTab === 'active' ? activePins : pinnedListings;

  if (isRevenueCatLoading || isEntitlementLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
        <View
          style={{
            flexDirection: rowDirection,
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: tokens.scale(tokens.spacing.base),
            paddingVertical: tokens.verticalScale(tokens.spacing.sm),
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <BackButton onPress={() => router.back()} />
          <Text
            style={{
              fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
              fontWeight: tokens.typography.fontWeight.bold,
              color: colors.text,
              textAlign: 'center',
            }}
          >
            {t.subscriptionsScreen.title}
          </Text>
          <View style={{ width: tokens.scale(40) }} />
        </View>
        <LoadingView />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      {/* Header */}
      <View
        style={{
          flexDirection: rowDirection,
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          paddingVertical: tokens.verticalScale(tokens.spacing.sm),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <BackButton onPress={() => router.back()} />
        <Text
          style={{
            fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
            fontWeight: tokens.typography.fontWeight.bold,
            color: colors.text,
            textAlign: 'center',
          }}
        >
          {t.subscriptionsScreen.title}
        </Text>
        <View style={{ width: tokens.scale(40) }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: tokens.scale(tokens.spacing.base),
          gap: tokens.verticalScale(tokens.spacing.lg),
          paddingBottom: tokens.verticalScale(tokens.spacing.xxl),
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Onay Bekleyen Abonelik Talebi (Yalnızca iOS & Web) */}
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

        {/* 1. ABONELİK KARTI */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: tokens.radii.xl,
            borderWidth: 1,
            borderColor: isUserPro ? colors.primary : colors.border,
            padding: tokens.scale(tokens.spacing.lg),
            gap: tokens.verticalScale(tokens.spacing.md),
          }}
        >
          {/* Rozet ve Durum */}
          <View style={{ flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              style={{
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                fontWeight: tokens.typography.fontWeight.bold,
                color: colors.muted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {t.subscriptionsScreen.subscriptionCardTitle}
            </Text>

            <View
              style={{
                flexDirection: rowDirection,
                alignItems: 'center',
                gap: 5,
                backgroundColor: isUserPro
                  ? isDark
                    ? 'rgba(34, 197, 94, 0.2)'
                    : '#DCFCE7'
                  : isFreeMode
                  ? isDark
                    ? 'rgba(59, 130, 246, 0.2)'
                    : '#DBEAFE'
                  : isDark
                  ? 'rgba(148, 163, 184, 0.2)'
                  : '#F1F5F9',
                paddingHorizontal: tokens.scale(tokens.spacing.sm),
                paddingVertical: tokens.verticalScale(4),
                borderRadius: tokens.radii.full,
              }}
            >
              <Ionicons
                name={isUserPro ? 'checkmark-circle' : isFreeMode ? 'gift-outline' : 'lock-closed-outline'}
                size={14}
                color={isUserPro ? '#16A34A' : isFreeMode ? '#2563EB' : colors.muted}
              />
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  fontWeight: tokens.typography.fontWeight.heavy,
                  color: isUserPro ? '#16A34A' : isFreeMode ? '#2563EB' : colors.muted,
                }}
              >
                {isUserPro
                  ? t.subscriptionsScreen.proActiveBadge
                  : isFreeMode
                  ? t.subscriptionsScreen.freeBadge
                  : t.subscriptionsScreen.freeBadge}
              </Text>
            </View>
          </View>

          {/* Abonelik Detayı */}
          <View style={{ gap: 4 }}>
            <Text
              style={{
                fontSize: tokens.moderateScale(tokens.typography.fontSize.xl),
                fontWeight: tokens.typography.fontWeight.heavy,
                color: colors.text,
                textAlign,
              }}
            >
              {isUserPro ? t.subscriptionsScreen.proTitle : t.subscriptionsScreen.freeTitle}
            </Text>
            <Text
              style={{
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                color: colors.muted,
                textAlign,
              }}
            >
              {isUserPro ? t.subscriptionsScreen.proDesc : t.subscriptionsScreen.freeDesc}
            </Text>
          </View>

          {/* Aksiyon Butonu */}
          {isUserPro ? (
            <View style={{ gap: tokens.verticalScale(tokens.spacing.xs) }}>
              <AppButton
                variant="outline"
                size="md"
                fullWidth
                label={t.subscriptionsScreen.manageOrCancelButton}
                icon="settings-outline"
                onPress={handleManageSubscription}
              />
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  color: colors.muted,
                  textAlign: 'center',
                  lineHeight: 16,
                  paddingHorizontal: 8,
                }}
              >
                {t.subscriptionsScreen.cancelNotice}
              </Text>
            </View>
          ) : (
            <AppButton
              variant="primary"
              size="md"
              fullWidth
              label={t.subscriptionsScreen.upgradeButton}
              icon="sparkles"
              onPress={() => router.push('/paywall')}
            />
          )}
        </View>

        {/* 2. SABİT İLANLARIM BÖLÜMÜ */}
        <View style={{ gap: tokens.verticalScale(tokens.spacing.sm) }}>
          <View style={{ flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: colors.text,
                  textAlign,
                }}
              >
                {t.subscriptionsScreen.pinnedSectionTitle}
              </Text>
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  color: colors.muted,
                  textAlign,
                }}
              >
                {t.subscriptionsScreen.pinnedSectionSubtitle}
              </Text>
            </View>
          </View>

          {/* Sekmeler (Aktif / Tüm İlanlar) */}
          <View
            style={{
              flexDirection: rowDirection,
              backgroundColor: colors.surface,
              borderRadius: tokens.radii.lg,
              padding: 4,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Pressable
              onPress={() => setFilterTab('active')}
              style={{
                flex: 1,
                paddingVertical: tokens.verticalScale(tokens.spacing.xs),
                alignItems: 'center',
                borderRadius: tokens.radii.md,
                backgroundColor: filterTab === 'active' ? colors.primary : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: filterTab === 'active' ? '#FFFFFF' : colors.muted,
                }}
              >
                {t.subscriptionsScreen.activePinsTab} ({activePins.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFilterTab('all')}
              style={{
                flex: 1,
                paddingVertical: tokens.verticalScale(tokens.spacing.xs),
                alignItems: 'center',
                borderRadius: tokens.radii.md,
                backgroundColor: filterTab === 'all' ? colors.primary : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: filterTab === 'all' ? '#FFFFFF' : colors.muted,
                }}
              >
                {t.subscriptionsScreen.allPinsTab} ({pinnedListings.length})
              </Text>
            </Pressable>
          </View>

          {/* İlanlar Listesi */}
          {isPinsLoading ? (
            <LoadingView />
          ) : displayedPins.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: tokens.radii.xl,
                padding: tokens.scale(tokens.spacing.xl),
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                gap: 8,
              }}
            >
              <Ionicons name="pin-outline" size={32} color={colors.muted} />
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                  color: colors.muted,
                  textAlign: 'center',
                }}
              >
                {t.subscriptionsScreen.noPins}
              </Text>
            </View>
          ) : (
            <View style={{ gap: tokens.verticalScale(tokens.spacing.sm) }}>
              {displayedPins.map((item: UserPinnedListingItem) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: '/room/[cityId]',
                      params: { cityId: String(item.cityId) },
                    })
                  }
                  style={({ pressed }) => [
                    {
                      backgroundColor: colors.surface,
                      borderRadius: tokens.radii.lg,
                      borderWidth: 1,
                      borderColor: item.isActive ? colors.primary : colors.border,
                      padding: tokens.scale(tokens.spacing.md),
                      gap: tokens.verticalScale(tokens.spacing.xs),
                    },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: rowDirection,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    {/* Şehir Etiketi */}
                    <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 6 }}>
                      <View
                        style={{
                          backgroundColor: colors.primaryTint,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: tokens.radii.sm,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                            fontWeight: tokens.typography.fontWeight.bold,
                            color: colors.primaryText,
                          }}
                        >
                          {t.subscriptionsScreen.roomPrefix(item.cityPlate, item.cityName)}
                        </Text>
                      </View>
                    </View>

                    {/* Durum Rozeti */}
                    <View
                      style={{
                        flexDirection: rowDirection,
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: tokens.radii.full,
                        backgroundColor: item.isActive
                          ? isDark
                            ? 'rgba(34, 197, 94, 0.2)'
                            : '#DCFCE7'
                          : isDark
                          ? 'rgba(148, 163, 184, 0.2)'
                          : '#F1F5F9',
                      }}
                    >
                      <Ionicons
                        name={item.isActive ? 'time-outline' : 'checkmark-done'}
                        size={12}
                        color={item.isActive ? '#16A34A' : colors.muted}
                      />
                      <Text
                        style={{
                          fontSize: tokens.moderateScale(10),
                          fontWeight: tokens.typography.fontWeight.bold,
                          color: item.isActive ? '#16A34A' : colors.muted,
                        }}
                      >
                        {item.isActive
                          ? t.subscriptionsScreen.hoursRemaining(item.hoursLeft)
                          : t.subscriptionsScreen.expiredBadge}
                      </Text>
                    </View>
                  </View>

                  {/* İlan Mesajı Özeti */}
                  <Text
                    numberOfLines={2}
                    style={{
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                      color: colors.text,
                      lineHeight: 20,
                      textAlign,
                    }}
                  >
                    {item.messageBody}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
