import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Conversation } from '../types/directMessages.types';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { Badge, PlateBadge } from './ui';
import { useI18n } from '../i18n';

type ConversationListItemProps = {
  item: Conversation;
  onPress: (item: Conversation) => void;
  onLongPress?: (item: Conversation) => void;
};

const ConversationListItemComponent: React.FC<ConversationListItemProps> = ({ item, onPress, onLongPress }) => {
  const { colors } = useTheme();
  const { isRTL, language } = useI18n();

  const other = item.otherUser;
  const fullName = other ? `${other.first_name} ${other.last_name}`.trim() : 'Kullanıcı';
  const initials = fullName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const formattedTime = item.last_message_at
    ? new Date(item.last_message_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    : '';

  const hasUnread = (item.unreadCount ?? 0) > 0;

  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress?.(item)}
      delayLongPress={300}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          paddingVertical: tokens.verticalScale(tokens.spacing.md),
          backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: tokens.scale(tokens.spacing.sm),
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${fullName} ile sohbet`}
    >
      {/* Avatar */}
      <View
        style={{
          width: tokens.scale(48),
          height: tokens.scale(48),
          borderRadius: tokens.radii.full,
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1.5,
          borderColor: hasUnread ? colors.primary : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {other?.avatar_url ? (
          <Image
            source={{ uri: other.avatar_url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Text
            style={{
              color: hasUnread ? colors.primary : colors.text,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
              fontWeight: tokens.typography.fontWeight.bold,
            }}
          >
            {initials || 'U'}
          </Text>
        )}
      </View>

      {/* Bilgiler */}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                fontWeight: hasUnread
                  ? tokens.typography.fontWeight.heavy
                  : tokens.typography.fontWeight.semibold,
              }}
              numberOfLines={1}
            >
              {fullName}
            </Text>
          </View>

          <Text
            style={{
              color: hasUnread ? colors.primary : colors.muted,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
              fontWeight: hasUnread ? '700' : '400',
            }}
          >
            {formattedTime}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text
            style={{
              color: hasUnread ? colors.text : colors.muted,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
              fontWeight: hasUnread ? '600' : '400',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.lastMessageSnippet || (language === 'tr' ? 'Mesajlaşmayı başlatmak için dokunun' : 'انقر لبدء المراسلة.')}
          </Text>

          <Badge count={item.unreadCount} variant="danger" size="sm" />
        </View>
      </View>
    </Pressable>
  );
};

export const ConversationListItem = React.memo(ConversationListItemComponent);
