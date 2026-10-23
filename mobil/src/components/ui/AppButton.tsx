/**
 * AppButton — Ortak buton bileşeni.
 *
 * Varyantlar: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline'
 * Boyutlar:   'sm' | 'md' | 'lg'
 *
 * Kullanım:
 *   <AppButton label="Kaydet" onPress={handleSave} />
 *   <AppButton label="Sil" variant="destructive" size="sm" onPress={handleDelete} />
 *   <AppButton label="Yükleniyor" loading />
 *   <AppButton label="İkon ile" icon={<Ionicons name="send" size={16} color="#fff" />} />
 */

import React from 'react';
import { Pressable, Text, View, ActivityIndicator, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type AppButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode | keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  accessibilityLabel?: string;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
};

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  accessibilityLabel,
  style,
  containerStyle,
}) => {
  const { colors, isDark } = useTheme();

  const isDisabled = disabled || loading;
  const mergedStyle = { ...(containerStyle ?? {}), ...(style ?? {}) };

  // --- Renk sistemi ---
  const bg: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.surfaceElevated,
    destructive: colors.danger,
    ghost: 'transparent',
    outline: 'transparent',
  };

  const textColor: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: colors.text,
    destructive: '#FFFFFF',
    ghost: colors.primary,
    outline: colors.primary,
  };

  const borderColor: Record<ButtonVariant, string | undefined> = {
    primary: undefined,
    secondary: colors.border,
    destructive: undefined,
    ghost: undefined,
    outline: colors.primary,
  };

  // --- Boyut sistemi ---
  const paddingH: Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };
  const paddingV: Record<ButtonSize, number> = { sm: 7, md: 11, lg: 14 };
  const fontSize: Record<ButtonSize, number> = {
    sm: tokens.typography.fontSize.sm,
    md: tokens.typography.fontSize.base,
    lg: tokens.typography.fontSize.md,
  };
  const radius: Record<ButtonSize, number> = {
    sm: tokens.radii.md,
    md: tokens.radii.lg,
    lg: tokens.radii.xl,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.scale(6),
          paddingHorizontal: tokens.scale(paddingH[size]),
          paddingVertical: tokens.verticalScale(paddingV[size]),
          borderRadius: tokens.moderateScale(radius[size]),
          backgroundColor: bg[variant],
          borderWidth: borderColor[variant] ? 1.5 : 0,
          borderColor: borderColor[variant],
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? undefined : 'flex-start',
          ...mergedStyle,
        },
        pressed && !isDisabled && {
          opacity: 0.82,
          transform: [{ scale: 0.97 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textColor[variant]}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            typeof icon === 'string' ? (
              <Ionicons name={icon as any} size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} color={textColor[variant]} />
            ) : icon
          )}
          <Text
            style={{
              color: textColor[variant],
              fontSize: tokens.moderateScale(fontSize[size]),
              fontWeight: tokens.typography.fontWeight.bold,
            }}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            typeof icon === 'string' ? (
              <Ionicons name={icon as any} size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} color={textColor[variant]} />
            ) : icon
          )}
        </>
      )}
    </Pressable>
  );
};
