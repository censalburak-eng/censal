/**
 * EditMessageSheet - Mesaj düzenleme bottom sheet.
 * Text mesajları ve foto caption düzenleme destekler.
 */
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { tokens } from "../../theme/tokens";
import { useI18n } from "../../i18n";
import { RoomMessage } from "../../types/messages.types";

export type EditMessageSheetProps = {
  visible: boolean;
  message: RoomMessage | null;
  onClose: () => void;
  /** Düzenlenen içerikle çağrılır */
  onSave: (messageId: string, newBody: string, newCaption?: string | null) => void;
};

export const EditMessageSheet: React.FC<EditMessageSheetProps> = ({
  visible,
  message,
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const [body, setBody] = useState("");
  const [caption, setCaption] = useState("");

  // Sheet her açıldığında / mesaj değiştiğinde state'i sıfırla
  useEffect(() => {
    if (!message) return;
    setBody(message.type === "image" ? "" : message.body);
    setCaption(message.caption ?? "");
  }, [message, visible]);

  if (!message) return null;

  const rowDirection = isRTL ? "row-reverse" : "row";

  // ── Mesaj tipine göre düzenleme modu ─────────────────────────────────────
  const modes = {
    image: {
      title: t.roomDetail.editCaptionTitle,
      placeholder: t.media.captionPlaceholder,
      value: caption,
      onChange: setCaption,
      canSave: true,
      save: () => onSave(message.id, message.body, caption.trim() || null),
    },
    text: {
      title: t.roomDetail.editMessage,
      placeholder: t.chat.placeholder,
      value: body,
      onChange: setBody,
      canSave: body.trim().length > 0,
      save: () => onSave(message.id, body.trim()),
    },
  };

  const mode = message.type === "image" ? modes.image : modes.text;

  const handleSave = () => {
    if (!mode.canSave) return;
    mode.save();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          onPress={onClose}
        />

        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.surface,
            borderTopStartRadius: tokens.moderateScale(24),
            borderTopEndRadius: tokens.moderateScale(24),
            paddingBottom: Platform.OS === "ios" ? 36 : 24,
            paddingTop: tokens.verticalScale(tokens.spacing.sm),
            paddingHorizontal: tokens.scale(tokens.spacing.xxl),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: tokens.verticalScale(tokens.spacing.md),
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: "center",
              marginBottom: tokens.verticalScale(tokens.spacing.xs),
            }}
          />

          {/* Başlık */}
          <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}>
            <Text
              style={{
                color: colors.text,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
                fontWeight: tokens.typography.fontWeight.bold,
              }}
            >
              {mode.title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t.common.close}
            >
              <Ionicons name="close-circle" size={22} color={colors.muted} />
            </Pressable>
          </View>

          {/* Giriş */}
          <View
            style={{
              backgroundColor: colors.bg,
              borderRadius: tokens.moderateScale(tokens.radii.md),
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: tokens.scale(tokens.spacing.md),
              paddingVertical: tokens.verticalScale(tokens.spacing.sm),
            }}
          >
            <TextInput
              value={mode.value}
              onChangeText={mode.onChange}
              placeholder={mode.placeholder}
              placeholderTextColor={colors.muted}
              style={{
                color: colors.text,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                minHeight: tokens.verticalScale(60),
                maxHeight: tokens.verticalScale(120),
                textAlign: isRTL ? "right" : "left",
              }}
              multiline
              autoFocus
              keyboardAppearance={isDark ? "dark" : "light"}
            />
          </View>

          {/* Düzenle bilgisi */}
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 4 }}>
            <Ionicons name="create-outline" size={13} color={colors.muted} />
            <Text style={{ flex: 1, color: colors.muted, fontSize: tokens.moderateScale(11) }}>
              {t.roomDetail.editHint}
            </Text>
          </View>

          {/* Butonlar */}
          <View style={{ flexDirection: rowDirection, gap: tokens.scale(tokens.spacing.sm) }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: tokens.verticalScale(tokens.spacing.md),
                borderRadius: tokens.moderateScale(tokens.radii.lg),
                backgroundColor: pressed ? colors.surfaceElevated : colors.bg,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <Text style={{ color: colors.text, fontWeight: tokens.typography.fontWeight.semibold }}>
                {t.common.cancel}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!mode.canSave}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: tokens.verticalScale(tokens.spacing.md),
                borderRadius: tokens.moderateScale(tokens.radii.lg),
                backgroundColor: mode.canSave
                  ? pressed
                    ? colors.primaryPressed
                    : colors.primary
                  : colors.bg,
                alignItems: "center",
                flexDirection: rowDirection,
                justifyContent: "center",
                gap: 6,
                borderWidth: mode.canSave ? 0 : 1,
                borderColor: colors.border,
              })}
            >
              <Ionicons name="checkmark" size={16} color={mode.canSave ? "#fff" : colors.muted} />
              <Text
                style={{
                  color: mode.canSave ? "#fff" : colors.muted,
                  fontWeight: tokens.typography.fontWeight.bold,
                }}
              >
                {t.common.save}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};