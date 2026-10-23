/**
 * AppModal — Native Alert.alert'in yerini alan evrensel modal bileşeni.
 *
 * Kullanım:
 *   const { showModal, modalProps } = useModal();
 *   <AppModal {...modalProps} />
 *   showModal({ title: '...', message: '...', actions: [...] });
 *
 * Veya doğrudan controlled:
 *   <AppModal
 *     visible={true}
 *     title="Başlık"
 *     message="Açıklama"
 *     actions={[
 *       { label: 'Vazgeç', style: 'cancel', onPress: () => {} },
 *       { label: 'Sil', style: 'destructive', onPress: () => {} },
 *     ]}
 *     onDismiss={() => setVisible(false)}
 *   />
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { tokens } from '../../theme/tokens';
import { useTheme } from '../../theme';

export type ModalActionStyle = 'default' | 'cancel' | 'destructive';

export type ModalAction = {
  label: string;
  style?: ModalActionStyle;
  onPress: () => void;
};

export type AppModalProps = {
  visible: boolean;
  title?: string;
  message?: string;
  /** İsteğe bağlı – actions yerine özel içerik render edebilirsiniz */
  children?: React.ReactNode;
  actions?: ModalAction[];
  /** Backdrop'a basılınca çağrılır */
  onDismiss?: () => void;
  /** Icon adı (Ionicons) veya özel node */
  icon?: React.ReactNode;
};

export const AppModal: React.FC<AppModalProps> = ({
  visible,
  title,
  message,
  children,
  actions = [],
  onDismiss,
  icon,
}) => {
  const { colors, isDark } = useTheme();

  const getActionColor = (style?: ModalActionStyle) => {
    switch (style) {
      case 'destructive':
        return colors.danger;
      case 'cancel':
        return colors.muted;
      default:
        return colors.primary;
    }
  };

  const getActionWeight = (style?: ModalActionStyle): '400' | '600' | '700' => {
    return style === 'cancel' ? '400' : '700';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)' },
        ]}
        onPress={onDismiss}
      />

      {/* Modal Kutusu */}
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: tokens.scale(32),
          // Klavye açık olsa bile ortalansın
          paddingBottom: Platform.OS === 'ios' ? tokens.verticalScale(32) : 0,
        }}
        pointerEvents="box-none"
      >
        <View
          style={{
            width: '100%',
            maxWidth: tokens.scale(340),
            backgroundColor: colors.surface,
            borderRadius: tokens.moderateScale(tokens.radii.xl),
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            // Hafif gölge
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.5 : 0.18,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          {/* Başlık & İkon Alanı */}
          <View
            style={{
              paddingTop: tokens.verticalScale(tokens.spacing.xl),
              paddingHorizontal: tokens.scale(tokens.spacing.xl),
              paddingBottom: tokens.verticalScale(tokens.spacing.sm),
              alignItems: 'center',
              gap: tokens.verticalScale(10),
            }}
          >
            {icon && icon}

            {title && (
              <Text
                style={{
                  color: colors.text,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
                  fontWeight: tokens.typography.fontWeight.bold,
                  textAlign: 'center',
                  lineHeight: tokens.moderateScale(tokens.typography.fontSize.lg) * 1.35,
                }}
              >
                {title}
              </Text>
            )}

            {message && (
              <Text
                style={{
                  color: colors.muted,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                  textAlign: 'center',
                  lineHeight: tokens.moderateScale(tokens.typography.fontSize.sm) * 1.55,
                }}
              >
                {message}
              </Text>
            )}
          </View>

          {/* Özel İçerik */}
          {children && (
            <View
              style={{
                paddingHorizontal: tokens.scale(tokens.spacing.xl),
                paddingBottom: tokens.verticalScale(tokens.spacing.sm),
              }}
            >
              {children}
            </View>
          )}

          {/* Aksiyonlar */}
          {actions.length > 0 && (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                marginTop: tokens.verticalScale(tokens.spacing.sm),
                flexDirection: actions.length === 2 ? 'row' : 'column',
              }}
            >
              {actions.map((action, index) => {
                const isLast = index === actions.length - 1;
                const isRow = actions.length === 2;

                return (
                  <Pressable
                    key={`modal-action-${index}`}
                    onPress={() => {
                      action.onPress();
                    }}
                    style={({ pressed }) => [
                      {
                        flex: isRow ? 1 : undefined,
                        paddingVertical: tokens.verticalScale(tokens.spacing.md),
                        paddingHorizontal: tokens.scale(tokens.spacing.base),
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: pressed
                          ? colors.surfaceElevated
                          : 'transparent',
                        borderRightWidth: isRow && !isLast ? 1 : 0,
                        borderRightColor: colors.border,
                        borderTopWidth: !isRow && index > 0 ? 1 : 0,
                        borderTopColor: colors.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <Text
                      style={{
                        color: getActionColor(action.style),
                        fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                        fontWeight: getActionWeight(action.style),
                      }}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
