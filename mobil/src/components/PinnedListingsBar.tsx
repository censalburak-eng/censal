import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PinnedListing } from '../types/messages.types';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';
import { useI18n } from '../i18n';

type PinnedListingsBarProps = {
  listings: readonly PinnedListing[];
  pinPrice?: string;
  maxPins?: number;
  onOpenModal?: () => void;
  onRequestPinPress?: () => void;
  onPaywallPress?: () => void;
};

const PinnedListingsBarComponent: React.FC<PinnedListingsBarProps> = ({
  listings,
  pinPrice,
  maxPins = 3,
  onOpenModal,
  onRequestPinPress,
  onPaywallPress,
}) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();

  const count = listings.length;
  const limit = maxPins > 0 ? maxPins : 3;
  const isFull = count >= limit;

  // Kota segmentleri — dolu/boş
  const quotaSegments = Array.from({ length: limit }, (_, i) => i < count);

  const handleBarPress = () => {
    onOpenModal?.();
  };

  const handleAddPinPress = () => {
    if (isFull) {
      onPaywallPress?.();
      return;
    }
    onRequestPinPress?.();
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {/* ─── Üst Bar ──────────────────────────────────────── */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          paddingVertical: tokens.verticalScale(tokens.spacing.xs + 2),
          backgroundColor: isDark
            ? 'rgba(99, 102, 241, 0.15)'
            : 'rgba(99, 102, 241, 0.08)',
        }}
      >
        {/* Sol: Pin ikonu + başlık */}
        <Pressable
          onPress={handleBarPress}
          accessibilityRole="button"
          accessibilityLabel={t.pinnedBar.showA11y}
          style={({ pressed }) => [
            {
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 6,
              flexShrink: 1,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="pin" size={14} color={colors.primaryText} />
          <Text
            numberOfLines={1}
            style={{
              color: colors.primaryText,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
              fontWeight: tokens.typography.fontWeight.heavy,
              letterSpacing: 0.2,
            }}
          >
            {t.chat.pinnedBarTitle(count, limit)}
          </Text>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={12}
            color={colors.primaryText}
          />
        </Pressable>

        {/* Sağ: Kota göstergesi + ekle butonu */}
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          {/* Segmented kota */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              gap: 2.5,
              alignItems: 'center',
            }}
          >
            {quotaSegments.map((filled, idx) => (
              <View
                key={idx}
                style={{
                  width: tokens.scale(10),
                  height: tokens.scale(3.5),
                  borderRadius: tokens.radii.full,
                  backgroundColor: filled
                    ? isFull
                      ? colors.danger
                      : colors.primaryText
                    : isDark
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </View>

          {/* Ekle / Kota Dolu butonu */}
          <Pressable
            onPress={handleAddPinPress}
            accessibilityRole="button"
            accessibilityLabel={isFull ? t.rooms.pinnedMax : t.chat.requestPin}
            hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
            style={({ pressed }) => [
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: tokens.scale(7),
                paddingVertical: tokens.verticalScale(3),
                borderRadius: tokens.radii.full,
                backgroundColor: isFull
                  ? isDark
                    ? 'rgba(239,68,68,0.2)'
                    : '#FEE2E2'
                  : colors.primaryText,
              },
              pressed && { opacity: 0.75 },
            ]}
          >
            {isFull ? (
              <>
                <Ionicons name="lock-closed" size={10} color={colors.danger} />
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: tokens.moderateScale(10),
                    fontWeight: tokens.typography.fontWeight.heavy,
                  }}
                >
                  {t.rooms.pinnedMax}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="add" size={11} color="#FFFFFF" />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: tokens.moderateScale(10),
                    fontWeight: tokens.typography.fontWeight.heavy,
                  }}
                >
                  {t.chat.requestPin}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* ─── Alt Tek Satır Özet (İlan varsa) ─────────────────── */}
      {count > 0 && (
        <Pressable
          onPress={handleBarPress}
          style={({ pressed }) => [
            {
              paddingHorizontal: tokens.scale(tokens.spacing.base),
              paddingVertical: tokens.verticalScale(6),
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.surface,
            },
            pressed && { opacity: 0.75 },
          ]}
        >
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 5,
              flex: 1,
            }}
          >
            {listings[0]?.type === 'image' ? (
              <Ionicons name="image" size={13} color={colors.primaryText} />
            ) : listings[0]?.type === 'audio' ? (
              <Ionicons name="mic" size={13} color={colors.primaryText} />
            ) : listings[0]?.type === 'location' ? (
              <Ionicons name="location" size={13} color={colors.danger} />
            ) : null}

            <Text
              style={{
                color: colors.text,
                fontSize: tokens.moderateScale(12),
                flex: 1,
                textAlign: isRTL ? 'right' : 'left',
              }}
              numberOfLines={1}
            >
              {listings[0]?.type === 'image'
                ? (listings[0]?.caption || t.attach.photo)
                : listings[0]?.type === 'audio'
                  ? t.attach.voice
                  : listings[0]?.type === 'location'
                    ? (listings[0]?.body || t.attach.location)
                    : listings[0]?.body}
            </Text>
          </View>
          <Text
            style={{
              color: colors.primaryText,
              fontSize: tokens.moderateScale(11),
              fontWeight: tokens.typography.fontWeight.bold,
              marginStart: tokens.scale(8),
            }}
          >
            {t.pinnedBar.viewAll(count)}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export const PinnedListingsBar = React.memo(PinnedListingsBarComponent);