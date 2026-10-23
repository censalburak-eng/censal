/**
 * ErrorView — Veri yükleme hatası için genel hata durumu bileşeni.
 *
 * Kullanım:
 *   <ErrorView onRetry={() => refetch()} />
 *   <ErrorView
 *     title="Mesajlar yüklenemedi"
 *     subtitle="Lütfen bağlantınızı kontrol edin."
 *     onRetry={() => refetch()}
 *   />
 *   <ErrorView
 *     icon="wifi-outline"
 *     title="Bağlantı Hatası"
 *     onRetry={handleRetry}
 *     retryLabel="Yeniden Bağlan"
 *   />
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme';
import { AppButton } from './AppButton';
import { useI18n } from '../../i18n';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type ErrorViewProps = {
  title?: string;
  subtitle?: string;
  icon?: IoniconName;
  onRetry?: () => void;
  retryLabel?: string;
};

export const ErrorView: React.FC<ErrorViewProps> = ({
  title,
  subtitle,
  icon,
  onRetry,
  retryLabel,
}) => {
  const { colors } = useTheme();
  const { language } = useI18n();

  const titleTR = language === 'tr' ? 'Bir şeyler ters gitti' : 'حدث خطأ';
  const subtitleTR = language === 'tr' ? 'Lütfen internet bağlantınızı kontrol edip tekrar deneyin.' : 'يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.';
  const retryLabelTR = language === 'tr' ? 'Tekrar Dene' : 'حاول مرة أخرى';

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: tokens.scale(tokens.spacing.xxl),
        gap: tokens.verticalScale(tokens.spacing.md),
      }}
    >
      {/* İkon Dairesi */}
      <View
        style={{
          width: tokens.scale(72),
          height: tokens.scale(72),
          borderRadius: tokens.radii.full,
          backgroundColor: colors.dangerSurface,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name={icon} size={tokens.moderateScale(34)} color={colors.danger} />
      </View>

      {/* Başlık */}
      <Text
        style={{
          color: colors.text,
          fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
          fontWeight: tokens.typography.fontWeight.bold,
          textAlign: 'center',
        }}
      >
        {title || titleTR}
      </Text>

      {/* Alt Başlık */}
      <Text
        style={{
          color: colors.muted,
          fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
          textAlign: 'center',
          lineHeight: tokens.moderateScale(tokens.typography.fontSize.sm) * 1.6,
        }}
      >
        {subtitle || subtitleTR}
      </Text>

      {/* Tekrar Dene Butonu */}
      {onRetry && (
        <AppButton
          label={retryLabel || retryLabelTR}
          onPress={onRetry}
          variant="primary"
          size="md"
          style={{ marginTop: tokens.verticalScale(tokens.spacing.sm), width: "100%" }}
        />
      )}
    </View>
  );
};
