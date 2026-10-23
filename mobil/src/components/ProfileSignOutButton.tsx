import React from 'react';
import { Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';
import { useI18n } from '../i18n';

type ProfileSignOutButtonProps = {
  onPress: () => void;
};

export const ProfileSignOutButton: React.FC<ProfileSignOutButtonProps> = ({ onPress }) => {
  const { colors } = useTheme();
  const { t } = useI18n()
  return (
    <Pressable
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.scale(8),
          backgroundColor: colors.surface,
          borderRadius: tokens.moderateScale(tokens.radii.lg),
          paddingVertical: tokens.verticalScale(tokens.spacing.md),
          borderWidth: 1,
          borderColor: colors.border,
          marginTop: tokens.verticalScale(tokens.spacing.xs),
        },
        pressed && { backgroundColor: colors.dangerSurface, borderColor: colors.danger },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Çıkış Yap"
    >
      <Text
        style={{
          color: colors.danger,
          fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
          fontWeight: tokens.typography.fontWeight.bold,
        }}
      >
        {t.profile.logoutTitle}
      </Text>
      <Ionicons name="log-out-outline" size={20} color={colors.danger} />

    </Pressable>
  );
};
