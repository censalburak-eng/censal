import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useBanAppeals } from '../hooks/useBanAppeals';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';
import { useI18n } from '../i18n';
import { supabase } from '../lib/supabase';
import { AppModal } from '../components/ui';
import { useModal } from '../hooks/useModal';

export const BannedScreen: React.FC = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { latestAppeal, appeals, sendAppeal, isSending } = useBanAppeals();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const { show: showModal, hide: hideModal, modalProps } = useModal();

  const [message, setMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);

  const handleSendAppeal = async () => {
    if (message.trim().length < 10) {
      showModal({
        title: 'Eksik Bilgi',
        message: 'Lütfen yöneticilere durumunuzu açıklayan en az 10 karakterlik bir mesaj yazınız.',
        actions: [{ label: 'Tamam', style: 'default', onPress: hideModal }],
      });
      return;
    }

    try {
      await sendAppeal({
        message: message.trim(),
      });

      setMessage('');
      setSuccessNotice(true);
      showModal({
        title: 'İtirazınız İletildi',
        message: t.bannedScreen.appealSentSuccess,
        actions: [{ label: 'Tamam', style: 'default', onPress: hideModal }],
      });
    } catch (err: any) {
      showModal({
        title: 'Gönderilemedi',
        message: err.message || 'Mesaj iletilirken bir hata oluştu. Lütfen tekrar deneyiniz.',
        actions: [{ label: 'Kapat', style: 'cancel', onPress: hideModal }],
      });
    }
  };

  const handleOpenEmailSupport = () => {
    const subject = encodeURIComponent(`Hesap Askıya Alma İtirazı - ${user?.id ?? ''}`);
    const body = encodeURIComponent(
      `Merhaba Şehir Odaları Yönetimi,\n\nHesabımın askıya alınmasıyla ilgili inceleme talep ediyorum.\n\nKullanıcı ID: ${user?.id ?? ''}\nAd Soyad: ${profile?.first_name ?? ''} ${profile?.last_name ?? ''}\nTelefon: ${profile?.phone ?? ''}\n\nAçıklamam:\n`
    );
    Linking.openURL(`mailto:destek@sehirodalari.com?subject=${subject}&body=${body}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const formattedDate = profile?.banned_at
    ? new Date(profile.banned_at).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: tokens.spacing.base,
            paddingBottom: tokens.spacing.xxxl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Üst Uyarı & Başlık */}
          <View style={{ alignItems: 'center', marginVertical: tokens.spacing.lg }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: tokens.radii.full,
                backgroundColor: colors.dangerSurface,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: tokens.spacing.base,
                borderWidth: 1.5,
                borderColor: colors.danger,
              }}
            >
              <Ionicons name="shield-outline" size={38} color={colors.danger} />
            </View>

            <Text
              style={{
                fontSize: tokens.typography.fontSize.xl,
                fontWeight: tokens.typography.fontWeight.bold,
                color: colors.text,
                textAlign: 'center',
                marginBottom: tokens.spacing.xs,
              }}
            >
              {t.bannedScreen.title}
            </Text>

            <Text
              style={{
                fontSize: tokens.typography.fontSize.sm,
                color: colors.muted,
                textAlign: 'center',
                lineHeight: 20,
                paddingHorizontal: tokens.spacing.sm,
              }}
            >
              {t.bannedScreen.subtitle}
            </Text>
          </View>

          {/* 2. Ban Detayı Kartı */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: tokens.radii.lg,
              padding: tokens.spacing.base,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: tokens.spacing.base,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: tokens.spacing.md,
                paddingBottom: tokens.spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.semibold,
                  color: colors.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {t.bannedScreen.statusTitle}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.dangerSurface,
                  paddingHorizontal: tokens.spacing.sm,
                  paddingVertical: tokens.spacing.xs,
                  borderRadius: tokens.radii.sm,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.danger,
                    marginEnd: 6,
                  }}
                />
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: tokens.typography.fontSize.caption,
                    fontWeight: tokens.typography.fontWeight.bold,
                  }}
                >
                  {t.bannedScreen.statusActive}
                </Text>
              </View>
            </View>

            {/* Askıya Alınma Nedeni */}
            <View style={{ marginBottom: tokens.spacing.sm }}>
              <Text
                style={{
                  fontSize: tokens.typography.fontSize.caption,
                  color: colors.muted,
                  marginBottom: 4,
                  fontWeight: tokens.typography.fontWeight.medium,
                }}
              >
                {t.bannedScreen.reasonTitle}
              </Text>
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
                  padding: tokens.spacing.md,
                  borderRadius: tokens.radii.md,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
                }}
              >
                <Text
                  style={{
                    fontSize: tokens.typography.fontSize.base,
                    color: colors.danger,
                    fontWeight: tokens.typography.fontWeight.semibold,
                    lineHeight: 22,
                  }}
                >
                  {profile?.banned_reason || t.bannedScreen.defaultReason}
                </Text>
              </View>
            </View>

            {/* Tarih */}
            {formattedDate && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: tokens.spacing.xs }}>
                <Ionicons name="time-outline" size={14} color={colors.muted} />
                <Text
                  style={{
                    fontSize: tokens.typography.fontSize.caption,
                    color: colors.muted,
                    marginStart: 4,
                  }}
                >
                  {t.bannedScreen.dateTitle}: {formattedDate}
                </Text>
              </View>
            )}
          </View>

          {/* 3. Daha Önce Gönderilmiş İtiraz veya Yönetici Yanıtı */}
          {latestAppeal && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: tokens.radii.lg,
                padding: tokens.spacing.base,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: tokens.spacing.base,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.spacing.sm }}>
                <Ionicons name="mail-open-outline" size={16} color={colors.primary} />
                <Text
                  style={{
                    fontSize: tokens.typography.fontSize.sm,
                    fontWeight: tokens.typography.fontWeight.semibold,
                    color: colors.text,
                    marginStart: 6,
                  }}
                >
                  Gönderilen İtirazınız
                </Text>
                <View
                  style={{
                    marginStart: 'auto',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: tokens.radii.xs,
                    backgroundColor:
                      latestAppeal.status === 'resolved'
                        ? colors.successSurface
                        : colors.primaryTint,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: tokens.typography.fontWeight.semibold,
                      color:
                        latestAppeal.status === 'resolved'
                          ? colors.success
                          : colors.primary,
                    }}
                  >
                    {latestAppeal.status === 'resolved'
                      ? 'Çözümlendi'
                      : latestAppeal.status === 'reviewed'
                      ? 'İncelendi'
                      : 'İnceleniyor'}
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  fontSize: tokens.typography.fontSize.sm,
                  color: colors.text,
                  lineHeight: 20,
                  backgroundColor: colors.bg,
                  padding: tokens.spacing.sm,
                  borderRadius: tokens.radii.sm,
                  marginBottom: latestAppeal.admin_reply ? tokens.spacing.md : 0,
                }}
              >
                "{latestAppeal.message}"
              </Text>

              {/* Yönetici Yanıtı Varsa */}
              {latestAppeal.admin_reply && (
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(79, 70, 229, 0.12)' : '#EEF2FF',
                    padding: tokens.spacing.md,
                    borderRadius: tokens.radii.md,
                    borderWidth: 1,
                    borderColor: colors.primaryTint,
                  }}
                >
                  <Text
                    style={{
                      fontSize: tokens.typography.fontSize.caption,
                      fontWeight: tokens.typography.fontWeight.bold,
                      color: colors.primary,
                      marginBottom: 4,
                    }}
                  >
                    {t.bannedScreen.adminReplyTitle}:
                  </Text>
                  <Text
                    style={{
                      fontSize: tokens.typography.fontSize.sm,
                      color: colors.text,
                      lineHeight: 20,
                    }}
                  >
                    {latestAppeal.admin_reply}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 4. Yöneticiye Mesaj Formu (İtiraz Formu) */}
          {(() => {
            const appealCount = latestAppeal?.appeal_count ?? 0;
            const hasReachedLimit = appealCount >= 2;

            return (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: tokens.radii.lg,
                  padding: tokens.spacing.base,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: tokens.spacing.base,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text
                    style={{
                      fontSize: tokens.typography.fontSize.md,
                      fontWeight: tokens.typography.fontWeight.bold,
                      color: colors.text,
                    }}
                  >
                    {t.bannedScreen.appealTitle}
                  </Text>
                  <View
                    style={{
                      backgroundColor: hasReachedLimit ? colors.dangerSurface : colors.primaryTint,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: tokens.radii.sm,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: tokens.typography.fontSize.caption,
                        fontWeight: tokens.typography.fontWeight.semibold,
                        color: hasReachedLimit ? colors.danger : colors.primary,
                      }}
                    >
                      {appealCount}/2 Hak
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    fontSize: tokens.typography.fontSize.caption,
                    color: colors.muted,
                    marginBottom: tokens.spacing.md,
                    lineHeight: 18,
                  }}
                >
                  {hasReachedLimit
                    ? 'Maksimum 2 itiraz hakkınızı doldurdunuz. Yöneticinin incelemesini bekleyiniz veya destek e-postası ile iletişime geçiniz.'
                    : appealCount === 1
                    ? 'İlk itirazınızı ilettiniz. Dilerseniz son bir ek açıklama daha (2/2) gönderebilirsiniz.'
                    : t.bannedScreen.appealDescription}
                </Text>

                {!hasReachedLimit ? (
                  <>
                    <TextInput
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        borderRadius: tokens.radii.md,
                        padding: tokens.spacing.md,
                        fontSize: tokens.typography.fontSize.sm,
                        minHeight: 100,
                        textAlignVertical: 'top',
                        borderWidth: 1,
                        borderColor: colors.border,
                        marginBottom: tokens.spacing.md,
                      }}
                      placeholder={t.bannedScreen.appealPlaceholder}
                      placeholderTextColor={colors.muted}
                      multiline
                      value={message}
                      onChangeText={setMessage}
                      maxLength={500}
                    />

                    <TouchableOpacity
                      onPress={handleSendAppeal}
                      disabled={isSending || message.trim().length < 5}
                      style={{
                        backgroundColor: colors.primary,
                        borderRadius: tokens.radii.md,
                        paddingVertical: tokens.spacing.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        opacity: isSending || message.trim().length < 5 ? 0.6 : 1,
                      }}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" style={{ marginEnd: 6 }} />
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: tokens.typography.fontSize.sm,
                              fontWeight: tokens.typography.fontWeight.semibold,
                            }}
                          >
                            {appealCount === 1 ? 'Son İtirazı Gönder (2/2)' : t.bannedScreen.sendAppealButton}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <View
                    style={{
                      padding: tokens.spacing.md,
                      borderRadius: tokens.radii.md,
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
                    }}
                  >
                    <Text style={{ fontSize: tokens.typography.fontSize.caption, color: colors.danger, textAlign: 'center' }}>
                      İtiraz sınırına (2/2) ulaşıldı. Yeni itiraz gönderilemez.
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* 5. Alternatif Destek & Çıkış */}
          <View style={{ gap: tokens.spacing.sm }}>
            <TouchableOpacity
              onPress={handleOpenEmailSupport}
              style={{
                backgroundColor: colors.surface,
                borderRadius: tokens.radii.md,
                paddingVertical: tokens.spacing.md,
                paddingHorizontal: tokens.spacing.base,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
            >
              <Ionicons name="mail-outline" size={16} color={colors.text} style={{ marginEnd: 8 }} />
              <Text
                style={{
                  color: colors.text,
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                }}
              >
                {t.bannedScreen.contactSupportEmail}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              style={{
                paddingVertical: tokens.spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: colors.danger,
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                }}
              >
                {t.bannedScreen.logoutButton}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppModal {...modalProps} />
    </SafeAreaView>
  );
};
