/**
 * VoiceRecorderSheet - Sesli mesaj kayıt ve gönderim bottom sheet.
 * Modern expo-audio API'sini (SDK 53+) kullanarak ses kaydeder ve Supabase'e yükler.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from "expo-audio";
import { useTheme } from "../../theme";
import { tokens } from "../../theme/tokens";
import { uploadVoiceMessage, MediaUploadTarget } from "../../api/storageApi";
import { useI18n } from "@/i18n";

export type VoiceRecorderSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** url: oda için public URL, DM için private dosya yolu; durationSec: saniye */
  onSend: (url: string, durationSec: number) => void;
  /** Varsayılan: oda (public). DM için private bucket'a yüklenir. */
  uploadTarget?: MediaUploadTarget;
};

type Phase =
  | { type: "idle" }
  | { type: "recording"; startedAt: number }
  | { type: "preview"; uri: string; durationSec: number }
  | { type: "uploading"; uri: string; durationSec: number }
  | { type: "error"; message: string };

function formatDuration(sec: number) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export const VoiceRecorderSheet: React.FC<VoiceRecorderSheetProps> = ({
  visible,
  onClose,
  onSend,
  uploadTarget,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>({ type: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modern expo-audio hook'ları
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase({ type: "idle" });
    setElapsed(0);
  }, []);

  const handleClose = useCallback(async () => {
    if (recorderState.isRecording) {
      try {
        await audioRecorder.stop();
      } catch { }
    }
    reset();
    onClose();
  }, [recorderState.isRecording, audioRecorder, reset, onClose]);

  // Modal kapandığında sıfırla
  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  // Kayıt başlat
  const startRecording = useCallback(async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setPhase({ type: "error", message: t.voice.micDenied });
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      const now = Date.now();
      setPhase({ type: "recording", startedAt: now });
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - now) / 1000));
      }, 500);
    } catch {
      setPhase({ type: "error", message: t.voice.startFailed });
    }
  }, [audioRecorder, t]);

  // Kayıt durdur
  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error(t.voice.fileNotCreated);
      const durationSec = elapsed || 1;
      setPhase({ type: "preview", uri, durationSec });
    } catch (err: any) {
      setPhase({
        type: "error",
        message: err?.message || t.voice.stopFailed,
      });
    }
  }, [audioRecorder, elapsed, t]);

  // Supabase Storage'a Yükle ve Gönder
  const handleSend = useCallback(async () => {
    if (phase.type !== "preview") return;
    const { uri, durationSec } = phase;
    setPhase({ type: "uploading", uri, durationSec });

    try {
      // expo-file-system modern File API veya legacy fallback
      let base64 = "";
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { File } = require("expo-file-system");
        const file = new File(uri);
        if (!file.exists) throw new Error(t.voice.fileNotFound);
        base64 = await file.base64();
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const FileSystem = require("expo-file-system/legacy");
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) throw new Error(t.voice.fileNotFound);
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const mediaUrl = await uploadVoiceMessage(base64, uploadTarget);

      onSend(mediaUrl, durationSec);
      reset();
      onClose();
    } catch {
      setPhase({ type: "error", message: t.voice.uploadFailed });
    }
  }, [phase, onSend, reset, onClose, t, uploadTarget]);

  const isRecording = phase.type === "recording" || recorderState.isRecording;
  const isPreview = phase.type === "preview";
  const isUploading = phase.type === "uploading";
  const isError = phase.type === "error";

  const statusText = isRecording
    ? t.voice.recordingHint
    : isPreview
      ? t.voice.previewHint
      : isUploading
        ? t.voice.uploading
        : isError
          ? phase.message
          : t.voice.idleHint;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]}
        onPress={isUploading ? undefined : handleClose}
      />

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopLeftRadius: tokens.moderateScale(24),
          borderTopRightRadius: tokens.moderateScale(24),
          minHeight: tokens.verticalScale(280),
          paddingBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 28 : 20) + tokens.verticalScale(12),
          paddingTop: tokens.verticalScale(tokens.spacing.md),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.4 : 0.12,
          shadowRadius: 16,
          elevation: 20,
          paddingHorizontal: tokens.scale(tokens.spacing.xxl),
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
            marginBottom: tokens.verticalScale(tokens.spacing.sm),
          }}
        />

        <Text
          style={{
            color: colors.text,
            fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
            fontWeight: tokens.typography.fontWeight.bold,
            textAlign: "center",
          }}
        >
          {t.voice.title}
        </Text>

        {/* Süre */}
        <Text
          style={{
            color: isRecording ? colors.danger : colors.muted,
            fontSize: tokens.moderateScale(36),
            fontWeight: tokens.typography.fontWeight.bold,
            textAlign: "center",
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatDuration(
            phase.type === "preview" || phase.type === "uploading"
              ? phase.durationSec
              : elapsed
          )}
        </Text>

        {/* Durum metni */}
        <Text
          style={{
            color: colors.muted,
            fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
            textAlign: "center",
          }}
        >
          {statusText}
        </Text>

        {/* Butonlar */}
        {isUploading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : isError ? (
          <View style={{ flexDirection: "row", gap: tokens.scale(tokens.spacing.sm) }}>
            <Pressable
              onPress={reset}
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
              <Text
                style={{
                  color: colors.text,
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
              >
                {t.voice.retry}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: tokens.verticalScale(tokens.spacing.md),
                borderRadius: tokens.moderateScale(tokens.radii.lg),
                backgroundColor: colors.dangerSurface,
                alignItems: "center",
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text
                style={{
                  color: colors.danger,
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
              >
                {t.voice.close}
              </Text>
            </Pressable>
          </View>
        ) : isPreview ? (
          <View style={{ flexDirection: "row", gap: tokens.scale(tokens.spacing.sm) }}>
            <Pressable
              onPress={reset}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: tokens.verticalScale(tokens.spacing.md),
                borderRadius: tokens.moderateScale(tokens.radii.lg),
                backgroundColor: pressed
                  ? colors.surfaceElevated
                  : colors.dangerSurface,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
                borderWidth: 1,
                borderColor: colors.danger,
              })}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text
                style={{
                  color: colors.danger,
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
              >
                {t.voice.delete}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSend}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: tokens.verticalScale(tokens.spacing.md),
                borderRadius: tokens.moderateScale(tokens.radii.lg),
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              })}
            >
              <Ionicons name="send" size={16} color="#fff" />
              <Text
                style={{
                  color: "#fff",
                  fontWeight: tokens.typography.fontWeight.bold,
                }}
              >
                {t.voice.send}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ alignItems: "center" }}>
            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              style={({ pressed }) => ({
                width: tokens.scale(72),
                height: tokens.scale(72),
                borderRadius: tokens.radii.full,
                backgroundColor: isRecording
                  ? pressed
                    ? "#cc0000"
                    : colors.danger
                  : pressed
                    ? colors.primaryPressed
                    : colors.primary,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: isRecording ? colors.danger : colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 6,
              })}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={32}
                color="#fff"
              />
            </Pressable>
            <Text
              style={{
                color: colors.muted,
                fontSize: tokens.moderateScale(11),
                marginTop: 8,
              }}
            >
              {isRecording ? t.voice.tapStop : t.voice.tapStart}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};