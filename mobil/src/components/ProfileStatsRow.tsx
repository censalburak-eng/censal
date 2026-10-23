import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';

type ProfileStatsRowProps = {
  plateCode: string;
  cityName?: string;
  subscriptionPlan?: string;
  pinnedCount?: number;
};

export const ProfileStatsRow: React.FC<ProfileStatsRowProps> = ({
  plateCode,
  cityName = 'İstanbul',
  subscriptionPlan = 'Yıllık Plan',
  pinnedCount = 1,
}) => {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: tokens.scale(tokens.spacing.sm) }}>
      {/* 1. Şehir */}
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: tokens.moderateScale(tokens.radii.lg),
          padding: tokens.scale(tokens.spacing.sm + 2),
          borderWidth: 1,
          borderColor: colors.border,
          gap: 2,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11), fontWeight: tokens.typography.fontWeight.medium }}>Şehir</Text>
          <Ionicons name="location-outline" size={13} color={colors.muted} />
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: tokens.moderateScale(20),
            fontWeight: tokens.typography.fontWeight.heavy,
            marginTop: 2,
          }}
        >
          {plateCode}
        </Text>
        <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11) }}>{cityName}</Text>
      </View>

      {/* 2. Abonelik */}
      <View
        style={{
          flex: 1.15,
          backgroundColor: colors.surface,
          borderRadius: tokens.moderateScale(tokens.radii.lg),
          padding: tokens.scale(tokens.spacing.sm + 2),
          borderWidth: 1,
          borderColor: colors.border,
          gap: 2,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11), fontWeight: tokens.typography.fontWeight.medium }}>Abonelik</Text>
          <Ionicons name="star" size={13} color={colors.primaryText} />
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: tokens.moderateScale(15),
            fontWeight: tokens.typography.fontWeight.heavy,
            marginTop: 4,
          }}
          numberOfLines={1}
        >
          {subscriptionPlan}
        </Text>
        <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11) }} numberOfLines={1}>
          {plateCode} Odası
        </Text>
      </View>

      {/* 3. Vitrin */}
      <View
        style={{
          flex: 0.95,
          backgroundColor: colors.surface,
          borderRadius: tokens.moderateScale(tokens.radii.lg),
          padding: tokens.scale(tokens.spacing.sm + 2),
          borderWidth: 1,
          borderColor: colors.border,
          gap: 2,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11), fontWeight: tokens.typography.fontWeight.medium }}>Vitrin</Text>
          <Ionicons name="pin-outline" size={13} color={colors.muted} />
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: tokens.moderateScale(20),
            fontWeight: tokens.typography.fontWeight.heavy,
            marginTop: 2,
          }}
        >
          {pinnedCount}
        </Text>
        <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11) }} numberOfLines={1}>
          Aktif Vitrin
        </Text>
      </View>
    </View>
  );
};
