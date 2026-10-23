import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';
import { useI18n } from "@/i18n";

type ChatRoomHeaderProps = {
  roomName: string;
  plateCode: string;
  region: string;
  onlineCount?: number;
  onInfoPress?: () => void;
};

export const ChatRoomHeader: React.FC<ChatRoomHeaderProps> = ({
  roomName,
  plateCode,
  region,
  onlineCount = 0,
  onInfoPress,
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: tokens.scale(tokens.spacing.base),
        paddingVertical: tokens.verticalScale(tokens.spacing.sm),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.scale(tokens.spacing.sm) }}>
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t.roomHeader.back}
          style={({ pressed }) => [
            {
              width: tokens.scale(36),
              height: tokens.scale(36),
              borderRadius: tokens.moderateScale(tokens.radii.md),
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
              justifyContent: 'center',
              alignItems: 'center',
            },
            pressed && { backgroundColor: colors.surfaceElevated },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>

        <View
          style={{
            paddingHorizontal: tokens.scale(8),
            paddingVertical: tokens.verticalScale(3),
            borderRadius: tokens.moderateScale(tokens.radii.sm),
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
              fontWeight: tokens.typography.fontWeight.heavy,
            }}
          >
            {plateCode}
          </Text>
        </View>

        <View>
          <Text
            style={{
              color: colors.text,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
              fontWeight: tokens.typography.fontWeight.heavy,
            }}
          >
            {t.roomHeader.roomTitle(roomName)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
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
                color: colors.muted,
                fontSize: tokens.moderateScale(11),
                fontWeight: tokens.typography.fontWeight.semibold,
              }}
            >
              {onlineCount > 0 ? t.rooms.onlineUsers(onlineCount) : t.rooms.noOnlineUsers}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        hitSlop={10}
        onPress={onInfoPress}
        accessibilityRole="button"
        accessibilityLabel={t.roomHeader.infoA11y}
        style={({ pressed }) => [
          {
            paddingHorizontal: tokens.scale(8),
            paddingVertical: tokens.verticalScale(4),
            borderRadius: tokens.radii.full,
            backgroundColor: colors.primaryTint,
            borderWidth: 1,
            borderColor: colors.border,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text
          style={{
            color: colors.primaryText,
            fontSize: tokens.moderateScale(11),
            fontWeight: tokens.typography.fontWeight.bold,
          }}
        >
          {t.roomHeader.rulesAndListings}
        </Text>
      </Pressable>
    </View>
  );
};