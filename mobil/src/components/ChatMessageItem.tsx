import React, { useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  Animated,
  PanResponder,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { RoomMessage } from "../types/messages.types";
import { useTheme } from "../theme";
import { tokens } from "../theme/tokens";
import { useI18n } from "../i18n";
import { ImageViewerModal } from "./ui/ImageViewerModal";
import { getUserColor } from "../utils/userColors";

type ChatMessageItemProps = {
  message: RoomMessage;
  isCurrentUser: boolean;
  onReply?: (message: RoomMessage) => void;
  onPin?: (message: RoomMessage) => void;
  onReport?: (message: RoomMessage) => void;
  onDirectMessage?: (message: RoomMessage) => void;
  onBlockUser?: (message: RoomMessage) => void;
  onOptionsPress?: (message: RoomMessage) => void;
};

function formatDuration(sec: number | null | undefined) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

const SPEEDS = [1.0, 1.5, 2.0];

function generateWaveformBars(seed: string, count = 26): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const sinFactor = Math.sin((i / count) * Math.PI);
    const pseudoRandom = Math.abs((Math.sin(hash + i * 17.13) * 10000) % 1);
    const height = Math.max(
      5,
      Math.min(22, Math.round(sinFactor * 14 + pseudoRandom * 9 + 4))
    );
    bars.push(height);
  }
  return bars;
}

/**
 * WhatsApp / Telegram tarzı estetik sesli mesaj oynatıcı (Waveform + Playhead + Hız seçici)
 */
