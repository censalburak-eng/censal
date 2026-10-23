/**
 * LocationPickerSheet - Gercek GPS konumu paylaşımı için bottom sheet.
 * expo-location kullanır. Harita linki (maps.google.com) üretir.
 */

import React, { useState, useCallback } from "react";
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
import { useTheme } from "../../theme";
import { tokens } from "../../theme/tokens";
import { useI18n } from "@/i18n";

let Location: any = null;
try {
  Location = require("expo-location");
} catch {
  console.warn("[LocationPickerSheet] expo-location yuklu degil");
}

export type LocationPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** lat/lng koordinatları ve okunabilir adres döner */
  onSend: (lat: number, lng: number, label: string) => void;
};

type Phase =
  | { type: "idle" }
  | { type: "locating" }
  | { type: "preview"; lat: number; lng: number; label: string }
  | { type: "error"; message: string };

export const LocationPickerSheet: React.FC<LocationPickerSheetProps> = ({
  visible,
  onClose,
  onSend,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>({ type: "idle" });

  const reset = useCallback(() => setPhase({ type: "idle" }), []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const getLocation = useCallback(async () => {
    if (!Location) {
      setPhase({ type: "error", message: t.location.unavailable });
      return;
    }
    setPhase({ type: "locating" });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPhase({ type: "error", message: t.location.permissionDenied });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = loc.coords;

      // Ters geocoding
      let label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const [addr] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (addr) {
          const parts = [addr.street, addr.district, addr.city].filter(Boolean).join(", ");
          if (parts) label = parts;
        }
      } catch { }

      setPhase({ type: "preview", lat, lng, label });
    } catch {
      setPhase({ type: "error", message: t.location.failed });
    }
  }, [t]);

  const handleSend = useCallback(() => {
    if (phase.type !== "preview") return;
    onSend(phase.lat, phase.lng, phase.label);
    reset();
    onClose();
  }, [phase, onSend, reset, onClose]);

  const isLocating = phase.type === "locating";
  const isPreview = phase.type === "preview";
  const isError = phase.type === "error";

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
        onPress={isLocating ? undefined : handleClose}
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
          paddingBottom: (Platform.OS === "ios" ? 28 : 20) + insets.bottom,
          paddingTop: tokens.verticalScale(tokens.spacing.sm),
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
            width: 40, height: 4, borderRadius: 2,
            backgroundColor: colors.border, alignSelf: "center",
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
          {t.location.title}
        </Text>

        {/* İkon */}
        <View style={{ alignItems: "center", paddingVertical: tokens.verticalScale(8) }}>
          <View
            style={{
              width: tokens.scale(72),
              height: tokens.scale(72),
              borderRadius: tokens.radii.full,
              backgroundColor: isPreview ? colors.primaryTint : colors.bg,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 2,
              borderColor: isPreview ? colors.primaryText : colors.border,
            }}
          >
            {isLocating ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <Ionicons
                name="location"
                size={36}
                color={isPreview ? colors.primaryText : colors.muted}
              />
            )}
          </View>
        </View>

        {/* Konum etiketi */}
        {isPreview && (
          <View
            style={{
              backgroundColor: colors.bg,
              borderRadius: tokens.moderateScale(tokens.radii.md),
              padding: tokens.scale(tokens.spacing.md),
              borderWidth: 1,
              borderColor: colors.border,
              gap: 4,
            }}
          >
            <Text style={{ color: colors.primaryText, fontSize: tokens.moderateScale(12), fontWeight: tokens.typography.fontWeight.bold }}>
              {t.location.currentLabel}
            </Text>
            <Text style={{ color: colors.text, fontSize: tokens.moderateScale(13) }}>
              {phase.label}
            </Text>
            <Text style={{ color: colors.muted, fontSize: tokens.moderateScale(11) }}>
              {phase.lat.toFixed(5)}, {phase.lng.toFixed(5)}
            </Text>
          </View>
        )}

        {isError && (
          <Text style={{ color: colors.danger, textAlign: "center", fontSize: tokens.moderateScale(13) }}>
            {phase.message}
          </Text>
        )}

        {/* Durum */}
        {!isPreview && !isError && (
          <Text style={{ color: colors.muted, textAlign: "center", fontSize: tokens.moderateScale(13) }}>
            {isLocating ? t.location.locating : t.location.idleHint}
          </Text>
        )}

        {/* Butonlar */}
        {isLocating ? (
          <View style={{ height: tokens.verticalScale(48) }} />
        ) : isPreview ? (
          <View style={{ flexDirection: "row", gap: tokens.scale(tokens.spacing.sm) }}>
            <Pressable
              onPress={getLocation}
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
                {t.location.refresh}
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
              <Text style={{ color: "#fff", fontWeight: tokens.typography.fontWeight.bold }}>
                {t.location.share}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={getLocation}
            style={({ pressed }) => ({
              paddingVertical: tokens.verticalScale(tokens.spacing.md),
              borderRadius: tokens.moderateScale(tokens.radii.lg),
              backgroundColor: pressed ? colors.primaryPressed : colors.primary,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            })}
          >
            <Ionicons name="location-outline" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.moderateScale(tokens.typography.fontSize.base) }}>
              {t.location.getButton}
            </Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
};