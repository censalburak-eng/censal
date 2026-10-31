import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';
import { useI18n } from '@/i18n';

interface SupportContactModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string | null;
}

const SUPPORT_WHATSAPP_PHONE = '905439089192';
const SUPPORT_EMAIL = 'censal.app@gmail.com';

export const SupportContactModal: React.FC<SupportContactModalProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const { colors, isDark } = useTheme();
  const { isRTL } = useI18n();
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleOpenWhatsApp = async () => {
    setErrorText(null);
    const text = encodeURIComponent(
      `Merhaba Censal Destek Ekibi, bilgi ve destek almak istiyorum.${userId ? ` (Kullanıcı ID: ${userId})` : ''}`
    );
    const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP_PHONE}?text=${text}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(whatsappUrl);
      }
    } catch {
      setErrorText('WhatsApp uygulaması cihazınızda açılamadı. Lütfen e-posta ile iletişime geçiniz.');
    }
  };

  const handleOpenEmail = async () => {
    setErrorText(null);
    const subject = encodeURIComponent('Censal Destek Talebi');
    const body = encodeURIComponent(
      `Merhaba Censal Destek Ekibi,\n\nKullanıcı ID: ${userId ?? 'Giriş Yapılmamış'}\nKonu / Destek Talebim:\n`
    );
    const mailUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    try {
      await Linking.openURL(mailUrl);
    } catch {
      setErrorText(`E-posta uygulaması açılamadı. Lütfen doğrudan ${SUPPORT_EMAIL} adresine e-posta gönderiniz.`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: tokens.scale(tokens.spacing.base),
        }}
      >
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
          onPress={onClose}
          accessibilityLabel="Kapat"
        />

        <View
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: colors.surface,
            borderRadius: tokens.radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: tokens.scale(tokens.spacing.lg),
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0.4 : 0.15,
            shadowRadius: 20,
            elevation: 10,
            zIndex: 1,
          }}
        >
          {/* Header: İkon, Başlık ve Kapat Butonu */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: tokens.verticalScale(tokens.spacing.sm),
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: tokens.scale(tokens.spacing.xs),
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.primaryTint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="headset-outline" size={20} color={colors.primary} />
              </View>
              <Text
                style={{
                  color: colors.text,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
                  fontWeight: tokens.typography.fontWeight.bold,
                }}
              >
                Yardım ve Destek
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>

          {errorText && (
            <View
              style={{
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                borderRadius: tokens.radii.md,
                padding: tokens.scale(tokens.spacing.sm),
                marginBottom: tokens.verticalScale(tokens.spacing.sm),
              }}
            >
              <Text
                style={{
                  color: isDark ? '#FCA5A5' : '#B91C1C',
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {errorText}
              </Text>
            </View>
          )}

          <Text
            style={{
              color: colors.muted,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
              lineHeight: 20,
              marginBottom: tokens.verticalScale(tokens.spacing.base),
            }}
          >
            Censal destek ve güvenlik ekibine WhatsApp veya e-posta üzerinden doğrudan ulaşabilirsiniz.
          </Text>

          <View style={{ gap: tokens.verticalScale(tokens.spacing.sm) }}>
            {/* 1. SEÇENEK: WHATSAPP İLETİŞİM */}
            <Pressable
              onPress={handleOpenWhatsApp}
              accessibilityRole="button"
              accessibilityLabel="WhatsApp ile İletişim"
              style={({ pressed }) => ({
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#062E1A' : '#ECFDF5',
                borderColor: '#10B98155',
                borderWidth: 1.5,
                borderRadius: tokens.radii.lg,
                padding: tokens.scale(tokens.spacing.base),
                gap: tokens.scale(tokens.spacing.sm),
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#25D366',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text
                    style={{
                      color: isDark ? '#34D399' : '#065F46',
                      fontSize: tokens.moderateScale(11),
                      fontWeight: tokens.typography.fontWeight.bold,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    WhatsApp Business
                  </Text>
                  <Ionicons name="checkmark-circle" size={13} color={isDark ? '#34D399' : '#059669'} />
                </View>
                <Text
                  style={{
                    color: isDark ? '#FFFFFF' : '#047857',
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                    fontWeight: tokens.typography.fontWeight.bold,
                    letterSpacing: 0.2,
                  }}
                >
                  Canlı Destek Hattı
                </Text>
                <Text
                  style={{
                    color: isDark ? '#A7F3D0' : '#047857',
                    fontSize: tokens.moderateScale(11),
                    marginTop: 2,
                  }}
                >
                  Resmi kurumsal hat üzerinden anında sohbet başlatın
                </Text>
              </View>

              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={isDark ? '#34D399' : '#059669'}
              />
            </Pressable>

            {/* 2. SEÇENEK: E-POSTA İLETİŞİM */}
            <Pressable
              onPress={handleOpenEmail}
              accessibilityRole="button"
              accessibilityLabel="E-posta ile İletişim"
              style={({ pressed }) => ({
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: colors.border,
                borderWidth: 1.5,
                borderRadius: tokens.radii.lg,
                padding: tokens.scale(tokens.spacing.base),
                gap: tokens.scale(tokens.spacing.sm),
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="mail-outline" size={22} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: tokens.moderateScale(11),
                    fontWeight: tokens.typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Resmi Destek E-postası
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                    fontWeight: tokens.typography.fontWeight.bold,
                  }}
                  numberOfLines={1}
                >
                  {SUPPORT_EMAIL}
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: tokens.moderateScale(11),
                    marginTop: 2,
                  }}
                >
                  7/24 resmi bildirim ve güvenlik
                </Text>
              </View>

              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={colors.muted}
              />
            </Pressable>
          </View>

          {/* Kapat Butonu */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              marginTop: tokens.verticalScale(tokens.spacing.base),
              paddingVertical: tokens.verticalScale(12),
              borderRadius: tokens.radii.md,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                fontWeight: tokens.typography.fontWeight.semibold,
              }}
            >
              Kapat
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
