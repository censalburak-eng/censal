import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/theme';

type AppTextInputProps = Omit<TextInputProps, 'style' | 'onChangeText' | 'value' | 'maxLength'> & {
    label: string;
    value: string; // ham değer (telefonda sadece rakamlar)
    onChangeText: (text: string) => void;
    icon?: React.ComponentProps<typeof Ionicons>['name'];
    maxLength?: number; // ham değer limiti, verilirse sayaç görünür
    hasError?: boolean;
    prefix?: React.ReactNode; // soldaki ayrı kutu (ülke kodu gibi)
    format?: (raw: string) => string; // ekranda gösterilen hali
    sanitize?: (typed: string) => string; // yazılanı ham değere çevirir
    forceLtr?: boolean; // Arapçada da soldan sağa yazılsın (telefon için)
};

export const AppTextInput: React.FC<AppTextInputProps> = ({
    label,
    value,
    onChangeText,
    icon,
    maxLength,
    hasError = false,
    editable = true,
    prefix,
    format,
    sanitize,
    forceLtr = false,
    ...rest
}) => {
    const { colors, isDark } = useTheme();
    const borderColor = hasError ? colors.danger : colors.border;

    const handleChange = (typed: string) => {
        const next = sanitize ? sanitize(typed) : typed;
        onChangeText(maxLength ? next.slice(0, maxLength) : next);
    };

    return (
        <View style={{ gap: tokens.verticalScale(tokens.spacing.xs) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text
                    style={{
                        fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                        fontWeight: tokens.typography.fontWeight.semibold,
                        color: colors.text,
                    }}
                >
                    {label}
                </Text>
                {maxLength !== undefined && (
                    <Text style={{ fontSize: tokens.moderateScale(tokens.typography.fontSize.caption), color: colors.muted }}>
                        {value.length}/{maxLength}
                    </Text>
                )}
            </View>

            <View
                style={{
                    flexDirection: 'row',
                    gap: tokens.scale(tokens.spacing.sm),
                    ...(forceLtr ? { direction: 'ltr' as const } : null),
                }}
            >
                {prefix && (
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            height: tokens.verticalScale(48),
                            paddingHorizontal: tokens.scale(tokens.spacing.md),
                            backgroundColor: colors.surface,
                            borderRadius: tokens.moderateScale(tokens.radii.md),
                            borderWidth: 1,
                            borderColor,
                        }}
                    >
                        {prefix}
                    </View>
                )}

                <View
                    style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        height: tokens.verticalScale(48),
                        backgroundColor: colors.bg,
                        borderRadius: tokens.moderateScale(tokens.radii.md),
                        borderWidth: 1,
                        borderColor,
                        paddingHorizontal: tokens.scale(tokens.spacing.md),
                        gap: tokens.scale(tokens.spacing.sm),
                        opacity: editable ? 1 : 0.6,
                    }}
                >
                    {icon && <Ionicons name={icon} size={18} color={colors.muted} />}
                    <TextInput
                        {...rest}
                        value={format ? format(value) : value}
                        editable={editable}
                        onChangeText={handleChange}
                        placeholderTextColor={colors.muted}
                        keyboardAppearance={isDark ? 'dark' : 'light'}
                        style={{
                            flex: 1,
                            height: '100%',
                            fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                            color: colors.text,
                            ...(forceLtr ? { textAlign: 'left' as const, writingDirection: 'ltr' as const } : null),
                        }}
                    />
                </View>
            </View>
        </View>
    );
};