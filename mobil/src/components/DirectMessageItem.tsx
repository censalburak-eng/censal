import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Linking,
  Animated,
  PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { DirectMessage } from '../types/directMessages.types';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { ImageViewerModal } from './ui/ImageViewerModal';
import { AudioPlayerBubble } from './ui/AudioPlayerBubble';
import { useMediaUrl } from '../hooks/useMediaUrl';

export type DirectMessageItemProps = {
  item: DirectMessage;
  isMe: boolean;
  onReply?: (message: DirectMessage) => void;
  onOptionsPress?: (message: DirectMessage) => void;
};

const DirectMessageItemComponent: React.FC<DirectMessageItemProps> = ({
  item,
  isMe,
  onReply,
  onOptionsPress,
}) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  // ─── Sağa Kaydırarak Yanıtlama (Swipe to Reply) ─────────────
  const panX = useRef(new Animated.Value(0)).current;
  const replyTriggeredRef = useRef(false);
  const itemRef = useRef(item);
  const onReplyRef = useRef(onReply);
  itemRef.current = item;
  onReplyRef.current = onReply;

  const resetPan = () => {
    Animated.spring(panX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 7,
      speed: 16,
    }).start();
    replyTriggeredRef.current = false;
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dy) < 10,
      onPanResponderMove: (_, g) => {
        if (g.dx <= 0) return;
        panX.setValue(Math.min(g.dx * 0.55, 60));
        if (g.dx > 40 && !replyTriggeredRef.current) {
          replyTriggeredRef.current = true;
          onReplyRef.current?.(itemRef.current);
        }
      },
      onPanResponderRelease: resetPan,
      onPanResponderTerminate: resetPan,
    })
  ).current;

  let formattedTime = '--:--';
  try {
    if (item.created_at) {
      const cleanStr =
        typeof item.created_at === 'string' && item.created_at.includes(' ') && !item.created_at.includes('T')
          ? item.created_at.replace(' ', 'T')
          : item.created_at;
      const d = new Date(cleanStr);
      if (!isNaN(d.getTime())) {
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        formattedTime = `${hours}:${minutes}`;
      }
    }
  } catch {}

  const bubbleBg = isMe
    ? (isDark ? '#005C4B' : colors.primary)
    : (isDark ? '#202C33' : colors.surface);
  const bubbleBorder = isMe
    ? (isDark ? '#005C4B' : colors.primary)
    : colors.border;
  const textColor = isMe ? '#FFFFFF' : colors.text;
  const timeColor = isMe ? 'rgba(255, 255, 255, 0.65)' : colors.muted;

  const cleanBody = item?.body ?? '';
  const idStr = String(item?.id ?? '');

  // Fotoğraf/ses: private dm-media yolu ise imzalı URL'e çevrilir, eski mesajlardaki tam URL olduğu gibi kullanılır
  const mediaKey = item.type === 'image' || item.type === 'audio' ? (item.media_key ?? item.body) : null;
  const mediaUrl = useMediaUrl(mediaKey);

  const handleOpenLocation = () => {
    if (!item.lat || !item.lng) return;
    const url = `https://maps.google.com/?q=${item.lat},${item.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  const meta = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: 3,
        marginBottom: 1,
      }}
    >
      <Text style={{ color: timeColor, fontSize: tokens.moderateScale(10) }}>
        {formattedTime}
      </Text>
      {isMe && (
        <Ionicons
          name={idStr.startsWith('optimistic_') ? 'checkmark' : 'checkmark-done'}
          size={15}
          color={item?.read_at ? '#53BDEB' : 'rgba(255, 255, 255, 0.65)'}
        />
      )}
    </View>
  );

  return (
    <View style={{ marginVertical: tokens.verticalScale(2.5), width: '100%' }}>
      {/* Kaydırma Reply İkonu */}
      <Animated.View
        style={{
          position: 'absolute',
          left: tokens.scale(16),
          top: '50%',
          marginTop: -16,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isDark ? '#2A3942' : '#E2E8F0',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: panX.interpolate({
            inputRange: [0, 18, 40],
            outputRange: [0, 0.4, 1],
            extrapolate: 'clamp',
          }),
          transform: [
            {
              scale: panX.interpolate({
                inputRange: [0, 20, 40],
                outputRange: [0.6, 0.85, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
        }}
      >
        <Ionicons
          name="arrow-undo"
          size={18}
          color={isDark ? '#25D366' : colors.primaryText}
        />
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX: panX }],
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          alignItems: isMe ? 'flex-end' : 'flex-start',
        }}
      >
        <Pressable
          onLongPress={() => onOptionsPress?.(item)}
          delayLongPress={300}
          style={({ pressed }) => [
            {
              maxWidth: '84%',
              borderRadius: tokens.moderateScale(14),
              borderBottomEndRadius: isMe ? 2 : tokens.moderateScale(14),
              borderBottomStartRadius: !isMe ? 2 : tokens.moderateScale(14),
              backgroundColor: bubbleBg,
              paddingHorizontal: tokens.scale(10),
              paddingTop: tokens.verticalScale(6),
              paddingBottom: tokens.verticalScale(5),
              borderWidth: isMe ? 0 : 1,
              borderColor: bubbleBorder,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.12,
              shadowRadius: 1.5,
              elevation: 1,
            },
            pressed && { opacity: 0.94 },
          ]}
        >
          {/* Alıntılanan Mesaj (Reply Quote) */}
          {item.replyToMessage && (
            <View
              style={{
                backgroundColor: isMe
                  ? (isDark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.22)')
                  : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                borderLeftWidth: 4,
                borderLeftColor: isMe ? '#34D399' : colors.primary,
                borderRadius: tokens.moderateScale(6),
                paddingVertical: tokens.verticalScale(4),
                paddingHorizontal: tokens.scale(8),
                marginBottom: tokens.verticalScale(4),
              }}
            >
              <Text
                style={{
                  color: isMe ? '#86EFAC' : colors.primaryText,
                  fontSize: tokens.moderateScale(11),
                  fontWeight: '700',
                  marginBottom: 1,
                }}
              >
                {item.replyToMessage.userName}
              </Text>
              <Text
                style={{
                  color: isMe ? 'rgba(255, 255, 255, 0.9)' : colors.text,
                  fontSize: tokens.moderateScale(11.5),
                  lineHeight: 16,
                }}
                numberOfLines={2}
              >
                {item.replyToMessage.body}
              </Text>
            </View>
          )}

          {/* 1. GÖRSEL (IMAGE) */}
          {item.type === 'image' && (() => {
            const imgSrc = mediaUrl ?? '';
            return (
              <View>
                <ImageViewerModal
                  visible={isImageModalVisible && !!mediaUrl}
                  imageUrl={imgSrc}
                  onClose={() => setIsImageModalVisible(false)}
                />
                <Pressable
                  onPress={() => setIsImageModalVisible(true)}
                  onLongPress={() => onOptionsPress?.(item)}
                  delayLongPress={300}
                  style={({ pressed }) => [
                    {
                      width: 220,
                      height: 220,
                      borderRadius: tokens.moderateScale(tokens.radii.md),
                      overflow: 'hidden',
                      marginVertical: 2,
                      backgroundColor: isDark ? '#182229' : '#E2E8F0',
                    },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Image
                    // İmzalı URL saatlik değişse de önbellek dosya yoluna göre tutulur
                    source={mediaUrl ? { uri: imgSrc, cacheKey: mediaKey ?? undefined } : null}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                </Pressable>
                {cleanBody && cleanBody !== '📷 Fotoğraf' && !cleanBody.startsWith('http') && (
                  <Text
                    style={{
                      color: textColor,
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                      lineHeight: 20,
                      marginTop: 4,
                    }}
                  >
                    {cleanBody}
                  </Text>
                )}
                <View style={{ alignSelf: 'flex-end', marginTop: 2 }}>{meta}</View>
              </View>
            );
          })()}

          {/* 2. SES (AUDIO) */}
          {item.type === 'audio' && (
            <View>
              <AudioPlayerBubble
                mediaPath={mediaUrl ?? ''}
                durationSec={item.duration_sec}
                isCurrentUser={isMe}
              />
              <View style={{ alignSelf: 'flex-end', marginTop: 2 }}>{meta}</View>
            </View>
          )}

          {/* 3. KONUM (LOCATION) */}
          {item.type === 'location' && (
            <View style={{ width: 210 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="location-sharp" size={18} color={isMe ? '#FFFFFF' : colors.primary} />
                <Text
                  style={{
                    color: textColor,
                    fontWeight: tokens.typography.fontWeight.bold,
                    fontSize: tokens.moderateScale(13),
                  }}
                >
                  {t.messageItem.sharedLocation}
                </Text>
              </View>
              {cleanBody ? (
                <Text
                  style={{
                    color: isMe ? 'rgba(255, 255, 255, 0.9)' : colors.text,
                    fontSize: tokens.moderateScale(12),
                    marginBottom: 6,
                  }}
                  numberOfLines={2}
                >
                  {cleanBody}
                </Text>
              ) : null}
              <Pressable
                onPress={handleOpenLocation}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingVertical: 5,
                    paddingHorizontal: 8,
                    borderRadius: 6,
                    backgroundColor: isMe
                      ? (isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)')
                      : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                    alignSelf: 'flex-start',
                    marginBottom: 4,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="map-outline" size={14} color={isMe ? '#FFFFFF' : colors.primaryText} />
                <Text
                  style={{
                    color: isMe ? '#FFFFFF' : colors.primaryText,
                    fontSize: tokens.moderateScale(11.5),
                    fontWeight: '600',
                  }}
                >
                  {t.messageItem.openInMap}
                </Text>
              </Pressable>
              <View style={{ alignSelf: 'flex-end' }}>{meta}</View>
            </View>
          )}

          {/* 4. METİN (TEXT) */}
          {item.type === 'text' && (
            cleanBody.length < 28 && !cleanBody.includes('\n') ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <Text
                  style={{
                    color: textColor,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                    lineHeight: 21,
                    flexShrink: 1,
                  }}
                >
                  {cleanBody}
                </Text>
                {meta}
              </View>
            ) : (
              <View style={{ gap: 2 }}>
                <Text
                  style={{
                    color: textColor,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                    lineHeight: 21,
                  }}
                >
                  {cleanBody}
                </Text>
                <View style={{ alignSelf: 'flex-end' }}>{meta}</View>
              </View>
            )
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
};

export const DirectMessageItem = React.memo(DirectMessageItemComponent);
