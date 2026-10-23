import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CityRoom } from '../types/rooms.types';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { PlateBadge } from './ui';

type RoomCardProps = {
  room: CityRoom;
  onPress: (room: CityRoom) => void;
  isLocked?: boolean;
  onlineCount?: number;
};

const RoomCardComponent: React.FC<RoomCardProps> = ({ room, onPress, isLocked = false, onlineCount = 0 }) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  return (
    <Pressable
      style={({ pressed }) => [
        {
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          paddingVertical: tokens.verticalScale(14),
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        pressed && {
          backgroundColor: colors.surfaceElevated,
        },
      ]}
      onPress={() => onPress(room)}
      accessibilityRole="button"
      accessibilityLabel={t.accessibility.roomItem(room.name, room.plateCode)}
    >
      {/* Sol Kısım: Plaka Rozeti + Şehir Adı + Bilgi */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          gap: tokens.scale(tokens.spacing.md),
        }}
      >
        {/* Plaka Kutusu */}
        <PlateBadge code={room.plateCode} />

        {/* Şehir Bilgisi */}
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.md),
                fontWeight: tokens.typography.fontWeight.bold,
              }}
              numberOfLines={1}
            >
              {room.name}
            </Text>
          </View>

          {/* Çevrim içi sayısı */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginTop: 2,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: onlineCount > 0 ? '#22C55E' : colors.muted,
                opacity: onlineCount > 0 ? 1 : 0.4,
              }}
            />
            <Text
              style={{
                fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                color: onlineCount > 0 ? colors.text : colors.muted,
                fontWeight: onlineCount > 0 ? '500' : '400',
              }}
            >
              {onlineCount > 0 ? t.rooms.onlineUsers(onlineCount) : t.rooms.noOnlineUsers}
            </Text>
          </View>
        </View>
      </View>

      {/* Sağ Kısım: Sabit İlan Rozeti / Kilit / Chevron */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.scale(tokens.spacing.sm),
        }}
      >
        {isLocked ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
              paddingHorizontal: tokens.scale(8),
              paddingVertical: tokens.verticalScale(3),
              borderRadius: tokens.radii.full,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
            }}
          >
            <Ionicons name="lock-closed" size={12} color={colors.danger} />
            <Text
              style={{
                fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                fontWeight: tokens.typography.fontWeight.bold,
                color: colors.danger,
              }}
            >
              {t.rooms.lockedBadge}
            </Text>
          </View>
        ) : (
          <Ionicons
            name="chevron-forward"
            size={tokens.moderateScale(18)}
            color={colors.muted}
          />
        )}
      </View>
    </Pressable>
  );
};

export const RoomCard = React.memo(RoomCardComponent);
