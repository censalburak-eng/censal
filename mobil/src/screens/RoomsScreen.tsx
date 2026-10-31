import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, FlatList, StatusBar, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CityRoom } from '../types/rooms.types';
import { CITIES_DATA } from '../data/cities';
import { RoomHeader } from '../components/RoomHeader';
import { RoomCard } from '../components/RoomCard';
import { useRooms } from '../hooks/useRooms';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useConversations, useConversationsRealtime } from '../hooks/useDirectMessages';
import { useRoomCounts } from '../hooks/usePresence';
import { SkeletonList, ErrorView, EmptyView } from '../components/ui';
import { useEntitlement } from '../hooks/useEntitlement';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';

export const RoomsScreen: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: conversations = [] } = useConversations(user?.id);
  // Realtime DM dinleyicisi: kullanıcı odalar ekranındayken özel mesaj gelirse anında badge yansır
  useConversationsRealtime(user?.id);
  // Odalardaki anlık çevrim içi sayısını takip et
  const roomCounts = useRoomCounts();
  const { data: rooms = CITIES_DATA, isLoading: isRoomsLoading, isError, refetch } = useRooms();
  const { canAccessRooms, isLoading: isEntitlementLoading } = useEntitlement(user?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();

  // Abone olan kullanıcılara RevenueCat kontrolü bitmeden kilitli ekran / kilit ikonları
  // gösterilmesini engellemek için yetkilendirme sorgusu bitene kadar iskelet (skeleton) yükleme gösterilir.
  const isInitialLoading = isRoomsLoading || (isAuthenticated && isEntitlementLoading);

  const unreadMessagesCount = useMemo(() => {
    return conversations.reduce((acc, curr) => acc + (curr.unreadCount ?? 0), 0);
  }, [conversations]);

  // Anasayfadayken geri tuşuna basıldığında uygulamadan çık
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [])
  );

  // Pre-normalize for fast, zero-lag search filtering
  const normalizedRooms = useMemo(() => {
    const locale = isRTL ? 'ar-EG' : 'tr-TR';
    return rooms.map((r) => ({
      room: r,
      searchStr: `${r.name.toLocaleLowerCase(locale)} ${r.plateCode.toLocaleLowerCase(locale)}`,
    }));
  }, [rooms, isRTL]);

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase(isRTL ? 'ar-EG' : 'tr-TR');
    if (!q) return rooms;

    return normalizedRooms
      .filter((item) => item.searchStr.includes(q))
      .map((item) => item.room);
  }, [normalizedRooms, searchQuery, rooms, isRTL]);

  const handleRoomPress = useCallback(
    (room: CityRoom) => {
      if (!canAccessRooms) {
        router.push('/paywall');
        return;
      }

      router.push({
        pathname: '/room/[cityId]',
        params: { cityId: String(room.id) },
      });
    },
    [canAccessRooms, router]
  );

  const keyExtractor = useCallback((item: CityRoom) => item.id.toString(), []);

  const renderItem = useCallback(
    ({ item }: { item: CityRoom }) => (
      <RoomCard
        room={item}
        onPress={handleRoomPress}
        isLocked={!canAccessRooms}
        onlineCount={roomCounts[item.id] || 0}
      />
    ),
    [handleRoomPress, canAccessRooms, roomCounts]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => {
      const length = tokens.verticalScale(58);
      return { length, offset: length * index, index };
    },
    []
  );

  const renderContent = () => {
    if (isInitialLoading) {
      return <SkeletonList count={8} />;
    }

    if (isError) {
      return <ErrorView onRetry={() => refetch()} />;
    }

    if (filteredRooms.length === 0) {
      return (
        <EmptyView
          icon="search-outline"
          title={t.rooms.emptyTitle}
          subtitle={t.rooms.emptySubtitle}
          actionLabel={t.rooms.searchClear}
          onAction={() => setSearchQuery('')}
        />
      );
    }

    return (
      <FlatList
        data={filteredRooms}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: tokens.spacing.base, backgroundColor: colors.surface }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={5}
        removeClippedSubviews={true}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <RoomHeader
        totalRooms={CITIES_DATA.length}
        isLoggedIn={isAuthenticated}
        userPhone={user?.phone}
        userName={profile ? `${profile.ad} ${profile.soyad}` : undefined}
        unreadCount={unreadMessagesCount}
        avatarUrl={profile?.avatar_url ?? undefined}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        onLoginPress={() => router.push('/(auth)/phone')}
        onAvatarPress={() => { router.push('/profile'); }}
        onMessagesPress={() => { router.push('/conversations'); }}
      />
      {!isInitialLoading && !canAccessRooms && (
        <Pressable
          onPress={() => router.push('/paywall')}
          style={({ pressed }) => [
            {
              marginHorizontal: tokens.scale(tokens.spacing.base),
              marginTop: tokens.verticalScale(tokens.spacing.xs),
              marginBottom: tokens.verticalScale(tokens.spacing.sm),
              paddingHorizontal: tokens.scale(tokens.spacing.base),
              paddingVertical: tokens.verticalScale(tokens.spacing.sm),
              borderRadius: tokens.moderateScale(tokens.radii.lg),
              backgroundColor: isDark ? 'rgba(79, 70, 229, 0.15)' : '#EEF2FF',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: tokens.scale(tokens.spacing.sm),
              flex: 1,
            }}
          >
            <View
              style={{
                width: tokens.scale(32),
                height: tokens.scale(32),
                borderRadius: tokens.scale(16),
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: isDark ? '#E0E7FF' : '#312E81',
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                  fontWeight: tokens.typography.fontWeight.bold,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {t.rooms.membershipRequired}
              </Text>
              <Text
                style={{
                  color: isDark ? '#A5B4FC' : '#4338CA',
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  marginTop: 1,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {t.rooms.membershipDescription}
              </Text>
            </View>
          </View>
          <View
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: tokens.scale(tokens.spacing.sm),
              paddingVertical: tokens.verticalScale(6),
              borderRadius: tokens.moderateScale(tokens.radii.md),
              marginStart: tokens.scale(tokens.spacing.sm),
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                fontWeight: tokens.typography.fontWeight.bold,
              }}
            >
              {t.rooms.viewPlans}
            </Text>
          </View>
        </Pressable>
      )}

      {renderContent()}
    </SafeAreaView>
  );
};
