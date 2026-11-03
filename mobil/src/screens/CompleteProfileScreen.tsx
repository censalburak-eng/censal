import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useProfile, useUpsertProfile } from '../hooks/useProfile';
import { CitySelectModal } from '../components/CitySelectModal';
import { ProfilePhotoPicker } from '../components/ProfilePhotoPicker';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { getErrorText } from '../lib/errors';
import { CITIES_DATA } from '../data/cities';
import { AppButton } from '../components/ui';
import { AppTextInput } from '../components/ui/AppInput';
import { formatPhone, sanitizePhone, PHONE_MAX_DIGITS } from '../utils/phone';
import { supabase } from '../lib/supabase';

export const CompleteProfileScreen: React.FC = () => {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEdit = mode === 'edit';

  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const upsertProfileMutation = useUpsertProfile();
  const { colors } = useTheme();
  const { t } = useI18n();

  const isSaving = upsertProfileMutation.isPending;

  const [ad, setAd] = useState(profile?.ad || '');
  const [soyad, setSoyad] = useState(profile?.soyad || '');
  const [sehir, setSehir] = useState(profile?.sehir || 'İstanbul');
  const [plate, setPlate] = useState(
    CITIES_DATA.find((c) => c.plateCode === (profile?.city_id || '34'))?.plateCode || '34'
  );
  const [numaraGizli, setNumaraGizli] = useState<boolean>(profile?.numara_gizli ?? true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.foto_url ?? profile?.avatar_url ?? null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const isSavingRef = useRef(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telefon, setTelefon] = useState(profile?.phone || '');

  useEffect(() => {
    if (!profile) return;

    const dbCity = profile.city_id;

    if (dbCity) {
      const foundCity = CITIES_DATA.find(
        (c) => c.plateCode.toLowerCase() === String(dbCity).padStart(2, '0').toLowerCase()
      );
      setSehir(foundCity?.name || 'İstanbul');
      setPlate(foundCity?.plateCode || profile.plate_code || '34');
    }

    if (profile.ad) setAd(profile.ad);
    if (profile.soyad) setSoyad(profile.soyad);
    if (profile.phone) setTelefon(profile.phone);
    if (profile.numara_gizli !== undefined) setNumaraGizli(profile.numara_gizli);
    setAvatarUrl(profile.foto_url ?? profile.avatar_url ?? null);
  }, [profile]);

  const goNext = () => {
    if (isEdit) {
      if (router.canGoBack()) router.back();
    } else {
      router.replace('/');
    }
  };

  const handleSave = async () => {
    if (isSaving || isUploadingPhoto || isSavingRef.current) return;
    if (!ad.trim() || !soyad.trim() || !sehir.trim()) {
      setError(t.profile.validationError);
      return;
    }
    if (!user?.id) {
      setError(t.errors.unauthorized);
      return;
    }

    // Yasaklı kelime kontrolü (Ad ve Soyad)
    try {
      const [{ data: filteredAd }, { data: filteredSoyad }] = await Promise.all([
        supabase.rpc('filter_banned_words', { p_text: ad.trim() }),
        supabase.rpc('filter_banned_words', { p_text: soyad.trim() }),
      ]);

      const hasBannedAd = Boolean(filteredAd && (filteredAd !== ad.trim() || filteredAd.includes('***')));
      const hasBannedSoyad = Boolean(filteredSoyad && (filteredSoyad !== soyad.trim() || filteredSoyad.includes('***')));

      if (hasBannedAd || hasBannedSoyad) {
        setError(t.profile.bannedWordError);
        return;
      }
    } catch (filterErr) {
      console.warn('[handleSave] Banned word check warning:', filterErr);
    }

    // Hiçbir alan değişmemişse ağ isteği atma, doğrudan dön
    let isUnchanged = false;
    if (profile) {
      const currentCityId = CITIES_DATA.find((c) => c.name.toLowerCase() === sehir.trim().toLowerCase())?.id ?? 34;
      const profileCityId =
        profile.city_id ??
        (CITIES_DATA.find((c) => c.name.toLowerCase() === (profile.sehir || '').trim().toLowerCase())?.id ?? 34);
      const isCityUnchanged = currentCityId === profileCityId;

      const isPhoneUnchanged = sanitizePhone(telefon) === sanitizePhone(profile.phone || '');
      const isHidePhoneUnchanged =
        Boolean(numaraGizli) === Boolean(profile.hide_phone ?? profile.numara_gizli ?? true);
      const isNameUnchanged =
        ad.trim() === (profile.first_name || profile.ad || '').trim() &&
        soyad.trim() === (profile.last_name || profile.soyad || '').trim();
      const isAvatarUnchanged = (avatarUrl || null) === (profile.avatar_url || profile.foto_url || null);

      isUnchanged = isCityUnchanged && isPhoneUnchanged && isHidePhoneUnchanged && isNameUnchanged && isAvatarUnchanged;
    }

    if (isUnchanged) {
      goNext();
      return;
    }

    try {
      isSavingRef.current = true;
      setError(null);
      await upsertProfileMutation.mutateAsync({
        userId: user.id,
        input: {
          ad: ad.trim(),
          soyad: soyad.trim(),
          sehir: sehir.trim(),
          numara_gizli: numaraGizli,
          avatar_url: avatarUrl,
          phone: sanitizePhone(telefon) || null,
        },
      });
      goNext();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : t.profile.saveFailed;
      const errStr = String(err);

      if (errMsg.includes('BANNED_WORD_NAME') || errMsg.includes('yasaklı kelime')) {
        setError(t.profile.bannedWordError);
        return;
      }

      const isStaleAccount = ['hesabı bulunamadı', 'oturumu geçersiz', 'profiles_id_fkey', '23503'].some(
        (k) => errMsg.includes(k) || errStr.includes(k)
      );
      if (isStaleAccount) {
        await signOut();
        router.replace('/(auth)/phone');
        return;
      }
      setError(getErrorText(err, t, t.profile.saveFailed));
    } finally {
      isSavingRef.current = false;
    }
  };

  const buttonLabel = isUploadingPhoto
    ? t.profile.uploadingPhoto
    : isEdit
      ? t.profile.updateAndContinue
      : t.profile.completeRegistration;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: tokens.scale(tokens.spacing.base),
            paddingTop: tokens.verticalScale(tokens.spacing.sm),
            paddingBottom: tokens.verticalScale(tokens.spacing.xxl),
            gap: tokens.verticalScale(tokens.spacing.md),
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profil Fotoğrafı */}
          <ProfilePhotoPicker
            avatarUrl={avatarUrl}
            onAvatarSelected={setAvatarUrl}
            onUploadingChange={setIsUploadingPhoto}
            onError={setError}
          />

          {/* Form Alanı */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: tokens.moderateScale(tokens.radii.xl),
              padding: tokens.scale(tokens.spacing.lg),
              gap: tokens.verticalScale(tokens.spacing.md),
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <AppTextInput
              label={t.profile.firstNameLabel}
              icon="person-outline"
              value={ad}
              onChangeText={(v) => { setAd(v); setError(null); }}
              placeholder={t.profile.firstNamePlaceholder}
              maxLength={30}
              autoCapitalize="words"
              textContentType="givenName"
            />
            <AppTextInput
              label={t.profile.lastNameLabel}
              icon="people-outline"
              value={soyad}
              onChangeText={(v) => { setSoyad(v); setError(null); }}
              placeholder={t.profile.lastNamePlaceholder}
              maxLength={30}
              autoCapitalize="words"
              textContentType="familyName"
            />
            <AppTextInput
              label={t.profile.phoneLabel}
              icon="call-outline"
              value={telefon}
              onChangeText={(v) => { setTelefon(v); setError(null); }}
              placeholder={t.profile.phonePlaceholder}
              maxLength={PHONE_MAX_DIGITS}
              format={formatPhone}
              sanitize={sanitizePhone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              forceLtr
              hasError={error === t.profile.phoneInvalid}
              prefix={
                <>
                  <Text style={{ fontSize: 16 }}>🇹🇷</Text>
                  <Text
                    style={{
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                      fontWeight: tokens.typography.fontWeight.bold,
                      color: colors.text,
                    }}
                  >
                    +90
                  </Text>
                </>
              }
            />

            {/* Şehir Seçim */}
            <View style={{ gap: tokens.verticalScale(tokens.spacing.xs) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                    fontWeight: tokens.typography.fontWeight.semibold,
                    color: colors.text,
                  }}
                >
                  {t.profile.cityLabel}
                </Text>
                <Text style={{ fontSize: tokens.moderateScale(tokens.typography.fontSize.caption), color: colors.muted }}>
                  {t.profile.cityNetworkBadge}
                </Text>
              </View>
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: tokens.verticalScale(54),
                  backgroundColor: colors.bg,
                  borderRadius: tokens.moderateScale(tokens.radii.md),
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: tokens.scale(tokens.spacing.md),
                  gap: tokens.scale(tokens.spacing.md),
                }}
                onPress={() => setIsCityModalOpen(true)}
                disabled={isUploadingPhoto || isSaving || isSavingRef.current}
              >
                <View
                  style={{
                    width: tokens.scale(36),
                    height: tokens.verticalScale(36),
                    backgroundColor: colors.surface,
                    borderRadius: tokens.radii.sm,
                    borderWidth: 1,
                    borderColor: colors.border,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontWeight: tokens.typography.fontWeight.heavy, color: colors.text }}>{plate}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                      fontWeight: tokens.typography.fontWeight.bold,
                      color: colors.text,
                    }}
                  >
                    {sehir}
                  </Text>
                </View>

                <Ionicons name="chevron-down-outline" size={20} color={colors.muted} />
              </Pressable>
            </View>

            {/* Gizlilik Anahtarı */}
            <View
              style={{
                backgroundColor: colors.bg,
                borderRadius: tokens.moderateScale(tokens.radii.lg),
                padding: tokens.scale(tokens.spacing.md),
                borderWidth: 1,
                borderColor: colors.border,
                gap: tokens.verticalScale(tokens.spacing.xs),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.scale(tokens.spacing.sm), flex: 1 }}
                >
                  <View
                    style={{
                      width: tokens.scale(32),
                      height: tokens.scale(32),
                      borderRadius: tokens.radii.full,
                      backgroundColor: colors.primaryTint,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="eye-off-outline" size={18} color={colors.primaryText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                        fontWeight: tokens.typography.fontWeight.bold,
                        color: colors.text,
                      }}
                    >
                      {t.profile.hidePhoneLabel}
                    </Text>
                    <Text
                      style={{
                        fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                        color: colors.muted,
                      }}
                    >
                      {numaraGizli ? t.profile.hidePhoneOn : t.profile.hidePhoneOff}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={numaraGizli}
                  onValueChange={setNumaraGizli}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <Text
                style={{
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  color: colors.muted,
                  lineHeight: 16,
                }}
              >
                {t.profile.hidePhoneHint}
              </Text>
            </View>

            {error && (
              <Text
                style={{
                  color: colors.danger,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                  fontWeight: tokens.typography.fontWeight.medium,
                }}
              >
                {error}
              </Text>
            )}

            <AppButton
              variant="primary"
              size="lg"
              label={buttonLabel}
              icon="arrow-forward"
              iconPosition="right"
              loading={isSaving || isUploadingPhoto}
              disabled={isSaving || isUploadingPhoto}
              onPress={handleSave}
              fullWidth
            />

            <View style={{ flexDirection: 'row', gap: tokens.scale(6), alignItems: 'flex-start', marginTop: 4 }}>
              <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
              <Text
                style={{
                  flex: 1,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.caption),
                  color: colors.muted,
                  lineHeight: 16,
                }}
              >
                {t.profile.hint}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CitySelectModal
        visible={isCityModalOpen}
        selectedCity={sehir}
        onSelect={(cityData) => {
          setSehir(cityData.name);
          setPlate(cityData.plateCode);
          setError(null);
        }}
        onClose={() => setIsCityModalOpen(false)}
      />
    </SafeAreaView>
  );
};