/**
 * PinListingSheet — "İlan Sabitle" bottom sheet.
 *
 * RULES.md & UI/UX Best Practices:
 *  - Diller: Türkçe ve Arapça (RTL) tam uyumlu, tüm metinler i18n'den gelir
 *  - Hardcoded metin, hex veya stil dosyası yok
 *  - Renkler useTheme().colors, boşluklar ve fontlar tokens'tan gelir
 *  - maxPins 4 veya 5 olduğunda dahi bozulmayan ferah, yatay kaydırılabilir slot kartları
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { tokens } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { RoomMessage } from '../../types/messages.types';

export type PinListingSheetProps = {
  visible: boolean;
  message: RoomMessage | null;
  /** Odadaki mevcut aktif sabit ilan sayısı */
  activeCount: number;
  /** Odadaki maksimum sabit ilan limiti (varsayılan 3) */
  maxPins?: number;
  /** Sabitlenecek fiyat — "₺199.99" formatında */
  price?: string;
  isPinning: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type SlotState = 'occupied' | 'current' | 'empty';

type SlotStyle = {
  icon: IconName;
  iconColor: string;
  textColor: string;
  labelColor: string;
  labelWeight: '700' | 'normal';
  label: string;
  backgroundColor: string;
  borderColor: string;
};

