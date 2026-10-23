import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '@/i18n';
import { ImageViewerModal } from './ui/ImageViewerModal';

type DirectChatHeaderProps = {
  fullName: string;
  initials: string;
  avatarUrl?: string | null;
  isBlockedByMe: boolean;
  isOnline?: boolean;
  statusText?: string;
  onBackPress: () => void;
  onOptionsPress: () => void;
};

export const DirectChatHeader: React.FC<DirectChatHeaderProps> = ({
  fullName,
  initials,
  avatarUrl,
  isBlockedByMe,
  isOnline,
  statusText,
  onBackPress,
  onOptionsPress,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  return (
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.scale(tokens.spacing.sm), flex: 1 }}>
        <Pressable
          hitSlop={12}
          onPress={onBackPress}
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
          accessibilityRole="button"
          accessibilityLabel={t.roomHeader.back}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>

        <ImageViewerModal
          visible={isPreviewVisible}
          imageUrl={avatarUrl}
          title={fullName}
          onClose={() => setIsPreviewVisible(false)}
        />

        {/* Avatar */}
        <Pressable
          onPress={() => {
            if (avatarUrl) setIsPreviewVisible(true);
          }}
          disabled={!avatarUrl}
          style={{
            width: tokens.scale(38),
            height: tokens.scale(38),
            borderRadius: tokens.radii.full,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Text
              style={{
                color: colors.primaryText,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                fontWeight: tokens.typography.fontWeight.bold,
              }}
            >
              {initials || 'U'}
            </Text>
          )}
        </Pressable>

        <View style={{ flex: 1, gap: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
              fontWeight: tokens.typography.fontWeight.bold,
            }}
            numberOfLines={1}
          >
            {fullName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
            {isOnline && (
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: '#22C55E',
                }}
              />
            )}
            <Text
              style={{
                color: isOnline ? '#22C55E' : colors.muted,
                fontSize: tokens.moderateScale(12),
                fontWeight: isOnline ? '600' : '400',
              }}
              numberOfLines={1}
            >
              {statusText || t.directChat.headerSubtitle}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        hitSlop={12}
        onPress={onOptionsPress}
        style={({ pressed }) => [
          {
            width: tokens.scale(36),
            height: tokens.scale(36),
            borderRadius: tokens.moderateScale(tokens.radii.md),
            justifyContent: 'center',
            alignItems: 'center',
          },
          pressed && { backgroundColor: colors.surfaceElevated },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t.directChat.optionsA11y}
      >
        <Ionicons
          name={isBlockedByMe ? 'ban' : 'ellipsis-vertical'}
          size={20}
          color={isBlockedByMe ? colors.danger : colors.text}
        />
      </Pressable>
    </View>
  );
};