import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBlockedUsers, useUnblockUser } from '../hooks/useDirectMessages';
import { BlockedUser } from '../types/directMessages.types';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';
import { useI18n } from '../i18n';
import { BackButton, AppModal, LoadingView, ErrorView, EmptyView } from '../components/ui';
import { useModal } from '../hooks/useModal';
import { Image } from 'expo-image';

export const BlockedUsersScreen: React.FC = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const { data: blockedList = [], isLoading, isError, refetch } = useBlockedUsers();
  const unblockMutation = useUnblockUser();
  const { show: showModal, hide: hideModal, modalProps } = useModal();


  const handleUnblock = (user: BlockedUser) => {
    const fullName = `${user.first_name ?? t.common.fellowCitizen} ${user.last_name ?? ''}`.trim();
    showModal({
      title: t.direct.unblock,
      message: t.directChat.unblockConfirm(fullName),
      actions: [
        { label: t.common.cancel, style: 'cancel', onPress: hideModal },
        {
          label: t.direct.unblock,
          style: 'default',
          onPress: () => {
            hideModal();
            unblockMutation.mutate(user.blocked_id, {
              onSuccess: () =>
                showModal({
                  title: t.common.success,
                  message: t.direct.unblockedSuccess,
                  actions: [{ label: t.common.ok, style: 'default', onPress: hideModal }],
                }),
              onError: (err) =>
                showModal({
                  title: t.common.error,
                  message: err instanceof Error && err.message ? err.message : t.errors.unknown,
                  actions: [{ label: t.common.ok, style: 'default', onPress: hideModal }],
                }),
            });
          },
        },
      ],
    });
  };

  const renderItem = ({ item }: { item: BlockedUser }) => {
    const fullName = `${item.first_name ?? t.common.user} ${item.last_name ?? ''}`.trim();
    const initials = fullName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          paddingVertical: tokens.verticalScale(tokens.spacing.md),
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.scale(tokens.spacing.sm), flex: 1 }}>
          {/* Avatar */}
          <View
            style={{
              width: tokens.scale(44),
              height: tokens.scale(44),
              borderRadius: tokens.radii.full,
              backgroundColor: colors.surfaceElevated,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: colors.primaryText,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                fontWeight: tokens.typography.fontWeight.bold,
              }}
            >
              {item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} /> : initials || 'U'}
            </Text>
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
                numberOfLines={1}
              >
                {fullName}
              </Text>
              {item.plate_code && (
                <View
                  style={{
                    backgroundColor: colors.bg,
                    paddingHorizontal: tokens.scale(6),
                    paddingVertical: 1,
                    borderRadius: tokens.moderateScale(tokens.radii.xs),
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: tokens.moderateScale(10),
                      fontWeight: tokens.typography.fontWeight.bold,
                    }}
                  >
                    {item.plate_code}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={{
                color: colors.muted,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
              }}
            >
              {t.blockedScreen.itemSubtitle}
            </Text>
          </View>
        </View>

        {/* Engeli Kaldır Butonu */}
        <Pressable
          onPress={() => handleUnblock(item)}
          disabled={unblockMutation.isPending}
          hitSlop={8}
          style={({ pressed }) => [
            {
              paddingHorizontal: tokens.scale(tokens.spacing.sm + 4),
              paddingVertical: tokens.verticalScale(tokens.spacing.xs + 2),
              borderRadius: tokens.moderateScale(tokens.radii.full),
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
            },
            pressed && { backgroundColor: colors.surfaceElevated },
          ]}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
              fontWeight: tokens.typography.fontWeight.semibold,
            }}
          >
            {t.direct.unblock}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      <AppModal {...modalProps} />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          paddingVertical: tokens.verticalScale(tokens.spacing.sm),
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.scale(tokens.spacing.sm) }}>
          <BackButton onPress={() => router.back()} />

          <Text
            style={{
              color: colors.text,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
              fontWeight: tokens.typography.fontWeight.bold,
            }}
          >
            {t.direct.blockedTitle}
          </Text>
        </View>

        {blockedList.length > 0 && (
          <View
            style={{
              backgroundColor: colors.primaryTint,
              paddingHorizontal: tokens.scale(10),
              paddingVertical: tokens.verticalScale(4),
              borderRadius: tokens.moderateScale(tokens.radii.full),
            }}
          >
            <Text
              style={{
                color: colors.primaryText,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                fontWeight: tokens.typography.fontWeight.bold,
              }}
            >
              {t.blockedScreen.countBadge(blockedList.length)}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <LoadingView />
      ) : isError ? (

        <ErrorView title={t.blockedScreen.loadFailed} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={blockedList}
          keyExtractor={(item) => item.blocked_id}
          renderItem={renderItem}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyView
              icon="shield-checkmark-outline"
              title={t.blockedScreen.emptyTitle}
              subtitle={t.blockedScreen.emptySubtitle}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};
