/**
 * LoadingView — Tam ekran veya flex-1 yükleme durumu.
 *
 * Kullanım:
 *   <LoadingView />                          → tam ekran spinner
 *   <LoadingView message="Mesajlar yükleniyor..." />
 *   <LoadingView size="small" color="#fff" /> → küçük spinner
 *   <LoadingView fullScreen={false} />        → flex: 1 ile içinde kullan
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme';

type LoadingViewProps = {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  /** false ise flex:1, true ise kendi başına tam ekranı kaplar */
  fullScreen?: boolean;
};

export const LoadingView: React.FC<LoadingViewProps> = ({
  message,
  size = 'large',
  color,
  fullScreen = false,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: tokens.verticalScale(tokens.spacing.sm),
        backgroundColor: fullScreen ? colors.bg : undefined,
      }}
    >
      <ActivityIndicator size={size} color={color ?? colors.primary} />
      {message && (
        <Text
          style={{
            color: colors.muted,
            fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
            marginTop: tokens.verticalScale(4),
          }}
        >
          {message}
        </Text>
      )}
    </View>
  );
};