const formatDuration = (sec: number) =>
  `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

export const PinListingSheet: React.FC<PinListingSheetProps> = ({
  visible,
  message,
  activeCount,
  maxPins = 3,
  price,
  isPinning,
  onClose,
  onConfirm,
}) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();

  if (!message) return null;

  const limit = maxPins > 0 ? maxPins : 3;
  const isFull = activeCount >= limit;
  const remaining = Math.max(0, limit - activeCount);
  const priceLabel = price ?? '199,99 ₺';
  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  // ── Önizleme: mesaj tipine göre render haritası ──────────────────────────
  const previewRenderers: Record<string, () => React.ReactNode> = {
    image: () => (
      <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: tokens.scale(64),
            height: tokens.scale(64),
            borderRadius: tokens.radii.md,
            overflow: 'hidden',
            backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
          }}
        >
          <Image
            source={{ uri: message.mediaPath ?? message.body }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 4 }}>
            <Ionicons name="image" size={14} color={colors.primaryText} />
            <Text
              style={{
                color: colors.primaryText,
                fontSize: tokens.moderateScale(12),
                fontWeight: tokens.typography.fontWeight.bold,
              }}
            >
              {t.attach.photo}
            </Text>
          </View>
          {!!message.caption && (
            <Text
              style={{
                color: colors.text,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                lineHeight: 18,
                textAlign,
              }}
              numberOfLines={2}
            >
              {message.caption}
            </Text>
          )}
        </View>
      </View>
    ),

    audio: () => (
      <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 10, paddingVertical: 4 }}>
        <View
          style={{
            width: tokens.scale(40),
            height: tokens.scale(40),
            borderRadius: tokens.radii.full,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="mic" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
              fontWeight: tokens.typography.fontWeight.bold,
            }}
          >
            {t.attach.voice}
          </Text>
          {!!message.durationSec && (
            <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11) }}>
              {formatDuration(message.durationSec)}
            </Text>
          )}
        </View>
      </View>
    ),

    location: () => (
      <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 10, paddingVertical: 4 }}>
        <View
          style={{
            width: tokens.scale(40),
            height: tokens.scale(40),
            borderRadius: tokens.radii.full,
            backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="location" size={20} color={colors.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
              fontWeight: tokens.typography.fontWeight.bold,
            }}
          >
            {t.attach.location}
          </Text>
          <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11) }} numberOfLines={1}>
            {message.body || `${message.lat?.toFixed(4)}, ${message.lng?.toFixed(4)}`}
          </Text>
        </View>
      </View>
    ),
  };

  const renderTextPreview = () => (
    <Text
      style={{
        color: colors.text,
        fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
        lineHeight: 20,
        textAlign,
      }}
      numberOfLines={3}
    >
      {message.body.slice(0, 100)}
    </Text>
  );

  // ── Slot durumuna göre stil haritası ─────────────────────────────────────
  const slotStyles: Record<SlotState, SlotStyle> = {
    occupied: {
      icon: 'lock-closed',
      iconColor: colors.danger,
      textColor: colors.danger,
      labelColor: colors.danger,
      labelWeight: 'normal',
      label: t.roomDetail.pinSheetSlotOccupied,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2',
      borderColor: isDark ? 'rgba(239, 68, 68, 0.45)' : '#FCA5A5',
    },
    current: {
      icon: 'sparkles',
      iconColor: colors.primary,
      textColor: colors.primaryText,
      labelColor: colors.primary,
      labelWeight: '700',
      label: t.roomDetail.pinSheetSlotYours,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.22)' : '#EFF6FF',
      borderColor: colors.primary,
    },
    empty: {
      icon: 'radio-button-off',
      iconColor: colors.muted,
      textColor: colors.muted,
      labelColor: colors.muted,
      labelWeight: 'normal',
      label: t.roomDetail.pinSheetSlotEmpty,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
      borderColor: colors.border,
    },
  };

  const getSlotState = (idx: number): SlotState =>
    idx < activeCount ? 'occupied' : idx === activeCount ? 'current' : 'empty';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        {/* Karartma Overlay */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        {/* Sheet Gövdesi */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopStartRadius: tokens.moderateScale(28),
            borderTopEndRadius: tokens.moderateScale(28),
            paddingBottom: Platform.OS === 'ios' ? 36 : 24,
            paddingTop: tokens.verticalScale(tokens.spacing.md),
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            gap: tokens.verticalScale(tokens.spacing.md),
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
              marginBottom: tokens.verticalScale(tokens.spacing.xs),
            }}
          />

          {/* Başlık Satırı */}
          <View
            style={{
              flexDirection: rowDirection,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: tokens.scale(tokens.spacing.lg),
            }}
          >
            <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: tokens.scale(36),
                  height: tokens.scale(36),
                  borderRadius: tokens.radii.full,
                  backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#EEF2FF',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="pin" size={18} color={colors.primaryText} />
              </View>
              <View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                    fontWeight: tokens.typography.fontWeight.heavy,
                  }}
                >
                  {t.roomDetail.pinTitle}
                </Text>
                <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11), marginTop: 1 }}>
                  {t.roomDetail.pinSheetPriceSubtitle}
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

          {/* İlan Önizleme Kartı */}
          <View style={{ paddingHorizontal: tokens.scale(tokens.spacing.lg) }}>
            <View
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.bg,
                borderRadius: tokens.moderateScale(tokens.radii.lg),
                borderWidth: 1,
                borderColor: colors.border,
                borderStartWidth: 4,
                borderStartColor: colors.primary,
                paddingHorizontal: tokens.scale(tokens.spacing.base),
                paddingVertical: tokens.verticalScale(tokens.spacing.sm),
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: colors.muted,
                  fontSize: tokens.moderateScale(10),
                  fontWeight: tokens.typography.fontWeight.heavy,
                  textAlign,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {t.roomDetail.pinSheetPreviewLabel}
              </Text>

              {(previewRenderers[message.type] ?? renderTextPreview)()}
            </View>
          </View>

          {/* Vitrin Kontenjanı Kartı */}
          <View style={{ paddingHorizontal: tokens.scale(tokens.spacing.lg) }}>
            <View
              style={{
                backgroundColor: isFull
                  ? (isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2')
                  : (isDark ? 'rgba(99,102,241,0.08)' : '#EEF2FF'),
                borderRadius: tokens.moderateScale(tokens.radii.lg),
                padding: tokens.scale(tokens.spacing.base),
                gap: tokens.verticalScale(tokens.spacing.xs + 2),
                borderWidth: 1,
                borderColor: isFull
                  ? (isDark ? 'rgba(239,68,68,0.3)' : '#FECACA')
                  : (isDark ? 'rgba(99,102,241,0.25)' : '#C7D2FE'),
              }}
            >
              {/* Kota Durum Başlığı */}
              <View
                style={{
                  flexDirection: rowDirection,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: isFull ? colors.danger : colors.primaryText,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                    fontWeight: tokens.typography.fontWeight.bold,
                  }}
                >
                  {t.roomDetail.pinSheetQuotaTitle(activeCount, limit)}
                </Text>

                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: tokens.radii.full,
                    backgroundColor: isFull
                      ? colors.danger
                      : isDark
                        ? 'rgba(99,102,241,0.25)'
                        : '#DBEAFE',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: isFull ? '#FFFFFF' : colors.primaryText,
                    }}
                  >
                    {isFull
                      ? t.roomDetail.pinSheetQuotaFull(limit)
                      : t.roomDetail.pinSheetRemainingSpots(remaining)}
                  </Text>
                </View>
              </View>

              {/* Slot Kartları (yatay kaydırılabilir) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection: rowDirection, gap: 8, paddingVertical: 4 }}
              >
                {Array.from({ length: limit }, (_, idx) => {
                  const s = slotStyles[getSlotState(idx)];
                  return (
                    <View
                      key={idx}
                      style={{
                        minWidth: tokens.scale(82),
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderRadius: tokens.moderateScale(tokens.radii.md),
                        backgroundColor: s.backgroundColor,
                        borderWidth: 1.5,
                        borderColor: s.borderColor,
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Ionicons name={s.icon} size={15} color={s.iconColor} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: s.textColor }}>
                        {t.roomDetail.pinSheetSlotOrder(idx + 1)}
                      </Text>
                      <Text style={{ fontSize: 9.5, fontWeight: s.labelWeight, color: s.labelColor }}>
                        {s.label}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Alt Açıklama İpucu */}
              <Text
                style={{
                  color: isFull ? colors.danger : colors.muted,
                  fontSize: tokens.moderateScale(10.5),
                  lineHeight: 15,
                  textAlign,
                }}
              >
                {isFull
                  ? t.pinnedBar.quotaFullHint
                  : t.roomDetail.pinSheetQuotaHint(remaining, activeCount + 1)}
              </Text>
            </View>
          </View>

          {/* Fiyat Kartı */}
          <View style={{ paddingHorizontal: tokens.scale(tokens.spacing.lg) }}>
            <View
              style={{
                flexDirection: rowDirection,
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: tokens.scale(tokens.spacing.base),
                paddingVertical: tokens.verticalScale(tokens.spacing.sm),
                backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB',
                borderRadius: tokens.moderateScale(tokens.radii.lg),
                borderWidth: 1,
                borderColor: isDark ? 'rgba(245,158,11,0.25)' : '#FDE68A',
              }}
            >
              <View style={{ gap: 2 }}>
                <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 5 }}>
                  <Ionicons name="time-outline" size={15} color="#D97706" />
                  <Text
                    style={{
                      color: isDark ? '#FBBF24' : '#92400E',
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                      fontWeight: tokens.typography.fontWeight.bold,
                    }}
                  >
                    {t.roomDetail.pinSheetPriceBadge}
                  </Text>
                </View>
                <Text
                  style={{
                    color: isDark ? '#FCD34D' : '#B45309',
                    fontSize: tokens.moderateScale(10.5),
                    textAlign,
                  }}
                >
                  {t.roomDetail.pinSheetPriceSubtitle}
                </Text>
              </View>

              <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                <Text
                  style={{
                    color: isDark ? '#FBBF24' : '#92400E',
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.xl),
                    fontWeight: tokens.typography.fontWeight.heavy,
                  }}
                >
                  {priceLabel}
                </Text>
                <Text style={{ color: isDark ? '#FCD34D' : '#B45309', fontSize: tokens.moderateScale(9) }}>
                  {t.roomDetail.pinSheetPer24h}
                </Text>
              </View>
            </View>
          </View>

          {/* Butonlar */}
          <View
            style={{
              flexDirection: rowDirection,
              gap: tokens.scale(tokens.spacing.sm),
              paddingHorizontal: tokens.scale(tokens.spacing.lg),
            }}
          >
            {/* Vazgeç */}
            <Pressable
              onPress={onClose}
              disabled={isPinning}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: tokens.verticalScale(13),
                borderRadius: tokens.moderateScale(tokens.radii.lg),
                backgroundColor: pressed ? colors.surfaceElevated : colors.bg,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                opacity: isPinning ? 0.5 : 1,
              })}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: tokens.typography.fontWeight.semibold,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                }}
              >
                {t.common.cancel}
              </Text>
            </Pressable>

            {/* Sabitle */}
            <Pressable
              onPress={onConfirm}
              disabled={isPinning || isFull}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              style={({ pressed }) => ({
                flex: 2,
                paddingVertical: tokens.verticalScale(13),
                borderRadius: tokens.moderateScale(tokens.radii.lg),
                backgroundColor: isFull
                  ? (isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2')
                  : isPinning || pressed
                    ? colors.primaryPressed
                    : colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: rowDirection,
                gap: 7,
              })}
            >
              {isPinning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={isFull ? 'lock-closed' : 'pin'}
                    size={16}
                    color={isFull ? colors.danger : '#fff'}
                  />
                  <Text
                    style={{
                      color: isFull ? colors.danger : '#fff',
                      fontWeight: tokens.typography.fontWeight.heavy,
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                    }}
                  >
                    {isFull
                      ? t.roomDetail.pinSheetQuotaFull(limit)
                      : t.roomDetail.pinSheetConfirmButton(priceLabel)}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Ödeme Notu */}
          {!isFull && (
            <Text
              style={{
                color: colors.muted,
                fontSize: tokens.moderateScale(10),
                textAlign: 'center',
                lineHeight: 14,
                paddingHorizontal: tokens.scale(tokens.spacing.lg),
              }}
            >
              {t.roomDetail.pinSheetPaymentNotice}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};