const AudioPlayerBubbleComponent: React.FC<{
  mediaPath: string;
  durationSec?: number | null;
  isCurrentUser: boolean;
}> = ({ mediaPath, durationSec, isCurrentUser }) => {
  const { colors, isDark } = useTheme();
  const [isActivated, setIsActivated] = useState(false);
  const player = useAudioPlayer(isActivated ? mediaPath : null);
  const status = useAudioPlayerStatus(player);
  const [speedIndex, setSpeedIndex] = useState(0);

  // Ses dalgası çubukları
  const waveformBars = useMemo(
    () => generateWaveformBars(mediaPath, 26),
    [mediaPath]
  );

  const togglePlay = () => {
    try {
      if (!isActivated) {
        setIsActivated(true);
        setTimeout(() => {
          try {
            player.play();
          } catch {}
        }, 120);
        return;
      }

      if (status.playing) {
        player.pause();
      } else {
        if (status.duration && status.currentTime >= status.duration) {
          player.seekTo(0);
        }
        player.play();
      }
    } catch (e) {
      console.warn("[AudioPlayerBubble] Oynatma hatası:", e);
    }
  };

  const handleToggleSpeed = () => {
    const nextIndex = (speedIndex + 1) % SPEEDS.length;
    const nextSpeed = SPEEDS[nextIndex];
    setSpeedIndex(nextIndex);
    try {
      if (typeof (player as any).setPlaybackRate === "function") {
        (player as any).setPlaybackRate(nextSpeed);
      } else {
        (player as any).playbackRate = nextSpeed;
      }
    } catch (e) {
      console.warn("[AudioPlayerBubble] Hız değiştirilemedi:", e);
    }
  };

  const handleSeek = (index: number) => {
    if (!status.duration && !durationSec) return;
    const totalDuration = status.duration || durationSec || 1;
    const targetSeconds = (index / waveformBars.length) * totalDuration;
    try {
      player.seekTo(targetSeconds);
    } catch (e) {
      console.warn("[AudioPlayerBubble] Seek hatası:", e);
    }
  };

  const totalDuration = status.duration || durationSec || 0;
  const progress =
    totalDuration > 0
      ? Math.min(status.currentTime / totalDuration, 1)
      : 0;

  const currentSec = Math.floor(status.currentTime || 0);
  const displayTime = status.playing
    ? currentSec
    : durationSec || Math.floor(totalDuration);

  // Renk Paleti (WhatsApp & Telegram referanslı)
  const playButtonBg = isCurrentUser
    ? "rgba(255, 255, 255, 0.24)"
    : isDark
      ? "#00A884"
      : colors.primary;

  const playIconColor = "#FFFFFF";

  const activeWaveColor = isCurrentUser
    ? "#FFFFFF"
    : isDark
      ? "#25D366"
      : colors.primary;

  const inactiveWaveColor = isCurrentUser
    ? "rgba(255, 255, 255, 0.38)"
    : isDark
      ? "rgba(148, 163, 184, 0.38)"
      : "rgba(100, 116, 139, 0.3)";

  return (
    <View
      style={{
        width: 220,
        paddingVertical: 5,
        paddingHorizontal: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {/* Sol: Büyük Yuvarlak Oynat/Durdur Butonu + Mikrofon İkon Rozeti */}
        <Pressable
          onPress={togglePlay}
          style={({ pressed }) => [
            {
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: playButtonBg,
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
            },
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
        >
          <Ionicons
            name={status.playing ? "pause" : "play"}
            size={22}
            color={playIconColor}
            style={{ marginLeft: status.playing ? 0 : 2 }}
          />

          {/* Sağ altta mini mikrofon rozeti */}
          <View
            style={{
              position: "absolute",
              right: -1,
              bottom: -1,
              width: 17,
              height: 17,
              borderRadius: 8.5,
              backgroundColor: isCurrentUser
                ? "#005C4B"
                : isDark
                  ? "#182229"
                  : "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: isCurrentUser ? "#FFFFFF50" : colors.border,
            }}
          >
            <Ionicons
              name="mic"
              size={9.5}
              color={isCurrentUser ? "#A7F3D0" : colors.primaryText}
            />
          </View>
        </Pressable>

        {/* Sağ: Ses Dalgaları (Waveform) ve İlerleme */}
        <View style={{ flex: 1, gap: 5 }}>
          {/* Tıklanabilir Dalga Çubukları */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              height: 24,
              justifyContent: "space-between",
            }}
          >
            {waveformBars.map((height, i) => {
              const barThreshold = (i + 1) / waveformBars.length;
              const isPlayed = progress >= barThreshold;
              return (
                <Pressable
                  key={i}
                  onPress={() => handleSeek(i)}
                  hitSlop={3}
                  style={{
                    paddingVertical: 2,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 2.5,
                      height,
                      borderRadius: 1.5,
                      backgroundColor: isPlayed
                        ? activeWaveColor
                        : inactiveWaveColor,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Süre & Hız Seçici Alt Satırı */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: isCurrentUser
                  ? "rgba(255, 255, 255, 0.85)"
                  : colors.muted,
                fontSize: tokens.moderateScale(11),
                fontWeight: "500",
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatDuration(displayTime)}
            </Text>

            {/* Hız Değiştirme Butonu (1x / 1.5x / 2x) */}
            <Pressable
              onPress={handleToggleSpeed}
              hitSlop={6}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 10,
                  backgroundColor: isCurrentUser
                    ? "rgba(255, 255, 255, 0.22)"
                    : isDark
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(0, 0, 0, 0.06)",
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={{
                  color: isCurrentUser ? "#FFFFFF" : colors.text,
                  fontSize: tokens.moderateScale(10),
                  fontWeight: "700",
                }}
              >
                {SPEEDS[speedIndex]}x
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

const AudioPlayerBubble = React.memo(AudioPlayerBubbleComponent);

const ChatMessageItemComponent: React.FC<ChatMessageItemProps> = ({
  message,
  isCurrentUser,
  onReply,
  onDirectMessage,
  onOptionsPress,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);

  const userColor = useMemo(
    () => getUserColor(message.userId || message.userName, isDark),
    [message.userId, message.userName, isDark]
  );

  // ─── WhatsApp Sağa Kaydırınca Alıntılama (Swipe to Reply) ───
  const panX = useRef(new Animated.Value(0)).current;
  const replyTriggeredRef = useRef(false);

  // Her zaman güncel değerleri tut (stale closure çözümü)
  const messageRef = useRef(message);
  const onReplyRef = useRef(onReply);
  messageRef.current = message;
  onReplyRef.current = onReply;

  const resetPan = () => {
    Animated.spring(panX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 7,
      speed: 16,
    }).start();
    replyTriggeredRef.current = false;
  };

  const panResponder = useRef(
    PanResponder.create({
      // Capture: Pressable'dan önce biz karar veriyoruz
      onMoveShouldSetPanResponderCapture: (_, g) =>
        g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        if (g.dx <= 0) return;
        panX.setValue(Math.min(g.dx * 0.55, 65));
        if (g.dx > 40 && !replyTriggeredRef.current) {
          replyTriggeredRef.current = true;
          onReplyRef.current?.(messageRef.current);
        }
      },
      onPanResponderRelease: resetPan,
      onPanResponderTerminate: resetPan,
    })
  ).current;

  const handleLongPress = () => {
    onOptionsPress?.(message);
  };

  let formattedTime = "--:--";
  try {
    if (message.createdAt) {
      const cleanStr =
        typeof message.createdAt === "string" && message.createdAt.includes(" ") && !message.createdAt.includes("T")
          ? message.createdAt.replace(" ", "T")
          : message.createdAt;
      const d = new Date(cleanStr);
      if (!isNaN(d.getTime())) {
        const hours = d.getHours().toString().padStart(2, "0");
        const minutes = d.getMinutes().toString().padStart(2, "0");
        formattedTime = `${hours}:${minutes}`;
      }
    }
  } catch {}

  const metaColor = isCurrentUser ? "rgba(255, 255, 255, 0.65)" : colors.muted;
  const isMedia =
    message.type === "location" || message.type === "audio" || message.type === "image";

  const bubbleBg = isCurrentUser
    ? isDark
      ? "#005C4B"
      : colors.primary
    : isDark
      ? "#202C33"
      : colors.surface;
  const bubbleBorder = isCurrentUser
    ? isDark
      ? "#005C4B"
      : colors.primary
    : colors.border;

  // ─── Konum harita linki ────────────────────────────────────
  const handleOpenLocation = () => {
    if (!message.lat || !message.lng) return;
    const url = `https://maps.google.com/?q=${message.lat},${message.lng}`;
    Linking.openURL(url).catch(() => { });
  };

  // ─── Meta (saat + ikonlar) ─────────────────────────────────
  const meta = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-end",
        gap: 3,
        marginBottom: 1,
      }}
    >
      {message.isPinned && (
        <Ionicons
          name="pin"
          size={11}
          color={isCurrentUser ? "#FFFFFF" : colors.primaryText}
        />
      )}
      {message.isEdited && (
        <Text style={{ color: metaColor, fontSize: tokens.moderateScale(9) }}>
          {t.messageItem.edited}
        </Text>
      )}
      <Text style={{ color: metaColor, fontSize: tokens.moderateScale(10) }}>
        {formattedTime}
      </Text>
    </View>
  );

  return (
    <View style={{ marginVertical: tokens.verticalScale(2.5), width: "100%" }}>
      {/* Kaydırma Sırasında Arkadan Beliren WhatsApp Reply İkonu */}
      <Animated.View
        style={{
          position: "absolute",
          left: tokens.scale(16),
          top: "50%",
          marginTop: -16,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isDark ? "#2A3942" : "#E2E8F0",
          justifyContent: "center",
          alignItems: "center",
          opacity: panX.interpolate({
            inputRange: [0, 18, 40],
            outputRange: [0, 0.4, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              scale: panX.interpolate({
                inputRange: [0, 20, 40],
                outputRange: [0.6, 0.85, 1],
                extrapolate: "clamp",
              }),
            },
          ],
        }}
      >
        <Ionicons
          name="arrow-undo"
          size={18}
          color={isDark ? "#25D366" : colors.primaryText}
        />
      </Animated.View>

      {/* Avatar Büyütme Modalı */}
      {message.userAvatarUrl ? (
        <ImageViewerModal
          visible={isAvatarModalVisible}
          imageUrl={message.userAvatarUrl}
          title={message.userName}
          onClose={() => setIsAvatarModalVisible(false)}
        />
      ) : null}

      {/* Mesaj Balonu ve Kaydırma Alanı */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX: panX }],
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          flexDirection: "row",
          justifyContent: isCurrentUser ? "flex-end" : "flex-start",
          alignItems: "flex-end",
          gap: tokens.scale(8),
        }}
      >
        {/* WhatsApp Tarzı Kullanıcı Profil Resmi (Avatar) - Sadece gelen mesajlarda */}
        {!isCurrentUser && (
          <Pressable
            onPress={() => {
              if (message.userAvatarUrl) {
                setIsAvatarModalVisible(true);
              } else if (onDirectMessage) {
                onDirectMessage(message);
              }
            }}
            hitSlop={4}
            style={{
              width: tokens.scale(32),
              height: tokens.scale(32),
              borderRadius: tokens.scale(16),
              overflow: "hidden",
              marginBottom: tokens.verticalScale(2),
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            }}
            accessibilityRole="button"
            accessibilityLabel={`${message.userName} avatar`}
          >
            {message.userAvatarUrl ? (
              <Image
                source={{ uri: message.userAvatarUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: userColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: tokens.moderateScale(12),
                    fontWeight: "700",
                  }}
                >
                  {(message.userName || "H")[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>
        )}

        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={300}
          style={({ pressed }) => [
            {
              maxWidth: isCurrentUser ? "82%" : "76%",
              borderRadius: tokens.moderateScale(14),
              borderBottomEndRadius: isCurrentUser ? 2 : tokens.moderateScale(14),
              borderBottomStartRadius: !isCurrentUser ? 2 : tokens.moderateScale(14),
              backgroundColor: bubbleBg,
              paddingHorizontal: tokens.scale(10),
              paddingTop: tokens.verticalScale(6),
              paddingBottom: tokens.verticalScale(5),
              borderWidth: isCurrentUser ? 0 : 1,
              borderColor: bubbleBorder,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.12,
              shadowRadius: 1.5,
              elevation: 1,
            },
            pressed && { opacity: 0.95 },
          ]}
        >
          {/* Gönderen İsim (kendi mesajı değilse) */}
          {!isCurrentUser && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                marginBottom: 2,
              }}
            >
              <Text
                style={{
                  color: getUserColor(message.userId || message.userName, isDark),
                  fontSize: tokens.moderateScale(12),
                  fontWeight: tokens.typography.fontWeight.bold,
                }}
              >
                {message.userName}
              </Text>
              {message.isUserPhoneHidden && (
                <Ionicons name="lock-closed" size={10} color={colors.muted} />
              )}
            </View>
          )}

          {/* ── WhatsApp Tarzı Alıntılanan Mesaj (Quote Reply) ── */}
          {message.replyToMessage && (
            <View
              style={{
                backgroundColor: isCurrentUser
                  ? isDark
                    ? "rgba(0, 0, 0, 0.28)"
                    : "rgba(255, 255, 255, 0.22)"
                  : isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.05)",
                borderLeftWidth: 4,
                borderLeftColor: isCurrentUser
                  ? "#34D399"
                  : getUserColor(message.replyToMessage.userName, isDark),
                borderRadius: tokens.moderateScale(6),
                paddingVertical: tokens.verticalScale(4),
                paddingHorizontal: tokens.scale(8),
                marginBottom: tokens.verticalScale(4),
              }}
            >
              <Text
                style={{
                  color: isCurrentUser
                    ? "#86EFAC"
                    : getUserColor(message.replyToMessage.userName, isDark),
                  fontSize: tokens.moderateScale(11),
                  fontWeight: "700",
                  marginBottom: 1,
                }}
              >
                {message.replyToMessage.userName}
              </Text>
              <Text
                style={{
                  color: isCurrentUser ? "rgba(255, 255, 255, 0.9)" : colors.text,
                  fontSize: tokens.moderateScale(11.5),
                  lineHeight: 16,
                }}
                numberOfLines={2}
              >
                {message.replyToMessage.body}
              </Text>
            </View>
          )}

          {/* ── Mesaj İçeriği ── */}

          {/* 1. IMAGE */}
          {message.type === "image" && (() => {
            const imgSrc = message.mediaPath ?? message.body;
            return (
              <View>
                <ImageViewerModal
                  visible={isImageModalVisible}
                  imageUrl={imgSrc}
                  title={message.userName}
                  caption={message.caption}
                  onClose={() => setIsImageModalVisible(false)}
                />
                <Pressable
                  onPress={() => setIsImageModalVisible(true)}
                  onLongPress={handleLongPress}
                  delayLongPress={300}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={message.caption ?? t.profile.photoPreview}
                  style={({ pressed }) => [
                    {
                      width: 220,
                      height: 220,
                      borderRadius: tokens.moderateScale(tokens.radii.md),
                      overflow: "hidden",
                      marginVertical: 2,
                      backgroundColor: isDark ? "#182229" : "#E2E8F0",
                      position: 'relative',
                    },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Image
                    source={{ uri: imgSrc }}
                    style={{
                      width: 220,
                      height: 220,
                    }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                  {/* Minik büyütme ikonu rozeti */}
                  <View
                    style={{
                      position: 'absolute',
                      right: 6,
                      bottom: 6,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderRadius: tokens.radii.full,
                      width: 24,
                      height: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="expand" size={13} color="#FFFFFF" />
                  </View>
                </Pressable>
                {/* Caption */}
                {!!message.caption && (
                  <Text
                    style={{
                      color: isCurrentUser ? "#FFFFFF" : colors.text,
                      fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                      marginTop: 4,
                      lineHeight: 20,
                    }}
                  >
                    {message.caption}
                  </Text>
                )}
              </View>
            );
          })()}

          {/* 2. LOCATION (WhatsApp Tarzı Harita Kartı) */}
          {message.type === "location" && (() => {
            const staticMapUri =
              message.lat && message.lng
                ? `https://staticmap.openstreetmap.de/staticmap.php?center=${message.lat},${message.lng}&zoom=15&size=280x130&maptype=mapnik`
                : null;

            return (
              <Pressable
                onPress={handleOpenLocation}
                style={{
                  width: 230,
                  borderRadius: tokens.moderateScale(10),
                  overflow: "hidden",
                  backgroundColor: isCurrentUser
                    ? isDark
                      ? "rgba(0, 0, 0, 0.22)"
                      : "rgba(255, 255, 255, 0.15)"
                    : isDark
                      ? "#182229"
                      : "#F8FAFC",
                  borderWidth: 1,
                  borderColor: isCurrentUser
                    ? "rgba(255, 255, 255, 0.15)"
                    : colors.border,
                  marginVertical: 2,
                }}
              >
                {/* Harita Önizleme Alanı */}
                <View
                  style={{
                    height: 110,
                    width: "100%",
                    backgroundColor: isDark ? "#1E293B" : "#E2E8F0",
                    position: "relative",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {staticMapUri ? (
                    <Image
                      source={{ uri: staticMapUri }}
                      style={[StyleSheet.absoluteFill, { opacity: 0.92 }]}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : null}

                  {/* Merkez Konum Pin İkonu */}
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: "#EF4444",
                      justifyContent: "center",
                      alignItems: "center",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.4,
                      shadowRadius: 3,
                      elevation: 5,
                      borderWidth: 2,
                      borderColor: "#FFFFFF",
                    }}
                  >
                    <Ionicons name="location-sharp" size={22} color="#FFFFFF" />
                  </View>
                </View>

                {/* Alt Açıklama ve Buton */}
                <View style={{ padding: tokens.scale(8), gap: 2 }}>
                  <Text
                    style={{
                      color: isCurrentUser ? "#FFFFFF" : colors.text,
                      fontSize: tokens.moderateScale(12.5),
                      fontWeight: tokens.typography.fontWeight.bold,
                    }}
                    numberOfLines={1}
                  >
                    {message.body || t.messageItem.sharedLocation}
                  </Text>
                  {message.lat != null && message.lng != null && (
                    <Text
                      style={{
                        color: isCurrentUser
                          ? "rgba(255, 255, 255, 0.75)"
                          : colors.muted,
                        fontSize: tokens.moderateScale(10.5),
                      }}
                    >
                      {Number(message.lat).toFixed(4)}, {Number(message.lng).toFixed(4)}
                    </Text>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                      paddingTop: 4,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: isCurrentUser
                        ? "rgba(255, 255, 255, 0.2)"
                        : colors.border,
                    }}
                  >
                    <Ionicons
                      name="map-outline"
                      size={13}
                      color={isCurrentUser ? "#93C5FD" : colors.primaryText}
                    />
                    <Text
                      style={{
                        color: isCurrentUser ? "#93C5FD" : colors.primaryText,
                        fontSize: tokens.moderateScale(11),
                        fontWeight: "600",
                      }}
                    >
                      {t.messageItem.openInMap}
                    </Text>
                    <Ionicons
                      name="open-outline"
                      size={11}
                      color={isCurrentUser ? "#93C5FD" : colors.primaryText}
                      style={{ marginLeft: "auto" }}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })()}

          {/* 3. AUDIO (expo-audio) */}
          {message.type === "audio" && (
            message.mediaPath ? (
              <AudioPlayerBubble
                mediaPath={message.mediaPath}
                durationSec={message.durationSec}
                isCurrentUser={isCurrentUser}
              />
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 8,
                  minWidth: 140,
                }}
              >
                <ActivityIndicator
                  size="small"
                  color={isCurrentUser ? "#FFFFFF" : colors.primary}
                />
                <Text
                  style={{
                    color: isCurrentUser ? "#FFFFFF" : colors.muted,
                    fontSize: tokens.moderateScale(11),
                  }}
                >
                  {t.messageItem.audioLoading}
                </Text>
              </View>
            )
          )}

          {/* 4. TEXT */}
          {message.type === "text" && (() => {
            const isShortSingleLine = !message.body.includes("\n") && message.body.length < 28;
            return isShortSingleLine ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <Text
                  style={{
                    color: isCurrentUser ? "#FFFFFF" : colors.text,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                    lineHeight: 21,
                    flexShrink: 1,
                  }}
                >
                  {message.body}
                </Text>
                {meta}
              </View>
            ) : (
              <View style={{ gap: 2 }}>
                <Text
                  style={{
                    color: isCurrentUser ? "#FFFFFF" : colors.text,
                    fontSize: tokens.moderateScale(tokens.typography.fontSize.base),
                    lineHeight: 21,
                  }}
                >
                  {message.body}
                </Text>
                <View style={{ alignSelf: "flex-end" }}>{meta}</View>
              </View>
            );
          })()}

          {/* Konum / ses / görsel mesajlarında saat altta sağda */}
          {isMedia && <View style={{ alignSelf: "flex-end" }}>{meta}</View>}
        </Pressable>
      </Animated.View>
    </View>
  );
};

export const ChatMessageItem = React.memo(
  ChatMessageItemComponent,
  (prev, next) =>
    prev.message.id === next.message.id &&
    prev.message.userName === next.message.userName &&
    prev.message.userAvatarUrl === next.message.userAvatarUrl &&
    prev.message.body === next.message.body &&
    prev.message.caption === next.message.caption &&
    prev.message.mediaPath === next.message.mediaPath &&
    prev.message.isEdited === next.message.isEdited &&
    prev.message.replyToId === next.message.replyToId &&
    prev.message.replyToMessage?.userName === next.message.replyToMessage?.userName &&
    prev.message.replyToMessage?.body === next.message.replyToMessage?.body &&
    prev.message.isUserPhoneHidden === next.message.isUserPhoneHidden &&
    prev.isCurrentUser === next.isCurrentUser
);
