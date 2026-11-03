import React, { useState, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '@/i18n';
import { getErrorText } from '@/lib/errors';
import { uploadAvatarImage } from '../api/storageApi';

import { ImageViewerModal } from './ui/ImageViewerModal';

type ProfilePhotoPickerProps = {
  avatarUrl?: string | null;
  onAvatarSelected?: (url: string | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  onError?: (message: string) => void;
};

export const ProfilePhotoPicker: React.FC<ProfilePhotoPickerProps> = ({
  avatarUrl,
  onAvatarSelected,
  onUploadingChange,
  onError,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [isUploading, setIsUploading] = useState(false);
  const isUploadingRef = useRef(false);
  const [previewUri, setPreviewUri] = useState<string | null>(avatarUrl ?? null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);

  const handlePickPhoto = async () => {
    if (isUploadingRef.current || isUploading) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        onError?.(t.profile.permissionDenied);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        onError?.(t.profile.imageReadFailed);
        return;
      }

      isUploadingRef.current = true;
      setIsUploading(true);
      onUploadingChange?.(true);
      setPreviewUri(asset.uri);

      // Supabase avatars bucket yüklemesi
      const uploadedUrl = await uploadAvatarImage(asset.base64);

      setPreviewUri(uploadedUrl);
      onAvatarSelected?.(uploadedUrl);
    } catch (err: unknown) {
      console.error('[ProfilePhotoPicker] Yükleme hatası:', err);
      setPreviewUri(avatarUrl ?? null);
      onError?.(getErrorText(err, t, t.profile.uploadFailed));
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  const currentImage = previewUri === null ? null : (previewUri || avatarUrl || null);

  const handleRemovePhoto = () => {
    if (isUploading) return;
    setPreviewUri(null);
    onAvatarSelected?.(null);
  };

  return (
    <View
      style={{
        alignItems: 'center',
        gap: tokens.spacing.xs,
        paddingVertical: tokens.spacing.xs,
      }}
    >
      <ImageViewerModal
        visible={isPreviewModalVisible}
        imageUrl={currentImage}
        title={t.profile.photoPreview}
        onClose={() => setIsPreviewModalVisible(false)}
      />

      <View style={{ position: 'relative' }}>
        <Pressable
          onPress={() => {
            if (currentImage) {
              setIsPreviewModalVisible(true);
            } else {
              handlePickPhoto();
            }
          }}
          disabled={isUploading}
          accessibilityRole="button"
          accessibilityLabel={currentImage ? t.profile.photoPreview : t.profile.addPhoto}
          style={({ pressed }) => [
            {
              width: tokens.scale(88),
              height: tokens.scale(88),
              borderRadius: tokens.moderateScale(tokens.radii.xl),
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: colors.border,
              backgroundColor: colors.primaryTint,
              overflow: 'hidden',
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          {currentImage ? (
            <Image
              source={{ uri: currentImage }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Ionicons name="camera-outline" size={36} color={colors.primaryText} />
          )}

          {/* Yükleme animasyonu veya kamera rozeti */}
          {isUploading && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator color="#FFFFFF" size="small" />
            </View>
          )}
        </Pressable>

        {/* Fotoğraf varsa sağ üstte kırmızı silme rozeti */}
        {currentImage && !isUploading && (
          <Pressable
            onPress={handleRemovePhoto}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t.profile.removePhoto}
            style={({ pressed }) => [
              {
                position: 'absolute',
                top: -6,
                right: -6,
                width: tokens.scale(26),
                height: tokens.scale(26),
                borderRadius: tokens.radii.full,
                backgroundColor: colors.danger,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: colors.surface,
                elevation: 3,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.9 }] },
            ]}
          >
            <Ionicons name="trash" size={13} color="#FFFFFF" />
          </Pressable>
        )}

        {/* Fotoğraf varsa sağ altta kamera rozeti (değiştirme için) */}
        {!isUploading && (
          <Pressable
            onPress={handlePickPhoto}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={currentImage ? t.profile.changePhoto : t.profile.addPhoto}
            style={({ pressed }) => [
              {
                position: 'absolute',
                right: currentImage ? -4 : 4,
                bottom: currentImage ? -4 : 4,
                width: tokens.scale(26),
                height: tokens.scale(26),
                borderRadius: tokens.radii.full,
                backgroundColor: colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: colors.surface,
                elevation: 3,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.9 }] },
            ]}
          >
            <Ionicons name={currentImage ? "camera" : "add"} size={13} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {/* Butonlar / Etiketler */}
      {currentImage ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: tokens.spacing.xs }}>
          <Pressable
            onPress={handlePickPhoto}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="camera-outline" size={15} color={colors.text} />
            <Text
              style={{
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                fontWeight: tokens.typography.fontWeight.semibold,
                color: colors.text,
              }}
            >
              {t.profile.changePhoto}
            </Text>
          </Pressable>



        </View>
      ) : (
        <Text
          style={{
            fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
            fontWeight: tokens.typography.fontWeight.bold,
            marginTop: tokens.spacing.xs,
            color: colors.text,
          }}
        >
          {t.profile.addPhoto}{' '}
          <Text
            style={{
              fontWeight: tokens.typography.fontWeight.regular,
              fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
              color: colors.muted,
            }}
          >
            {t.profile.optional}
          </Text>
        </Text>
      )}
    </View>
  );
};