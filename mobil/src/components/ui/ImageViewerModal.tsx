import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../../theme/tokens';
import { useI18n } from '../../i18n';

export type ImageViewerModalProps = {
  visible: boolean;
  imageUrl?: string | null;
  title?: string | null;
  caption?: string | null;
  onClose: () => void;
};

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  imageUrl,
  title,
  caption,
  onClose,
}) => {
  const { isRTL, t } = useI18n();

  if (!imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.94)',
        }}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
          {/* Üst Bar: Kapatma Butonu ve Başlık */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: tokens.scale(tokens.spacing.base),
              paddingVertical: tokens.verticalScale(tokens.spacing.sm),
              zIndex: 10,
            }}
          >
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              accessibilityRole="button"
              accessibilityLabel={t.common.close}
              style={({ pressed }) => [
                {
                  width: tokens.scale(40),
                  height: tokens.scale(40),
                  borderRadius: tokens.radii.full,
                  backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  justifyContent: 'center',
                  alignItems: 'center',
                },
                pressed && { backgroundColor: 'rgba(255, 255, 255, 0.28)' },
              ]}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>

            {!!title && (
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                  fontWeight: tokens.typography.fontWeight.bold,
                  maxWidth: '75%',
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
            )}

            <View style={{ width: tokens.scale(40) }} />
          </View>

          {/* Orta Alan: Tam Ekran Görsel */}
          <Pressable
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: tokens.scale(tokens.spacing.xs),
            }}
            onPress={onClose}
          >
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: '100%',
                height: '100%',
              }}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
            />
          </Pressable>

          {/* Alt Alan: Açıklama / Caption (varsa) */}
          {!!caption && (
            <View
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                paddingHorizontal: tokens.scale(tokens.spacing.lg),
                paddingVertical: tokens.verticalScale(tokens.spacing.md),
                borderTopWidth: 1,
                borderTopColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                  lineHeight: 20,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {caption}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};
