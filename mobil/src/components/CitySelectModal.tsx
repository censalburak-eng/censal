import React, { useState, useMemo } from 'react';
import { View, Text, Modal, FlatList, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CITIES_DATA } from '../data/cities';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';

export type SelectedCityData = {
  name: string;
  plateCode: string;
  region: string;
};

type CitySelectModalProps = {
  visible: boolean;
  selectedCity: string;
  onSelect: (city: SelectedCityData) => void;
  onClose: () => void;
};

export const CitySelectModal: React.FC<CitySelectModalProps> = ({
  visible,
  selectedCity,
  onSelect,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return CITIES_DATA;
    return CITIES_DATA.filter(
      (c) =>
        c.name.toLocaleLowerCase('tr-TR').includes(q) ||
        c.plateCode.includes(q)
    );
  }, [search]);

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            height: '75%',
            borderTopLeftRadius: tokens.moderateScale(tokens.radii.xl),
            borderTopRightRadius: tokens.moderateScale(tokens.radii.xl),
            padding: tokens.scale(tokens.spacing.base),
            gap: tokens.verticalScale(tokens.spacing.md),
            backgroundColor: colors.surface,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
                fontWeight: tokens.typography.fontWeight.bold,
                color: colors.text,
              }}
            >
              {t.citySelect.title}
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t.citySelect.close}
              style={{ padding: tokens.scale(tokens.spacing.xs) }}
            >
              <Ionicons name="close" size={tokens.moderateScale(22)} color={colors.text} />
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: tokens.moderateScale(tokens.radii.lg),
              paddingHorizontal: tokens.scale(tokens.spacing.md),
              height: tokens.verticalScale(44),
              gap: tokens.scale(tokens.spacing.sm),
              borderWidth: 1,
              backgroundColor: colors.primaryTint,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="search" size={tokens.moderateScale(16)} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t.citySelect.searchPlaceholder}
              placeholderTextColor={colors.muted}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              style={{
                flex: 1,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                color: colors.text,
              }}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = item.name === selectedCity;
              return (
                <Pressable
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: tokens.verticalScale(tokens.spacing.md),
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      gap: tokens.scale(tokens.spacing.md),
                    },
                    isSelected && { backgroundColor: colors.primaryTint },
                  ]}
                  onPress={() => {
                    onSelect({
                      name: item.name,
                      plateCode: item.plateCode,
                      region: t.citySelect.regionLabel(item.region),
                    });
                    handleClose();
                  }}
                >
                  <Text
                    style={{
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                      fontWeight: tokens.typography.fontWeight.bold,
                      width: tokens.scale(24),
                      color: colors.muted,
                    }}
                  >
                    {item.plateCode}
                  </Text>
                  <Text
                    style={[
                      {
                        flex: 1,
                        fontSize: tokens.moderateScale(tokens.typography.fontSize.md),
                        color: colors.text,
                      },
                      isSelected && { color: colors.primaryText, fontWeight: '700' },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={tokens.moderateScale(18)} color={colors.primaryText} />
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};