/**
 * PlateBadge — Türk plaka kodu rozeti.
 * Her yerde aynı inline style ile yazılıyordu; artık tek yerden.
 *
 * Kullanım:
 *   <PlateBadge code="34" />
 *   <PlateBadge code="06" size="lg" />
 */

import React from 'react';
import { View, Text } from 'react-native';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme';

type PlateBadgeProps = {
  code: string;
  size?: 'sm' | 'md' | 'lg';
};

export const PlateBadge: React.FC<PlateBadgeProps> = ({ code, size = 'md' }) => {
  const { colors } = useTheme();

  const dimensions: Record<string, { w: number; h: number; fs: number; br: number }> = {
    sm: { w: 34, h: 26, fs: tokens.typography.fontSize.caption, br: tokens.radii.xs },
    md: { w: 42, h: 34, fs: tokens.typography.fontSize.base, br: tokens.radii.sm },
    lg: { w: 52, h: 40, fs: tokens.typography.fontSize.md, br: tokens.radii.md },
  };

  const d = dimensions[size];

  return (
    <View
      style={{
        width: tokens.scale(d.w),
        height: tokens.verticalScale(d.h),
        borderRadius: tokens.moderateScale(d.br),
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: tokens.moderateScale(d.fs),
          fontWeight: tokens.typography.fontWeight.heavy,
          letterSpacing: 0.5,
        }}
      >
        {code}
      </Text>
    </View>
  );
};
