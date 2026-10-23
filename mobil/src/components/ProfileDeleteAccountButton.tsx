import React from 'react';
import { Text, Pressable, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';
import { useI18n } from '../i18n';

type ProfileDeleteAccountButtonProps = {
  onPress: () => void;
  isLoading?: boolean;
};

export const ProfileDeleteAccountButton: React.FC<ProfileDeleteAccountButtonProps> = ({
  onPress,
  isLoading = false,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <Pressable
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.scale(tokens.spacing.sm),
          backgroundColor: colors.surface,
          borderRadius: tokens.moderateScale(tokens.radii.lg),
          paddingVertical: tokens.verticalScale(tokens.spacing.md),
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          borderWidth: 1,
          borderColor: colors.border,
          marginTop: tokens.verticalScale(tokens.spacing.xs),
          opacity: isLoading ? 0.6 : 1,
        },
        pressed && !isLoading && {
          backgroundColor: colors.dangerSurface,
          borderColor: colors.danger,
        },
      ]}
      onPress={onPress}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityLabel={t.profileScreen.deleteAccountButton}
    >
      {isLoading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.scale(tokens.spacing.sm) }}>
          <ActivityIndicator size="small" color={colors.danger} />
          <Text
            style={{
              color: colors.danger,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
              fontWeight: tokens.typography.fontWeight.bold,
            }}
          >
            {t.profileScreen.deletingAccount}
          </Text>
        </View>
      ) : (
        <>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text
            style={{
              color: colors.danger,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
              fontWeight: tokens.typography.fontWeight.bold,
            }}
          >
            {t.profileScreen.deleteAccountButton}
          </Text>
        </>
      )}
    </Pressable>
  );
};
