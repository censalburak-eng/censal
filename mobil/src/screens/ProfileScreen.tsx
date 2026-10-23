import React, { useState } from 'react';
import { View, Text, ScrollView, Linking, StatusBar, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../hooks/useAuth';
import { useProfile, useDeleteAccount } from '../hooks/useProfile';
import { useModal } from '../hooks/useModal';
import { AppModal, BackButton, LoadingView, ErrorView } from '../components/ui';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';

import { ProfileHeroCard } from '../components/ProfileHeroCard';
import { ProfileMenuGroup, ProfileMenuItemData } from '../components/ProfileMenuGroup';
import { ProfileSignOutButton } from '../components/ProfileSignOutButton';
import { ProfileDeleteAccountButton } from '../components/ProfileDeleteAccountButton';
import { ProfileSettingsModal } from '../components/ProfileSettingsModal';
import { LegalTermsModal } from '../components/LegalTermsModal';
import { useBlockedUsers } from '@/hooks/useDirectMessages';

const APP_VERSION = '1.0.4';

export const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading, isError, refetch } = useProfile(user?.id);
  const { data: blockedList } = useBlockedUsers();
  const deleteAccountMutation = useDeleteAccount();
  const { modalProps, show, hide } = useModal();
  const { colors, isDark, setMode } = useTheme();
  const { t, isRTL } = useI18n();

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  // Tek tuşlu bilgi modalı
  const showInfo = (title: string, message: string, onOk?: () => void) =>
    show({
      title,
      message,
      actions: [
        {
          label: t.common.ok,
          style: 'default',
          onPress: () => {
            hide();
            onOk?.();
          },
        },
      ],
    });

  const handleSignOut = () => {
    show({
      title: t.profile.logoutTitle,
      message: t.profile.logoutConfirm,
      actions: [
        { label: t.common.cancel, style: 'cancel', onPress: hide },
        {
          label: t.profile.logoutTitle,
          style: 'destructive',
          onPress: async () => {
            hide();
            await signOut();
            router.replace('/');
          },
        },
      ],
    });
  };

  const handleSupportPress = async () => {
    const subject = encodeURIComponent('Censal Destek Talebi');
    const body = encodeURIComponent(
      `Merhaba Censal Destek Ekibi,\n\nKullanıcı ID: ${user?.id ?? 'Bilinmiyor'}\nSorun / Görüş:\n`
    );
    const mailUrl = `mailto:destek@censal.app?subject=${subject}&body=${body}`;

    show({
      title: t.profileScreen.support,
      message: isRTL
        ? 'يمكنك التواصل مع فريق الدعم لدينا على مدار الساعة عبر البريد الإلكتروني: destek@censal.app'
        : 'Censal destek ve güvenlik ekibine e-posta ile 7/24 ulaşabilirsiniz (destek@censal.app).',
      actions: [
        { label: t.common.cancel, style: 'cancel', onPress: hide },
        {
          label: isRTL ? 'إرسال بريد إلكتروني' : 'E-posta Gönder',
          style: 'default',
          onPress: async () => {
            hide();
            try {
              await Linking.openURL(mailUrl);
            } catch {
              showInfo(t.common.info, 'destek@censal.app');
            }
          },
        },
      ],
    });
  };

  const handleDeleteAccount = () => {
    if (!user?.id) return;

    show({
      title: t.profile.deleteAccountTitle,
      message: t.profile.deleteAccountConfirm,
      actions: [
        { label: t.common.cancel, style: 'cancel', onPress: hide },
        {
          label: t.common.delete,
          style: 'destructive',
          onPress: () => {
            hide();
            deleteAccountMutation.mutate(user.id, {
              onSuccess: () =>
                showInfo(t.common.success, t.profileScreen.deleteSuccess, () =>
                  router.replace('/')
                ),
              onError: (err) =>
                showInfo(
                  t.common.error,
                  err instanceof Error && err.message ? err.message : t.profileScreen.deleteFailed
                ),
            });
          },
        },
      ],
    });
  };

  const blockedCount = blockedList?.length ?? 0;
  const profileAndAccountItems: readonly ProfileMenuItemData[] = [
    {
      id: 'edit_profile',
      iconName: 'create-outline',
      title: t.profileScreen.editProfile,
      subtitle: t.profileScreen.editProfileSub,
      onPress: () => router.push({ pathname: '/(auth)/complete-profile', params: { mode: 'edit' } }),
    },
    {
      id: 'subscriptions',
      iconName: 'receipt-outline',
      title: t.profileScreen.subscriptions,
      subtitle: t.profileScreen.subscriptionsSub,
      onPress: () => router.push('/paywall'),
    },
    {
      id: 'blocked_users',
      iconName: 'ban-outline',
      title: t.profileScreen.blockedUsers,
      subtitle: t.profileScreen.blockedCount(blockedCount),
      badgeText: blockedCount > 0 ? blockedCount : undefined,
      onPress: () => router.push('/blocked-users'),
    },
    {
      id: 'dark_mode',
      iconName: isDark ? 'moon' : 'sunny-outline',
      title: t.profileScreen.darkMode,
      subtitle: isDark ? t.profileScreen.on : t.profileScreen.off,
      renderRight: (
        <Switch
          value={isDark}
          onValueChange={(val) => setMode(val ? 'dark' : 'light')}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      ),
    },
    {
      id: 'app_language',
      iconName: 'globe-outline',
      title: t.settings.language,
      subtitle: t.settings.currentLanguage,
      onPress: () => setIsSettingsModalOpen(true),
    },
    {
      id: 'support_contact',
      iconName: 'headset-outline',
      title: t.profileScreen.support,
      subtitle: t.profileScreen.supportSub,
      showDot: true,
      onPress: handleSupportPress,
    },
    {
      id: 'terms_privacy',
      iconName: 'document-text-outline',
      title: t.profileScreen.terms,
      subtitle: t.profileScreen.termsSub,
      onPress: () => setIsLegalModalOpen(true),
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
        <LoadingView />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
        <ErrorView onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 1. ÜST HEADER */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          paddingVertical: tokens.verticalScale(tokens.spacing.sm),
          gap: tokens.scale(tokens.spacing.sm),
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <BackButton onPress={() => router.back()} />

        <Text
          style={{
            flex: 1,
            color: colors.text,
            fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
            fontWeight: tokens.typography.fontWeight.bold,
          }}
        >
          {t.profileScreen.title}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: tokens.scale(tokens.spacing.base),
          gap: tokens.verticalScale(tokens.spacing.base),
          paddingBottom: tokens.verticalScale(tokens.spacing.base),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. KULLANICI KİMLİK KARTI */}
        <ProfileHeroCard profile={profile} phone={user?.phone} />

        {/* 3. PROFİL VE HESAP AYARLARI */}
        <ProfileMenuGroup title={t.profileScreen.sectionTitle} items={profileAndAccountItems} />

        {/* 4. ÇIKIŞ YAP & HESABI SİL BUTONLARI */}
        <ProfileSignOutButton onPress={handleSignOut} />
        <ProfileDeleteAccountButton
          onPress={handleDeleteAccount}
          isLoading={deleteAccountMutation.isPending}
        />

        {/* 5. SÜRÜM & GÜVENLİK BİLGİSİ */}
        <View style={{ alignItems: 'center', gap: 4, marginTop: tokens.verticalScale(tokens.spacing.xs) }}>
          <Text
            style={{
              color: colors.muted,
              fontSize: tokens.moderateScale(11),
              fontWeight: tokens.typography.fontWeight.medium,
            }}
          >
            {t.profileScreen.versionLabel(APP_VERSION)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="shield-checkmark-outline" size={12} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11) }}>
              {t.profileScreen.secureNetwork}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* AYARLAR MODALI (Dil Seçimi & Hesap Silme) */}
      <ProfileSettingsModal
        visible={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* KULLANIM KOŞULLARI (EULA) & GİZLİLİK POLİTİKASI MODALI */}
      <LegalTermsModal
        visible={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />

      {/* Evrensel Uyarı & Bilgi Modalı */}
      <AppModal {...modalProps} />
    </SafeAreaView>
  );
};