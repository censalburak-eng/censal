/**
 * BackButton — Her ekranda kullanılan geri dönme butonu.
 *
 * Kullanım:
 *   <BackButton onPress={() => router.back()} />
 *   <BackButton onPress={() => router.back()} label="Odalar" />
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme';

type BackButtonProps = {
  onPress: () => void;
  label?: string;
  size?: number;
};

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  label,
  size = 36,
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label ?? 'Geri'}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.scale(4),
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={{
          width: tokens.scale(size),
          height: tokens.scale(size),
          borderRadius: tokens.moderateScale(tokens.radii.md),
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: colors.border,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="chevron-back" size={tokens.moderateScale(20)} color={colors.text} />
      </View>
      {label && (
        <Text
          style={{
            color: colors.text,
            fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
            fontWeight: tokens.typography.fontWeight.semibold,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};
