import React from 'react';
import { View, Text, Modal, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n, Language } from '../i18n';

type ProfileSettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark, setMode } = useTheme();
  const { t, language, setLanguage } = useI18n();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: tokens.scale(tokens.spacing.base),
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: colors.surface,
            borderRadius: tokens.moderateScale(tokens.radii.xl),
            padding: tokens.scale(tokens.spacing.lg),
            borderWidth: 1,
            borderColor: colors.border,
            gap: tokens.verticalScale(tokens.spacing.md),
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Modal Başlık */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              style={{
                color: colors.text,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
                fontWeight: tokens.typography.fontWeight.heavy,
              }}
            >
              {t.settings.language}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close-circle" size={24} color={colors.muted} />
            </Pressable>
          </View>

          {/* Dil Seçenekleri */}
          <View style={{ gap: tokens.verticalScale(tokens.spacing.sm) }}>
            {[
              { code: 'tr' as const, flag: '🇹🇷', label: 'Türkçe' },
              { code: 'en' as const, flag: '🇬🇧', label: 'English' },
              { code: 'ru' as const, flag: '🇷🇺', label: 'Русский' },
              { code: 'ar' as const, flag: '🇸🇦', label: 'العربية (Arapça)' },
            ].map(({ code, flag, label }) => {
              const active = language === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => {
                    setLanguage(code);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: tokens.scale(tokens.spacing.md),
                      borderRadius: tokens.moderateScale(tokens.radii.md),
                      backgroundColor: active ? colors.primaryTint : colors.bg,
                      borderWidth: 1,
                      borderColor: active ? colors.primaryText : colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 20 }}>{flag}</Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                        fontWeight: tokens.typography.fontWeight.bold,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                  {active && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primaryText} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
