/**
 * Badge — Sayı veya kısa metin rozeti.
 *
 * Kullanım:
 *   <Badge count={5} />                  → kırmızı sayı rozeti
 *   <Badge count={120} />                → "99+"
 *   <Badge label="Yeni" variant="primary" />
 *   <Badge count={0} />                  → render etmez (null)
 */

import React from 'react';
import { View, Text } from 'react-native';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme';

export type BadgeVariant = 'danger' | 'primary' | 'success' | 'warning' | 'muted';

type BadgeProps = {
  /** Sayı rozeti. 0 ise hiçbir şey render etmez */
  count?: number;
  /** Sayı yerine metin */
  label?: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  /** Absolute pozisyonlama için üst-sağ köşeye konuşlandır */
  floating?: boolean;
};

export const Badge: React.FC<BadgeProps> = ({
  count,
  label,
  variant = 'danger',
  size = 'md',
  floating = false,
}) => {
  const { colors } = useTheme();

  // count varsa ve 0 ise gösterme
  if (count !== undefined && count <= 0) return null;

  const displayText =
    label ?? (count !== undefined ? (count > 99 ? '99+' : String(count)) : '');

  const bgColor: Record<BadgeVariant, string> = {
    danger: colors.danger,
    primary: colors.primary,
    success: '#25D366',
    warning: '#F59E0B',
    muted: colors.muted,
  };

  const minSize = size === 'sm' ? tokens.scale(16) : tokens.scale(20);
  const fontSize = size === 'sm'
    ? tokens.moderateScale(9)
    : tokens.moderateScale(11);

  return (
    <View
      style={[
        {
          backgroundColor: bgColor[variant],
          minWidth: minSize,
          height: minSize,
          borderRadius: tokens.radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: tokens.scale(4),
        },
        floating && {
          position: 'absolute',
          top: -3,
          right: -3,
        },
      ]}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize,
          fontWeight: '700',
          lineHeight: fontSize * 1.2,
        }}
      >
        {displayText}
      </Text>
    </View>
  );
};
