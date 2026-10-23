import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';

export type ProfileMenuItemData = {
  id: string;
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  badgeText?: string | number;
  showDot?: boolean;
  isDestructive?: boolean;
  renderRight?: React.ReactNode;
  onPress?: () => void;
};

type ProfileMenuGroupProps = {
  title: string;
  items: readonly ProfileMenuItemData[];
};

export const ProfileMenuGroup: React.FC<ProfileMenuGroupProps> = ({ title, items }) => {
  const { colors } = useTheme();

  return (
    <View style={{ gap: tokens.verticalScale(tokens.spacing.xs) }}>
      {/* Grup Başlığı */}
      <Text
        style={{
          color: colors.muted,
          fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
          fontWeight: tokens.typography.fontWeight.heavy,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginLeft: 4,
        }}
      >
        {title}
      </Text>

      {/* Grup Kartı (Mockuptaki yüzey kartı) */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: tokens.moderateScale(tokens.radii.lg),
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: tokens.scale(tokens.spacing.md),
                  gap: tokens.scale(tokens.spacing.md),
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.border,
                },
                pressed && Boolean(item.onPress) && { backgroundColor: colors.surfaceElevated },
              ]}
              onPress={item.onPress}
              disabled={!item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              {/* Sol: Açık Mavi / Tint İkon Kutusu */}
              <View
                style={{
                  width: tokens.scale(36),
                  height: tokens.scale(36),
                  borderRadius: tokens.moderateScale(tokens.radii.md),
                  backgroundColor: item.isDestructive ? colors.dangerSurface : colors.primaryTint,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name={item.iconName}
                  size={20}
                  color={item.isDestructive ? colors.danger : colors.primaryText}
                />
              </View>

              {/* Orta: Başlık ve Açıklama */}
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    style={{
                      color: item.isDestructive ? colors.danger : colors.text,
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                      fontWeight: tokens.typography.fontWeight.bold,
                    }}
                  >
                    {item.title}
                  </Text>
                  {item.showDot && (
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: tokens.radii.full,
                        backgroundColor: colors.primaryText,
                      }}
                    />
                  )}
                </View>

                {item.subtitle ? (
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: tokens.moderateScale(12),
                    }}
                    numberOfLines={1}
                  >
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>

              {/* Sağ: Özel Render (Switch) veya Sayaç Rozeti & Chevron */}
              {item.renderRight ? (
                item.renderRight
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.badgeText !== undefined && (
                    <View
                      style={{
                        paddingHorizontal: tokens.scale(8),
                        paddingVertical: tokens.verticalScale(2),
                        borderRadius: tokens.radii.full,
                        backgroundColor: colors.primaryTint,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.primaryText,
                          fontSize: tokens.moderateScale(11),
                          fontWeight: tokens.typography.fontWeight.bold,
                        }}
                      >
                        {item.badgeText}
                      </Text>
                    </View>
                  )}
                  {item.onPress && (
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
