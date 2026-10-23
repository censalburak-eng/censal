import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types/profile.types';
import { CITIES_DATA } from '../data/cities';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';
import { useI18n } from '../i18n';
import { ImageViewerModal } from './ui/ImageViewerModal';

type ProfileHeroCardProps = {
  profile?: Profile | null;
  phone?: string | null;
};

export const ProfileHeroCard: React.FC<ProfileHeroCardProps> = ({ profile, phone }) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const ad = profile?.ad || profile?.first_name || '';
  const soyad = profile?.soyad || profile?.last_name || '';
  const fullName = `${ad} ${soyad}`.trim() || t.profileHero.fallbackName;
  const isPrivate = profile?.numara_gizli ?? profile?.hide_phone ?? true;
  const avatarUrl = profile?.foto_url ?? profile?.avatar_url;

  const initials = ad || soyad
    ? `${ad[0] ?? ''}${soyad[0] ?? ''}`.toLocaleUpperCase(t.common.locale)
    : 'U';

  const cityData = CITIES_DATA.find(c => c.plateCode === String(profile?.city_id).padStart(2, '0')) ?? {
    plateCode: profile?.city_id,
    name: profile?.sehir,
  };

  const maskedPhone = () => {
    if (!phone) return null;
    if (!isPrivate) return phone;
    const clean = phone.replace(/\s+/g, '');
    if (clean.length >= 10) {
      const prefix = clean.slice(0, 6);
      return `${prefix} ••• •• ${clean.slice(-2)}`;
    }
    return phone;
  };

  const displayPhone = maskedPhone();

  return (
    <>
      <ImageViewerModal
        visible={isPreviewVisible}
        imageUrl={avatarUrl}
        title={fullName}
        onClose={() => setIsPreviewVisible(false)}
      />

      <Pressable
        onPress={() => router.push('/(auth)/complete-profile')}
        style={({ pressed }) => [
          {
            backgroundColor: colors.surface,
            borderRadius: tokens.moderateScale(tokens.radii.lg),
            padding: tokens.scale(tokens.spacing.md),
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.scale(tokens.spacing.md),
          },
          pressed && { backgroundColor: colors.surfaceElevated },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t.profileHero.editA11y}
      >
        {/* Avatar */}
        <Pressable
          onPress={(e) => {
            if (avatarUrl) {
              e.stopPropagation?.();
              setIsPreviewVisible(true);
            }
          }}
          style={{ position: 'relative' }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{
                width: tokens.scale(56),
                height: tokens.scale(56),
                borderRadius: tokens.radii.full,
                backgroundColor: colors.surfaceElevated,
              }}
              contentFit="cover"
            />
          ) : (
          <View
            style={{
              width: tokens.scale(56),
              height: tokens.scale(56),
              borderRadius: tokens.radii.full,
              backgroundColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: tokens.moderateScale(20),
                fontWeight: tokens.typography.fontWeight.heavy,
                letterSpacing: 0.5,
              }}
            >
              {initials}
            </Text>
          </View>
        )}

        {/* Minik Kamera Rozeti */}
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: tokens.scale(20),
            height: tokens.scale(20),
            borderRadius: tokens.radii.full,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="camera" size={11} color={colors.text} />
        </View>
      </Pressable>

      {/* Kullanıcı Detayları */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
            fontWeight: tokens.typography.fontWeight.bold,
          }}
          numberOfLines={1}
        >
          {fullName}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.scale(8), flexWrap: 'wrap' }}>
          {/* Şehir & Plaka Rozeti */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: colors.bg,
              paddingHorizontal: tokens.scale(7),
              paddingVertical: tokens.verticalScale(2),
              borderRadius: tokens.radii.full,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.primaryText,
                fontSize: tokens.moderateScale(11),
                fontWeight: tokens.typography.fontWeight.bold,
              }}
            >
              {cityData.plateCode}
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: tokens.moderateScale(11),
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              {cityData.name}
            </Text>
          </View>

          {/* Telefon Numarası & Gizlilik */}
          {displayPhone && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {isPrivate && (
                <Ionicons name="lock-closed" size={11} color={colors.muted} />
              )}
              <Text
                style={{
                  color: colors.muted,
                  fontSize: tokens.moderateScale(11.5),
                }}
              >
                {displayPhone}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Sağ Ok */}
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
    </>
  );
};
