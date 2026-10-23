import React, { useState, useEffect, useRef } from "react";
import { View, TextInput, Pressable, Text, Platform, Keyboard, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MessageType, RoomMessage } from "../types/messages.types";
import { MediaPickerSheet } from "./ui/MediaPickerSheet";
import { VoiceRecorderSheet } from "./ui/VoiceRecorderSheet";
import { LocationPickerSheet } from "./ui/LocationPickerSheet";
import { useTheme } from "../theme";
import { tokens } from "../theme/tokens";
import { useI18n } from "../i18n";

export type ChatReplyTarget = {
  id: string;
  userName: string;
  body: string;
};

type ChatInputBarProps = {
  replyingTo?: ChatReplyTarget | null;
  onCancelReply?: () => void;
  onSendText: (text: string) => void;
  onSendMedia: (type: MessageType, body: string, localUri?: string, caption?: string) => void;
  onSendLocation: (lat: number, lng: number, label: string) => void;
  onSendVoice: (url: string, durationSec: number) => void;
  onError?: (errorMessage: string) => void;
  isSending?: boolean;
  placeholder?: string;
};

const ChatInputBarComponent: React.FC<ChatInputBarProps> = ({
  replyingTo,
  onCancelReply,
  onSendText,
  onSendMedia,
  onSendLocation,
  onSendVoice,
  isSending,
  placeholder,
}) => {
  const [text, setText] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const lastSendTimeRef = React.useRef(0);
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const attachMenuAnim = useRef(new Animated.Value(0)).current;
  const item1Anim = useRef(new Animated.Value(0)).current;
  const item2Anim = useRef(new Animated.Value(0)).current;
  const item3Anim = useRef(new Animated.Value(0)).current;
  const [isAttachMenuMounted, setIsAttachMenuMounted] = useState(false);

  useEffect(() => {
    if (showAttachMenu) {
      setIsAttachMenuMounted(true);
      item1Anim.setValue(0);
      item2Anim.setValue(0);
      item3Anim.setValue(0);

      Animated.parallel([
        Animated.spring(attachMenuAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 280,
          mass: 0.7,
          useNativeDriver: true,
        }),
        Animated.stagger(45, [
          Animated.spring(item1Anim, {
            toValue: 1,
            damping: 13,
            stiffness: 260,
            mass: 0.6,
            useNativeDriver: true,
          }),
          Animated.spring(item2Anim, {
            toValue: 1,
            damping: 13,
            stiffness: 260,
            mass: 0.6,
            useNativeDriver: true,
          }),
          Animated.spring(item3Anim, {
            toValue: 1,
            damping: 13,
            stiffness: 260,
            mass: 0.6,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(attachMenuAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(item1Anim, {
          toValue: 0,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.timing(item2Anim, {
          toValue: 0,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.timing(item3Anim, {
          toValue: 0,
          duration: 110,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsAttachMenuMounted(false);
        }
      });
    }
  }, [showAttachMenu]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const checkAndTriggerCooldown = (): boolean => {
    const now = Date.now();
    if (now - lastSendTimeRef.current < 3000) {
      return false;
    }
    lastSendTimeRef.current = now;
    setCooldownSeconds(3);
    return true;
  };

  const handleSend = () => {
    if (!text.trim() || isSending || cooldownSeconds > 0) return;
    if (!checkAndTriggerCooldown()) return;
    onSendText(text.trim());
    setText("");
  };

  const handleAttachAction = (type: "image" | "audio" | "location") => {
    setShowAttachMenu(false);
    if (type === "image") {
      setShowMediaPicker(true);
    } else if (type === "location") {
      setShowLocationPicker(true);
    } else if (type === "audio") {
      setShowVoiceRecorder(true);
    }
  };

  return (
    <>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          paddingTop: tokens.verticalScale(tokens.spacing.xs + 2),
          paddingBottom:
            tokens.verticalScale(tokens.spacing.xs + 2) +
            (isKeyboardVisible ? 0 : Math.max(insets.bottom, 0)),
          zIndex: 10,
        }}
      >
        {/* Yanıtlanıyor Barı */}
        {replyingTo && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.primaryTint,
              paddingHorizontal: tokens.scale(tokens.spacing.sm),
              paddingVertical: tokens.verticalScale(4),
              borderRadius: tokens.moderateScale(tokens.radii.sm),
              marginBottom: 6,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.primaryText,
                  fontSize: tokens.moderateScale(11),
                  fontWeight: tokens.typography.fontWeight.bold,
                }}
              >
                {t.chat.replyTo(replyingTo.userName)}
              </Text>
              <Text
                style={{ color: colors.muted, fontSize: tokens.moderateScale(11) }}
                numberOfLines={1}
              >
                {replyingTo.body}
              </Text>
            </View>
            <Pressable onPress={onCancelReply} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          </View>
        )}

        {/* Ek Menüsü (Ultra Akıcı & Kademeli Animasyonlu) */}
        {isAttachMenuMounted && (
          <Animated.View
            style={{
              position: "absolute",
              left: tokens.scale(tokens.spacing.base),
              right: tokens.scale(tokens.spacing.base),
              bottom: "100%",
              marginBottom: tokens.verticalScale(tokens.spacing.sm) + 6,
              flexDirection: "row",
              justifyContent: "space-around",
              alignItems: "center",
              backgroundColor: isDark ? colors.surfaceElevated ?? "#1F2937" : "#FFFFFF",
              borderRadius: tokens.moderateScale(24),
              paddingVertical: tokens.verticalScale(14),
              paddingHorizontal: tokens.scale(tokens.spacing.md),
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.35 : 0.12,
              shadowRadius: 18,
              elevation: 12,
              opacity: attachMenuAnim,
              transform: [
                {
                  translateY: attachMenuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
                {
                  scale: attachMenuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            }}
          >
            {/* 1. Fotoğraf / Galeri */}
            <Animated.View
              style={{
                alignItems: "center",
                opacity: item1Anim,
                transform: [
                  {
                    translateY: item1Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [22, 0],
                    }),
                  },
                  {
                    scale: item1Anim.interpolate({
                      inputRange: [0, 0.7, 1],
                      outputRange: [0.3, 1.12, 1],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  { alignItems: "center", gap: 6 },
                  pressed && { transform: [{ scale: 0.88 }], opacity: 0.85 },
                ]}
                onPress={() => handleAttachAction("image")}
              >
                <View
                  style={{
                    width: tokens.scale(50),
                    height: tokens.scale(50),
                    borderRadius: tokens.scale(25),
                    backgroundColor: "#2563EB",
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#2563EB",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <Ionicons name="images" size={24} color="#FFFFFF" />
                </View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: tokens.moderateScale(12),
                    fontWeight: "600",
                    letterSpacing: 0.2,
                  }}
                >
                  {t.attach.photo}
                </Text>
              </Pressable>
            </Animated.View>

            {/* 2. Ses Kaydı */}
            <Animated.View
              style={{
                alignItems: "center",
                opacity: item2Anim,
                transform: [
                  {
                    translateY: item2Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [22, 0],
                    }),
                  },
                  {
                    scale: item2Anim.interpolate({
                      inputRange: [0, 0.7, 1],
                      outputRange: [0.3, 1.12, 1],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  { alignItems: "center", gap: 6 },
                  pressed && { transform: [{ scale: 0.88 }], opacity: 0.85 },
                ]}
                onPress={() => handleAttachAction("audio")}
              >
                <View
                  style={{
                    width: tokens.scale(50),
                    height: tokens.scale(50),
                    borderRadius: tokens.scale(25),
                    backgroundColor: "#E11D48",
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#E11D48",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <Ionicons name="mic" size={24} color="#FFFFFF" />
                </View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: tokens.moderateScale(12),
                    fontWeight: "600",
                    letterSpacing: 0.2,
                  }}
                >
                  {t.attach.voice}
                </Text>
              </Pressable>
            </Animated.View>

            {/* 3. Canlı Konum */}
            <Animated.View
              style={{
                alignItems: "center",
                opacity: item3Anim,
                transform: [
                  {
                    translateY: item3Anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [22, 0],
                    }),
                  },
                  {
                    scale: item3Anim.interpolate({
                      inputRange: [0, 0.7, 1],
                      outputRange: [0.3, 1.12, 1],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  { alignItems: "center", gap: 6 },
                  pressed && { transform: [{ scale: 0.88 }], opacity: 0.85 },
                ]}
                onPress={() => handleAttachAction("location")}
              >
                <View
                  style={{
                    width: tokens.scale(50),
                    height: tokens.scale(50),
                    borderRadius: tokens.scale(25),
                    backgroundColor: "#10B981",
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#10B981",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <Ionicons name="location" size={24} color="#FFFFFF" />
                </View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: tokens.moderateScale(12),
                    fontWeight: "600",
                    letterSpacing: 0.2,
                  }}
                >
                  {t.attach.location}
                </Text>
              </Pressable>

            </Animated.View>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: -7,
                // + butonunun yatay merkezi: butonun yarısı - ucun yarısı
                left: tokens.scale(20) - 7,
                width: 14,
                height: 14,
                backgroundColor: isDark ? colors.surfaceElevated ?? "#1F2937" : "#FFFFFF",
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                transform: [{ rotate: "45deg" }],
              }}
            />
          </Animated.View>

        )}

        {/* Input ve Gönder Butonu */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: tokens.scale(tokens.spacing.sm),
          }}
        >
          <Pressable
            hitSlop={8}
            onPress={() => setShowAttachMenu((prev) => !prev)}
            style={({ pressed }) => [
              {
                width: tokens.scale(40),
                height: tokens.scale(40),
                borderRadius: tokens.scale(20),
                backgroundColor: showAttachMenu ? colors.primary : colors.bg,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: showAttachMenu ? colors.primary : colors.border,
                shadowColor: showAttachMenu ? colors.primary : "transparent",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: showAttachMenu ? 0.3 : 0,
                shadowRadius: 6,
                elevation: showAttachMenu ? 4 : 0,
              },
              pressed && { transform: [{ scale: 0.9 }], opacity: 0.85 },
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: attachMenuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "135deg"],
                    }),
                  },
                ],
              }}
            >
              <Ionicons
                name="add"
                size={24}
                color={showAttachMenu ? "#FFFFFF" : colors.text}
              />
            </Animated.View>
          </Pressable>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder ?? t.chat.placeholder}
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              backgroundColor: colors.bg,
              borderRadius: tokens.moderateScale(tokens.radii.full),
              paddingHorizontal: tokens.scale(tokens.spacing.md),
              paddingVertical: tokens.verticalScale(Platform.OS === "ios" ? 8 : 10),
              fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
              color: colors.text,
              borderWidth: 1,
              borderColor: colors.border,
              maxHeight: tokens.verticalScale(90),
            }}
            multiline
            keyboardAppearance={isDark ? "dark" : "light"}
          />

          <Pressable
            hitSlop={8}
            onPress={handleSend}
            disabled={!text.trim() || isSending || cooldownSeconds > 0}
            style={({ pressed }) => [
              {
                width: tokens.scale(38),
                height: tokens.scale(38),
                borderRadius: tokens.radii.full,
                backgroundColor: cooldownSeconds > 0 ? colors.surface : text.trim() ? colors.primaryText : colors.bg,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                opacity: cooldownSeconds > 0 ? 0.6 : 1,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            {cooldownSeconds > 0 ? (
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>
                {cooldownSeconds}
              </Text>
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={text.trim() ? colors.bg : colors.muted}
              />
            )}
          </Pressable>
        </View>
      </View>

      {/* Görsel Seçim & Yükleme Bottom Sheet */}
      <MediaPickerSheet
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSend={(url, localUri, caption) => {
          checkAndTriggerCooldown();
          onSendMedia("image", url, localUri, caption);
        }}
      />

      {/* Sesli Mesaj Bottom Sheet */}
      <VoiceRecorderSheet
        visible={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onSend={(url, durationSec) => {
          checkAndTriggerCooldown();
          onSendVoice(url, durationSec);
        }}
      />

      {/* Konum Bottom Sheet */}
      <LocationPickerSheet
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSend={(lat, lng, label) => {
          checkAndTriggerCooldown();
          onSendLocation(lat, lng, label);
        }}
      />
    </>
  );
};

export const ChatInputBar = React.memo(ChatInputBarComponent);

