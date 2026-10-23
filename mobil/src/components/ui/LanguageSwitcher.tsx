import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme';
import { useI18n } from '@/i18n';

const LANGUAGES = [
    { code: 'tr', label: 'TR', flag: '🇹🇷' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'ru', label: 'RU', flag: '🇷🇺' },
    { code: 'ar', label: 'AR', flag: '🇸🇦' },
] as const;

export const LanguageSwitcher: React.FC = () => {
    const { colors } = useTheme();
    const { language, setLanguage } = useI18n();

    return (
        <View
            style={{
                flexDirection: 'row',
                alignSelf: 'center',
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                padding: 4,
                gap: 4,
            }}
        >
            {LANGUAGES.map(({ code, label, flag }) => {
                const active = language === code;
                return (
                    <Pressable
                        key={code}
                        onPress={() => setLanguage(code)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={label}
                        style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: tokens.scale(tokens.spacing.md),
                            paddingVertical: tokens.verticalScale(6),
                            borderRadius: 999,
                            backgroundColor: active ? colors.primary : 'transparent',
                            opacity: pressed && !active ? 0.6 : 1,
                        })}
                    >
                        <Text style={{ fontSize: 14 }}>{flag}</Text>
                        <Text
                            style={{
                                color: active ? '#FFFFFF' : colors.muted,
                                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                                fontWeight: active
                                    ? tokens.typography.fontWeight.bold
                                    : tokens.typography.fontWeight.medium,
                            }}
                        >
                            {label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};