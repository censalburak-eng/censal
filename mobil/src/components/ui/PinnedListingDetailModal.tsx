import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { PinnedListing } from '../../types/messages.types';
import { useTheme } from '../../theme';
import { tokens } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { ImageViewerModal } from './ImageViewerModal';

export type PinnedListingDetailModalProps = {
  visible: boolean;
  listing: PinnedListing | null;
  cityName?: string;
  plateCode?: string;
  onClose: () => void;
  onCallUser?: (listing: PinnedListing) => void;
  onDirectMessage?: (listing: PinnedListing) => void;
  onGoToMessage?: (messageId: string) => void;
};

const PinnedAudioPlayer: React.FC<{ mediaPath: string; durationSec?: number | null }> = ({
  mediaPath,
  durationSec,
}) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const [isActivated, setIsActivated] = useState(false);
  const player = useAudioPlayer(isActivated ? mediaPath : null);
  const status = useAudioPlayerStatus(player);

  const togglePlay = () => {
    if (!isActivated) {
      setIsActivated(true);
      setTimeout(() => {
        try {
          player.play();
        } catch { }
      }, 100);
      return;
    }
    if (status.playing) {
      player.pause();
    } else {
      if (status.duration && status.currentTime >= status.duration) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const total = status.duration || durationSec || 0;
  const current = status.currentTime || 0;
  const displaySec = status.playing ? Math.floor(current) : (durationSec || Math.floor(total));
  const m = Math.floor(displaySec / 60);
  const s = (displaySec % 60).toString().padStart(2, '0');

  return (
    <View
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: tokens.radii.md,
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
      }}
    >
      <Pressable
        onPress={togglePlay}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={status.playing ? 'pause' : 'play'}
          size={22}
          color="#FFFFFF"
          style={{ marginLeft: status.playing ? 0 : 2 }}
        />
      </Pressable>
      <View style={{ flex: 1, gap: 2, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
          {t.attach.voice}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>
          {m}:{s}
        </Text>
      </View>
    </View>
  );
};

export const PinnedListingDetailModal: React.FC<PinnedListingDetailModalProps> = ({
  visible,
  listing,
  cityName,
  plateCode,
  onClose,
  onCallUser,
  onDirectMessage,
  onGoToMessage,
}) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  if (!listing) return null;

  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  const mediaUri = listing.mediaPath ?? listing.body;

  const expiresLabel = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
    const mins = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
    return hours > 0 ? t.pinnedBar.hoursLeft(hours) : t.pinnedBar.minutesLeft(mins);
  };

  const initialLetter = (listing.userName || t.profileHero.fallbackName)[0]?.toUpperCase() ?? '?';

  const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : colors.bg;

  // ── İlan tipine göre içerik haritası ─────────────────────────────────────
  const contentRenderers: Record<string, () => React.ReactNode> = {
    image: () => (
      <View style={{ gap: 8 }}>
        <Pressable
          onPress={() => setIsPreviewVisible(true)}
          style={{
            width: '100%',
            height: tokens.verticalScale(210),
            borderRadius: tokens.moderateScale(tokens.radii.lg),
            overflow: 'hidden',
            backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
            borderWidth: 1,
            borderColor: colors.border,
            position: 'relative',
          }}
        >
          <Image source={{ uri: mediaUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          <View
            style={{
              position: 'absolute',
              end: 8,
              bottom: 8,
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: tokens.radii.full,
              paddingHorizontal: 8,
              paddingVertical: 4,
              flexDirection: rowDirection,
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Ionicons name="expand" size={12} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
              {t.profile.photoPreview}
            </Text>
          </View>
        </Pressable>

        {!!listing.caption && (
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: tokens.moderateScale(tokens.radii.md),
              padding: tokens.scale(tokens.spacing.sm),
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                lineHeight: 22,
                textAlign,
              }}
            >
              {listing.caption}
            </Text>
          </View>
        )}
      </View>
    ),

    audio: () => <PinnedAudioPlayer mediaPath={mediaUri} durationSec={listing.durationSec} />,

    location: () => (
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: tokens.moderateScale(tokens.radii.lg),
          padding: tokens.scale(tokens.spacing.base),
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="location" size={18} color={colors.danger} />
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
              fontWeight: tokens.typography.fontWeight.bold,
              flex: 1,
              textAlign,
            }}
          >
            {listing.body || t.attach.location}
          </Text>
        </View>

        {listing.lat != null && listing.lng != null && (
          <Pressable
            onPress={() => {
              Linking.openURL(`https://maps.google.com/?q=${listing.lat},${listing.lng}`).catch(() => { });
            }}
            style={({ pressed }) => ({
              flexDirection: rowDirection,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: colors.primary,
              paddingVertical: 10,
              borderRadius: tokens.radii.md,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="map-outline" size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
              {t.messageItem.openInMap}
            </Text>
          </Pressable>
        )}
      </View>
    ),
  };

  const renderTextContent = () => (
    <View
      style={{
        backgroundColor: cardBg,
        borderRadius: tokens.moderateScale(tokens.radii.lg),
        padding: tokens.scale(tokens.spacing.base),
        borderWidth: 1,
        borderColor: colors.border,
        borderStartWidth: 4,
        borderStartColor: colors.primary,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
          lineHeight: 24,
          textAlign,
        }}
      >
        {listing.body}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: tokens.scale(tokens.spacing.base),
        }}
      >
        <Pressable
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          onPress={onClose}
        />

        <View
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: colors.surface,
            borderRadius: tokens.moderateScale(tokens.radii.xl),
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Üst Rozet & Başlık Barı */}
          <View
            style={{
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
              paddingHorizontal: tokens.scale(tokens.spacing.base),
              paddingVertical: tokens.verticalScale(tokens.spacing.sm),
              flexDirection: rowDirection,
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: tokens.scale(6),
                  paddingVertical: tokens.verticalScale(2),
                  borderRadius: tokens.radii.sm,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: tokens.moderateScale(10),
                    fontWeight: tokens.typography.fontWeight.heavy,
                  }}
                >
                  {plateCode ?? '81'}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.primaryText,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  fontWeight: tokens.typography.fontWeight.heavy,
                }}
              >
                {cityName ? `${cityName} • ` : ''}
                {t.pinnedBar.detailBadge}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t.common.close}
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ImageViewerModal
            visible={isPreviewVisible}
            imageUrl={mediaUri}
            title={listing.userName}
            caption={listing.caption}
            onClose={() => setIsPreviewVisible(false)}
          />

          <ScrollView
            style={{ maxHeight: tokens.verticalScale(420) }}
            contentContainerStyle={{
              padding: tokens.scale(tokens.spacing.base),
              gap: tokens.verticalScale(tokens.spacing.md),
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Profil Satırı */}
            <View
              style={{
                flexDirection: rowDirection,
                alignItems: 'center',
                gap: tokens.scale(tokens.spacing.sm),
              }}
            >
              <View
                style={{
                  width: tokens.scale(46),
                  height: tokens.scale(46),
                  borderRadius: tokens.radii.full,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {listing.avatarUrl ? (
                  <Image
                    source={{ uri: listing.avatarUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
                      fontWeight: tokens.typography.fontWeight.heavy,
                    }}
                  >
                    {initialLetter}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                    fontWeight: tokens.typography.fontWeight.bold,
                  }}
                >
                  {listing.userName}
                </Text>
                <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="time-outline" size={13} color="#D97706" />
                  <Text
                    style={{
                      color: isDark ? '#FBBF24' : '#D97706',
                      fontSize: tokens.moderateScale(11),
                      fontWeight: tokens.typography.fontWeight.semibold,
                    }}
                  >
                    {expiresLabel(listing.expiresAt)}
                  </Text>
                </View>
              </View>
            </View>

            {/* İlan İçeriği / Medya */}
            {(contentRenderers[listing.type || 'text'] ?? renderTextContent)()}
          </ScrollView>

          {/* Alt Butonlar */}
          <View
            style={{
              padding: tokens.scale(tokens.spacing.base),
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
              gap: tokens.verticalScale(tokens.spacing.xs),
            }}
          >
            <View style={{ flexDirection: rowDirection, gap: tokens.scale(tokens.spacing.xs) }}>
              {/* DM */}
              <Pressable
                onPress={() => {
                  onClose();
                  onDirectMessage?.(listing);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: tokens.verticalScale(11),
                  borderRadius: tokens.moderateScale(tokens.radii.md),
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: rowDirection,
                  gap: 6,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                    fontWeight: tokens.typography.fontWeight.heavy,
                  }}
                >
                  {t.pinnedBar.detailDm}
                </Text>
              </Pressable>

              {/* Ara (numara gizli değilse) */}
              {!listing.isPhoneHidden && (
                <Pressable
                  onPress={() => {
                    onClose();
                    onCallUser?.(listing);
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: tokens.verticalScale(11),
                    borderRadius: tokens.moderateScale(tokens.radii.md),
                    backgroundColor: colors.surfaceElevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: rowDirection,
                    gap: 6,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons name="call" size={16} color={colors.primaryText} />
                  <Text
                    style={{
                      color: colors.primaryText,
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                      fontWeight: tokens.typography.fontWeight.heavy,
                    }}
                  >
                    {t.pinnedBar.detailCall}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Odadaki Mesaja Git */}
            <Pressable
              onPress={() => {
                onClose();
                onGoToMessage?.(listing.messageId);
              }}
              style={({ pressed }) => ({
                paddingVertical: tokens.verticalScale(9),
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: rowDirection,
                gap: 5,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="arrow-down-circle-outline" size={15} color={colors.muted} />
              <Text
                style={{
                  color: colors.muted,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
              >
                {t.pinnedBar.detailGoToMessage}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};