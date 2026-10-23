import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { PinnedListing } from '../../types/messages.types';
import { useTheme } from '../../theme';
import { tokens } from '../../theme/tokens';
import { useI18n } from '../../i18n';

export type PinnedListingsModalProps = {
  visible: boolean;
  listings: readonly PinnedListing[];
  maxPins?: number;
  pinPrice?: string;
  onClose: () => void;
  onSelectListing: (listing: PinnedListing) => void;
  onRequestPinPress: () => void;
  onPaywallPress?: () => void;
};

const formatDuration = (sec: number) =>
  `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

export const PinnedListingsModal: React.FC<PinnedListingsModalProps> = ({
  visible,
  listings,
  maxPins = 3,
  pinPrice,
  onClose,
  onSelectListing,
  onRequestPinPress,
}) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();

  const count = listings.length;
  const limit = maxPins > 0 ? maxPins : 3;
  const isFull = count >= limit;
  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  const expiresLabel = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
    const mins = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
    return hours > 0 ? t.pinnedBar.hoursShort(hours) : t.pinnedBar.minutesShort(mins);
  };

  // ── İlan tipine göre önizleme haritası ───────────────────────────────────
  const previewRenderers: Record<string, (item: PinnedListing) => React.ReactNode> = {
    image: (item) => (
      <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: tokens.scale(48),
            height: tokens.scale(48),
            borderRadius: tokens.radii.sm,
            overflow: 'hidden',
            backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
          }}
        >
          <Image
            source={{ uri: item.mediaPath ?? item.body }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 4 }}>
            <Ionicons name="image" size={12} color={colors.primaryText} />
            <Text style={{ color: colors.primaryText, fontSize: 11, fontWeight: '700' }}>
              {t.attach.photo}
            </Text>
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
              lineHeight: 18,
              textAlign,
            }}
            numberOfLines={2}
          >
            {item.caption || item.body}
          </Text>
        </View>
      </View>
    ),

    audio: (item) => (
      <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 8, paddingVertical: 2 }}>
        <View
          style={{
            width: tokens.scale(32),
            height: tokens.scale(32),
            borderRadius: tokens.radii.full,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="mic" size={16} color="#FFFFFF" />
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
            fontWeight: tokens.typography.fontWeight.semibold,
          }}
        >
          {t.attach.voice}
          {item.durationSec ? ` (${formatDuration(item.durationSec)})` : ''}
        </Text>
      </View>
    ),

    location: (item) => (
      <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 8, paddingVertical: 2 }}>
        <View
          style={{
            width: tokens.scale(32),
            height: tokens.scale(32),
            borderRadius: tokens.radii.full,
            backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="location" size={16} color={colors.danger} />
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
            flex: 1,
            textAlign,
          }}
          numberOfLines={1}
        >
          {item.body || t.attach.location}
        </Text>
      </View>
    ),
  };

  const renderTextPreview = (item: PinnedListing) => (
    <Text
      style={{
        color: colors.text,
        fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
        lineHeight: 20,
        textAlign,
      }}
      numberOfLines={3}
    >
      {item.body}
    </Text>
  );

  const pinButtonLabel = pinPrice ? `${t.pinnedBar.pinHere} • ${pinPrice}` : t.pinnedBar.pinHere;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <View
          style={{
            backgroundColor: colors.surface,
            borderTopStartRadius: tokens.moderateScale(28),
            borderTopEndRadius: tokens.moderateScale(28),
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            paddingTop: tokens.verticalScale(tokens.spacing.md),
            paddingBottom: Platform.OS === 'ios' ? 36 : 24,
            maxHeight: tokens.verticalScale(520),
          }}
        >
          {/* Çekme Çubuğu */}
          <View
            style={{
              width: 44,
              height: 5,
              borderRadius: tokens.radii.full,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.15)',
              alignSelf: 'center',
              marginBottom: tokens.verticalScale(tokens.spacing.sm),
            }}
          />

          {/* Başlık Satırı */}
          <View
            style={{
              flexDirection: rowDirection,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: tokens.scale(tokens.spacing.base),
              paddingBottom: tokens.verticalScale(tokens.spacing.sm),
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: tokens.scale(32),
                  height: tokens.scale(32),
                  borderRadius: tokens.radii.full,
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="pin" size={16} color={colors.primaryText} />
              </View>
              <View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                    fontWeight: tokens.typography.fontWeight.heavy,
                    textAlign,
                  }}
                >
                  {t.pinnedBar.modalTitle(count)}
                </Text>
                <Text
                  style={{
                    color: isFull ? colors.danger : colors.muted,
                    fontSize: tokens.moderateScale(11),
                    marginTop: 1,
                    textAlign,
                  }}
                >
                  {isFull
                    ? t.roomDetail.pinSheetQuotaFull(limit)
                    : t.roomDetail.pinSheetQuotaTitle(count, limit)}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t.common.close}
            >
              <Ionicons name="close-circle" size={24} color={colors.muted} />
            </Pressable>
          </View>

          {/* İlanlar Listesi */}
          <ScrollView
            contentContainerStyle={{
              padding: tokens.scale(tokens.spacing.base),
              gap: tokens.verticalScale(tokens.spacing.sm),
            }}
            showsVerticalScrollIndicator={false}
          >
            {count === 0 ? (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: tokens.verticalScale(tokens.spacing.xl),
                  gap: tokens.verticalScale(tokens.spacing.sm),
                }}
              >
                <View
                  style={{
                    width: tokens.scale(56),
                    height: tokens.scale(56),
                    borderRadius: tokens.radii.full,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="pin-outline" size={26} color={colors.muted} />
                </View>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                    textAlign: 'center',
                    lineHeight: 20,
                    maxWidth: 280,
                  }}
                >
                  {t.pinnedBar.emptyList}
                </Text>
              </View>
            ) : (
              listings.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => onSelectListing(item)}
                  style={({ pressed }) => [
                    {
                      backgroundColor: colors.bg,
                      borderRadius: tokens.moderateScale(tokens.radii.lg),
                      padding: tokens.scale(tokens.spacing.base),
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderStartWidth: 4,
                      borderStartColor: colors.primary,
                      gap: 6,
                    },
                    pressed && { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  {/* İlan Sahibi + Kalan Süre */}
                  <View
                    style={{
                      flexDirection: rowDirection,
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 6 }}>
                      {item.avatarUrl ? (
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: tokens.radii.full,
                            overflow: 'hidden',
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Image
                            source={{ uri: item.avatarUrl }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        </View>
                      ) : (
                        <View
                          style={{
                            backgroundColor: colors.primary,
                            width: 20,
                            height: 20,
                            borderRadius: tokens.radii.full,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                            {index + 1}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                          fontWeight: tokens.typography.fontWeight.bold,
                        }}
                      >
                        {item.userName}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: rowDirection,
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
                        paddingHorizontal: tokens.scale(8),
                        paddingVertical: tokens.verticalScale(2),
                        borderRadius: tokens.radii.full,
                      }}
                    >
                      <Ionicons name="time-outline" size={12} color="#D97706" />
                      <Text
                        style={{
                          color: isDark ? '#FBBF24' : '#D97706',
                          fontSize: tokens.moderateScale(10),
                          fontWeight: tokens.typography.fontWeight.bold,
                        }}
                      >
                        {expiresLabel(item.expiresAt)}
                      </Text>
                    </View>
                  </View>

                  {/* İlan Metni / Medya */}
                  {(previewRenderers[item.type || 'text'] ?? renderTextPreview)(item)}

                  {/* Detayı Gör İpucu */}
                  <View
                    style={{
                      flexDirection: rowDirection,
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 3,
                      marginTop: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.primaryText,
                        fontSize: tokens.moderateScale(11),
                        fontWeight: tokens.typography.fontWeight.bold,
                      }}
                    >
                      {t.pinnedBar.viewDetails}
                    </Text>
                    <Ionicons
                      name={isRTL ? 'chevron-back' : 'chevron-forward'}
                      size={12}
                      color={colors.primaryText}
                    />
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Alt Sabitle Butonu */}
          <View
            style={{
              paddingHorizontal: tokens.scale(tokens.spacing.base),
              paddingTop: tokens.verticalScale(tokens.spacing.xs),
            }}
          >
            {isFull ? (
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                  padding: tokens.scale(tokens.spacing.sm),
                  borderRadius: tokens.moderateScale(tokens.radii.md),
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: tokens.moderateScale(11),
                    fontWeight: tokens.typography.fontWeight.semibold,
                    textAlign: 'center',
                  }}
                >
                  {t.pinnedBar.quotaFullHint}
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  onClose();
                  onRequestPinPress();
                }}
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  paddingVertical: tokens.verticalScale(13),
                  borderRadius: tokens.moderateScale(tokens.radii.lg),
                  flexDirection: rowDirection,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name="pin" size={16} color="#FFFFFF" />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                    fontWeight: tokens.typography.fontWeight.heavy,
                  }}
                >
                  {pinButtonLabel}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};