import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { Badge } from './ui';
import { router } from 'expo-router';

type RoomHeaderProps = {
  totalRooms: number;
  isLoggedIn?: boolean;
  userPhone?: string;
  userName?: string;
  conversationsCount?: number;
  unreadCount?: number;
  avatarUrl?: string;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onClearSearch: () => void;
  onLoginPress?: () => void;
  onAvatarPress?: () => void;
  onMessagesPress?: () => void;
};

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  isLoggedIn,
  userPhone,
  userName,
  conversationsCount,
  unreadCount,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onLoginPress,
  onAvatarPress,
  onMessagesPress,
  avatarUrl
}) => {
  const { colors, isDark } = useTheme();
  const { t, language } = useI18n();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const showImage = !!avatarUrl && !imageFailed;

  // Profil initials (ekran görüntüsündeki "EA" gibi)
  const getInitials = () => {
    if (userName && userName.trim().length > 0) {
      const parts = userName.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0]![0]}${parts[1]![0]}`.toLocaleUpperCase('tr-TR');
      }
      return userName.slice(0, 2).toLocaleUpperCase('tr-TR');
    }
    if (userPhone && userPhone.length >= 2) {
      return userPhone.replace(/[^0-9]/g, '').slice(-2);
    }
    return 'G';
  };

  return (
    <View
      style={{
        paddingHorizontal: tokens.scale(tokens.spacing.base),
        paddingTop: tokens.verticalScale(tokens.spacing.sm),
        paddingBottom: tokens.verticalScale(tokens.spacing.md),
        gap: tokens.verticalScale(tokens.spacing.sm),
        backgroundColor: colors.bg,
      }}
    >
      {/* Üst Başlık Satırı & Avatar */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>

          <Text
            style={{
              fontSize: tokens.moderateScale(32),
              fontWeight: tokens.typography.fontWeight.heavy,
              color: colors.text,
              letterSpacing: -0.5,
              marginTop: 2,
            }}
          >
            Censal
          </Text>
        </View>

        {/* Sağ Üst Mesajlar & Profil Avatarı */}
        {isLoggedIn ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.scale(tokens.spacing.xs + 4) }}>
            {onMessagesPress && (
              <Pressable
                onPress={onMessagesPress}
                style={({ pressed }) => [
                  {
                    width: tokens.scale(44),
                    height: tokens.scale(44),
                    borderRadius: tokens.radii.full,
                    backgroundColor: colors.surfaceElevated,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Özel Mesajlar"
              >
                <Ionicons name="chatbubbles-outline" size={20} color={colors.text} />
                <Badge count={unreadCount} floating size="sm" />
              </Pressable>
            )}

            <Pressable
              onPress={onAvatarPress}
              style={({ pressed }) => [
                {
                  width: tokens.scale(44),
                  height: tokens.scale(44),
                  borderRadius: tokens.radii.full,
                  backgroundColor: colors.surfaceElevated,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                },
                pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Profilim"
            >
              {showImage ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <Text
                  style={{
                    color: colors.primaryText,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                    fontWeight: tokens.typography.fontWeight.bold,
                  }}
                >
                  {getInitials()}
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          onLoginPress && (
            <Pressable
              onPress={onLoginPress}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: tokens.scale(4),
                  backgroundColor: colors.surface,
                  paddingHorizontal: tokens.scale(tokens.spacing.md),
                  paddingVertical: tokens.verticalScale(8),
                  borderRadius: tokens.radii.full,
                  borderWidth: 1,
                  borderColor: colors.primary,
                },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={language === 'ar' ? 'تسجيل الدخول' : 'Giriş Yap'}
            >
              <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
              <Text
                style={{
                  color: colors.primary,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                  fontWeight: tokens.typography.fontWeight.bold,
                }}
              >
                {language === 'ar' ? 'تسجيل الدخول' : 'Giriş Yap'}
              </Text>
            </Pressable>
          )
        )}
      </View>

      {/* Ek Açıklama Alanı */}
      <Text
        style={{
          fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
          color: colors.muted,
          lineHeight: 20,
        }}
      >
        {t.rooms.headerSubtitle}
      </Text>

      {/* Header İçi Entegre Arama Input Alanı */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: tokens.moderateScale(tokens.radii.lg),
          paddingHorizontal: tokens.scale(tokens.spacing.md),
          height: tokens.verticalScale(46),
          borderWidth: 1,
          borderColor: colors.border,
          gap: tokens.scale(tokens.spacing.sm),
          marginTop: tokens.verticalScale(4),
        }}
      >
        <Ionicons name="search" size={tokens.moderateScale(18)} color={colors.muted} />
        <TextInput
          style={{
            color: colors.text,
            fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
            height: '100%',
          }}
          placeholder={t.rooms.searchPlaceholder}
          placeholderTextColor={colors.muted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel={t.accessibility.searchHint}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={onClearSearch}
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              width: tokens.scale(28),
              height: tokens.scale(28),
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Aramayı temizle"
          >
            <Ionicons name="close-circle" size={tokens.moderateScale(18)} color={colors.muted} />
          </Pressable>
        )}
      </View>


    </View>
  );
};
