/**
 * EmptyView — Boş liste / içerik yoksa gösterilecek genel bileşen.
 *
 * Kullanım:
 *   <EmptyView
 *     icon="chatbubbles-outline"
 *     title="Henüz mesaj yok"
 *     subtitle="İlk mesajınızı gönderin!"
 *   />
 *   <EmptyView
 *     icon="search-outline"
 *     title="Sonuç bulunamadı"
 *     subtitle="Farklı bir arama deneyin."
 *     actionLabel="Aramayı Temizle"
 *     onAction={() => setSearch('')}
 *   />
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme';
import { AppButton } from './AppButton';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type EmptyViewProps = {
  icon?: IoniconName;
  title: string;
  subtitle?: string;
  /** Buton varsa gösterilir */
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'primary' | 'outline' | 'ghost';
};

export const EmptyView: React.FC<EmptyViewProps> = ({
  icon = 'document-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  actionVariant = 'primary',
}) => {
  const { colors } = useTheme();

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
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name={icon} size={tokens.moderateScale(32)} color={colors.muted} />
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
        {title}
      </Text>

      {/* Alt Açıklama */}
      {subtitle && (
        <Text
          style={{
            color: colors.muted,
            fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
            textAlign: 'center',
            lineHeight: tokens.moderateScale(tokens.typography.fontSize.sm) * 1.65,
          }}
        >
          {subtitle}
        </Text>
      )}

      {/* Aksiyon Butonu */}
      {actionLabel && onAction && (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          variant={actionVariant}
          size="md"
          style={{ marginTop: tokens.verticalScale(tokens.spacing.sm), width: "100%" }}
        />
      )}
    </View>
  );
};
