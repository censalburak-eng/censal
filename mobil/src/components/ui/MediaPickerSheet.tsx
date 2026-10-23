/**
 * MediaPickerSheet — Fotoğraf paylaşımı için bottom sheet bileşeni.
 *
 * Kamera veya galeriden seçim yapılmasını sağlar.
 * Seçilen görseli önizleme olarak gösterir.
 * NSFW denetimi ve yükleme durumunu kullanıcıya bildirir.
 *
 * Kullanım:
 *   <MediaPickerSheet
 *     visible={showSheet}
 *     onClose={() => setShowSheet(false)}
 *     onSend={(url) => onSendMedia('image', url)}
 *   />
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { tokens } from '../../theme/tokens';
import { uploadChatImage } from '../../api/storageApi';
import { useI18n } from '@/i18n';

export type MediaPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Görsel yüklendikten sonra remote URL, local URI ve opsiyonel caption döner */
  onSend: (imageUrl: string, localUri: string, caption?: string) => void;
};

type SheetState =
  | { phase: 'pick' }
  | { phase: 'preview'; uri: string; base64: string; caption: string }
  | { phase: 'uploading'; uri: string }
  | { phase: 'error'; uri?: string; message: string };

export const MediaPickerSheet: React.FC<MediaPickerSheetProps> = ({
  visible,
  onClose,
  onSend,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<SheetState>({ phase: 'pick' });

  const reset = useCallback(() => {
    setState({ phase: 'pick' });
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const pickFromSource = useCallback(
    async (source: 'camera' | 'gallery') => {
      try {
        let result: ImagePicker.ImagePickerResult;

        if (source === 'camera') {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            setState({ phase: 'error', message: t.media.cameraDenied });
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.9,
          });
        } else {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            setState({ phase: 'error', message: t.media.galleryDenied });
            return;
          }
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.9,
          });
        }

        if (result.canceled || !result.assets || result.assets.length === 0) return;

        const asset = result.assets[0];

        // expo-image-manipulator ile genişliği max 1280px ve kaliteyi 0.7'ye sıkıştır
        const manipResult = await manipulateAsync(
          asset.uri,
          [{ resize: { width: 1280 } }],
          { compress: 0.7, format: SaveFormat.JPEG, base64: true }
        );

        if (!manipResult.base64) {
          setState({ phase: 'error', message: t.media.compressFailed });
          return;
        }

        setState({
          phase: 'preview',
          uri: manipResult.uri,
          base64: manipResult.base64,
          caption: '',
        });
      } catch (err) {
        console.error('[MediaPickerSheet] Seçim hatası:', err);
        setState({ phase: 'error', message: t.media.pickError });
      }
    },
    [t]
  );

  const handleSend = useCallback(async () => {
    if (state.phase !== 'preview') return;
    const { uri, base64, caption } = state;

    setState({ phase: 'uploading', uri });

    try {
      const url = await uploadChatImage(base64);
      onSend(url, uri, caption.trim() || undefined);
      handleClose();
    } catch (err: unknown) {
      console.error('[MediaPickerSheet] Yükleme hatası:', err);
      setState({
        phase: 'error',
        uri,
        // NSFW/denetim hatası gibi sunucudan gelen anlamlı mesajı koru
        message: err instanceof Error && err.message ? err.message : t.media.uploadFailed,
      });
    }
  }, [state, onSend, handleClose, t]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
        onPress={state.phase === 'uploading' ? undefined : handleClose}
      />

      <KeyboardAvoidingView
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Sheet */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: tokens.moderateScale(24),
            borderTopRightRadius: tokens.moderateScale(24),
            paddingBottom: (Platform.OS === 'ios' ? tokens.verticalScale(24) : tokens.verticalScale(16)) + insets.bottom,
            paddingTop: tokens.verticalScale(tokens.spacing.sm),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: isDark ? 0.4 : 0.12,
            shadowRadius: 16,
            elevation: 20,
          }}
        >
          {/* Handle bar */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginBottom: tokens.verticalScale(tokens.spacing.base),
            }}
          />

          {/* ── PHASE: pick ── */}
          {state.phase === 'pick' && (
            <>
              <Text
                style={{
                  color: colors.text,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
                  fontWeight: tokens.typography.fontWeight.bold,
                  textAlign: 'center',
                  marginBottom: tokens.verticalScale(tokens.spacing.lg),
                }}
              >
                {t.media.sendTitle}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: tokens.scale(tokens.spacing.md),
                  paddingHorizontal: tokens.scale(tokens.spacing.xxl),
                }}
              >
                {/* Kamera */}
                <Pressable
                  onPress={() => pickFromSource('camera')}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: 'center',
                    backgroundColor: pressed ? colors.surfaceElevated : colors.bg,
                    borderRadius: tokens.moderateScale(tokens.radii.xl),
                    paddingVertical: tokens.verticalScale(tokens.spacing.lg),
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: tokens.verticalScale(8),
                  })}
                >
                  <View
                    style={{
                      width: tokens.scale(56),
                      height: tokens.scale(56),
                      borderRadius: tokens.radii.full,
                      backgroundColor: colors.primaryTint,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="camera" size={28} color={colors.primaryText} />
                  </View>
                  <Text style={{ color: colors.text, fontSize: tokens.moderateScale(tokens.typography.fontSize.base), fontWeight: tokens.typography.fontWeight.semibold }}>
                    {t.media.camera}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(tokens.typography.fontSize.sm), textAlign: 'center' }}>
                    {t.media.cameraHint}
                  </Text>
                </Pressable>

                {/* Galeri */}
                <Pressable
                  onPress={() => pickFromSource('gallery')}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: 'center',
                    backgroundColor: pressed ? colors.surfaceElevated : colors.bg,
                    borderRadius: tokens.moderateScale(tokens.radii.xl),
                    paddingVertical: tokens.verticalScale(tokens.spacing.lg),
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: tokens.verticalScale(8),
                  })}
                >
                  <View
                    style={{
                      width: tokens.scale(56),
                      height: tokens.scale(56),
                      borderRadius: tokens.radii.full,
                      backgroundColor: colors.primaryTint,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="images" size={28} color={colors.primaryText} />
                  </View>
                  <Text style={{ color: colors.text, fontSize: tokens.moderateScale(tokens.typography.fontSize.base), fontWeight: tokens.typography.fontWeight.semibold }}>
                    {t.media.gallery}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(tokens.typography.fontSize.sm), textAlign: 'center' }}>
                    {t.media.galleryHint}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ── PHASE: preview ── */}
          {state.phase === 'preview' && (
            <>
              <Text
                style={{
                  color: colors.text,
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
                  fontWeight: tokens.typography.fontWeight.bold,
                  textAlign: 'center',
                  marginBottom: tokens.verticalScale(tokens.spacing.md),
                }}
              >
                {t.media.previewTitle}
              </Text>

              <View style={{ alignItems: 'center', paddingHorizontal: tokens.scale(tokens.spacing.xxl) }}>
                <Image
                  source={{ uri: state.uri }}
                  style={{
                    width: '100%',
                    aspectRatio: 1,
                    borderRadius: tokens.moderateScale(tokens.radii.lg),
                    backgroundColor: colors.bg,
                  }}
                  resizeMode="cover"
                />
              </View>

              {/* Caption girişi */}
              <View
                style={{
                  marginHorizontal: tokens.scale(tokens.spacing.xxl),
                  marginTop: tokens.verticalScale(tokens.spacing.sm),
                  backgroundColor: colors.bg,
                  borderRadius: tokens.moderateScale(tokens.radii.md),
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: tokens.scale(tokens.spacing.md),
                  paddingVertical: tokens.verticalScale(8),
                }}
              >
                <TextInput
                  value={state.caption}
                  onChangeText={(v) => setState({ ...state, caption: v })}
                  placeholder={t.media.captionPlaceholder}
                  placeholderTextColor={colors.muted}
                  style={{
                    color: colors.text,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                    maxHeight: tokens.verticalScale(60),
                  }}
                  multiline
                />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  gap: tokens.scale(tokens.spacing.sm),
                  paddingHorizontal: tokens.scale(tokens.spacing.xxl),
                  marginTop: tokens.verticalScale(tokens.spacing.sm),
                }}
              >
                <Pressable
                  onPress={reset}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: tokens.verticalScale(tokens.spacing.md),
                    borderRadius: tokens.moderateScale(tokens.radii.lg),
                    backgroundColor: pressed ? colors.surfaceElevated : colors.bg,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                  })}
                >
                  <Text style={{ color: colors.text, fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.moderateScale(tokens.typography.fontSize.base) }}>
                    {t.media.reselect}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSend}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: tokens.verticalScale(tokens.spacing.md),
                    borderRadius: tokens.moderateScale(tokens.radii.lg),
                    backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                  })}
                >
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.moderateScale(tokens.typography.fontSize.base) }}>
                    {t.media.send}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ── PHASE: uploading ── */}
          {state.phase === 'uploading' && (
            <View style={{ alignItems: 'center', paddingVertical: tokens.verticalScale(tokens.spacing.xxl), gap: tokens.verticalScale(tokens.spacing.base) }}>
              {state.uri && (
                <Image
                  source={{ uri: state.uri }}
                  style={{
                    width: tokens.scale(120),
                    height: tokens.scale(120),
                    borderRadius: tokens.moderateScale(tokens.radii.lg),
                    opacity: 0.5,
                    marginBottom: tokens.verticalScale(tokens.spacing.sm),
                  }}
                  resizeMode="cover"
                />
              )}
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.moderateScale(tokens.typography.fontSize.base) }}>
                {t.media.uploading}
              </Text>
              <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(tokens.typography.fontSize.sm), textAlign: 'center', paddingHorizontal: tokens.scale(tokens.spacing.xxl) }}>
                {t.media.scanning}
              </Text>
            </View>
          )}

          {/* ── PHASE: error ── */}
          {state.phase === 'error' && (
            <View style={{ alignItems: 'center', paddingHorizontal: tokens.scale(tokens.spacing.xxl), paddingVertical: tokens.verticalScale(tokens.spacing.lg), gap: tokens.verticalScale(tokens.spacing.md) }}>
              <View
                style={{
                  width: tokens.scale(60),
                  height: tokens.scale(60),
                  borderRadius: tokens.radii.full,
                  backgroundColor: colors.dangerSurface,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="warning" size={28} color={colors.danger} />
              </View>

              <Text style={{ color: colors.text, fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.moderateScale(tokens.typography.fontSize.lg), textAlign: 'center' }}>
                {t.media.failedTitle}
              </Text>

              <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(tokens.typography.fontSize.sm), textAlign: 'center', lineHeight: tokens.moderateScale(tokens.typography.fontSize.sm) * 1.6 }}>
                {state.message}
              </Text>

              <View style={{ flexDirection: 'row', gap: tokens.scale(tokens.spacing.sm), width: '100%', marginTop: tokens.verticalScale(tokens.spacing.sm) }}>
                <Pressable
                  onPress={reset}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: tokens.verticalScale(tokens.spacing.md),
                    borderRadius: tokens.moderateScale(tokens.radii.lg),
                    backgroundColor: pressed ? colors.surfaceElevated : colors.bg,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                  })}
                >
                  <Text style={{ color: colors.text, fontWeight: tokens.typography.fontWeight.semibold }}>{t.media.retry}</Text>
                </Pressable>

                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: tokens.verticalScale(tokens.spacing.md),
                    borderRadius: tokens.moderateScale(tokens.radii.lg),
                    backgroundColor: colors.dangerSurface,
                    alignItems: 'center',
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Text style={{ color: colors.danger, fontWeight: tokens.typography.fontWeight.semibold }}>{t.media.close}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};