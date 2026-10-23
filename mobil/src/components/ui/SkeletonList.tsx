/**
 * SkeletonRow — Genel amaçlı iskelet (skeleton) satır bileşeni.
 * Animasyonsuz ama görsel olarak tutarlı placeholder.
 *
 * Kullanım:
 *   <SkeletonList />              → varsayılan 6 satır liste
 *   <SkeletonList count={3} />    → 3 satır
 *   <SkeletonList variant="chat" />  → sohbet baloncukları şeklinde
 */

import React from 'react';
import { View, DimensionValue } from 'react-native';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme';

type SkeletonVariant = 'list' | 'chat' | 'card';

type SkeletonListProps = {
  count?: number;
  variant?: SkeletonVariant;
};

const SkeletonBox: React.FC<{ width: DimensionValue; height: number; radius?: number }> = ({
  width,
  height,
  radius = 4,
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.border,
      }}
    />
  );
};

const ListSkeletonRow: React.FC<{ index: number }> = ({ index }) => {
  const { colors } = useTheme();
  // Farklı satır uzunlukları için varyasyon
  const widths: DimensionValue[] = ['60%', '75%', '50%', '80%', '65%', '70%'];
  const w = widths[index % widths.length];

  return (
    <View
      style={{
        height: tokens.verticalScale(70),
        backgroundColor: colors.surface,
        borderRadius: tokens.moderateScale(tokens.radii.lg),
        paddingHorizontal: tokens.scale(tokens.spacing.md),
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.scale(tokens.spacing.md),
        borderWidth: 1,
        borderColor: colors.border,
        opacity: 1 - index * 0.08,
      }}
    >
      {/* Sol avatar/plaka placeholder */}
      <SkeletonBox
        width={tokens.scale(44)}
        height={tokens.verticalScale(36)}
        radius={tokens.moderateScale(tokens.radii.sm)}
      />
      {/* Sağ metin satırları */}
      <View style={{ flex: 1, gap: tokens.verticalScale(6) }}>
        <SkeletonBox width="40%" height={tokens.verticalScale(13)} />
        <SkeletonBox width={w} height={tokens.verticalScale(10)} />
      </View>
      {/* En sağdaki küçük element */}
      <SkeletonBox width={tokens.scale(20)} height={tokens.verticalScale(20)} radius={99} />
    </View>
  );
};

const ChatSkeletonRow: React.FC<{ index: number }> = ({ index }) => {
  const { colors } = useTheme();
  const isRight = index % 2 === 0;
  const widths: DimensionValue[] = ['55%', '40%', '65%', '45%', '70%', '35%'];
  const w = widths[index % widths.length];

  return (
    <View
      style={{
        paddingHorizontal: tokens.scale(tokens.spacing.base),
        alignItems: isRight ? 'flex-end' : 'flex-start',
        marginVertical: tokens.verticalScale(3),
        opacity: 1 - index * 0.08,
      }}
    >
      <View
        style={{
          width: w,
          height: tokens.verticalScale(40 + (index % 3) * 10),
          borderRadius: tokens.moderateScale(12),
          borderBottomEndRadius: isRight ? 2 : undefined,
          borderBottomStartRadius: !isRight ? 2 : undefined,
          backgroundColor: isRight ? colors.primaryTint : colors.surface,
          borderWidth: isRight ? 0 : 1,
          borderColor: colors.border,
        }}
      />
    </View>
  );
};

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 6,
  variant = 'list',
}) => {
  const rows = Array.from({ length: count }, (_, i) => i);

  if (variant === 'chat') {
    return (
      <View style={{ paddingVertical: tokens.verticalScale(tokens.spacing.sm) }}>
        {rows.map((i) => (
          <ChatSkeletonRow key={i} index={i} />
        ))}
      </View>
    );
  }

  return (
    <View
      style={{
        paddingHorizontal: tokens.scale(tokens.spacing.base),
        gap: tokens.verticalScale(tokens.spacing.sm),
        paddingTop: tokens.verticalScale(tokens.spacing.sm),
      }}
    >
      {rows.map((i) => (
        <ListSkeletonRow key={i} index={i} />
      ))}
    </View>
  );
};
