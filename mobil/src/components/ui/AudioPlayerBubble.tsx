import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTheme } from '../../theme';
import { tokens } from '../../theme/tokens';

const SPEEDS = [1.0, 1.5, 2.0];

function formatDuration(sec: number | null | undefined): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

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

export type AudioPlayerBubbleProps = {
  mediaPath: string;
  durationSec?: number | null;
  isCurrentUser: boolean;
};

const AudioPlayerBubbleComponent: React.FC<AudioPlayerBubbleProps> = ({
  mediaPath,
  durationSec,
  isCurrentUser,
}) => {
  const { colors, isDark } = useTheme();
  const [isActivated, setIsActivated] = useState(false);
  const player = useAudioPlayer(isActivated ? mediaPath : null);
  const status = useAudioPlayerStatus(player);
  const [speedIndex, setSpeedIndex] = useState(0);

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
      console.warn('[AudioPlayerBubble] Oynatma hatası:', e);
    }
  };

  const handleToggleSpeed = () => {
    const nextIndex = (speedIndex + 1) % SPEEDS.length;
    const nextSpeed = SPEEDS[nextIndex];
    setSpeedIndex(nextIndex);
    try {
      if (typeof (player as any).setPlaybackRate === 'function') {
        (player as any).setPlaybackRate(nextSpeed);
      } else {
        (player as any).playbackRate = nextSpeed;
      }
    } catch (e) {
      console.warn('[AudioPlayerBubble] Hız değiştirilemedi:', e);
    }
  };

  const handleSeek = (index: number) => {
    if (!status.duration && !durationSec) return;
    const totalDuration = status.duration || durationSec || 1;
    const targetSeconds = (index / waveformBars.length) * totalDuration;
    try {
      player.seekTo(targetSeconds);
    } catch (e) {
      console.warn('[AudioPlayerBubble] Seek hatası:', e);
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

  const playButtonBg = isCurrentUser
    ? 'rgba(255, 255, 255, 0.24)'
    : isDark
      ? '#00A884'
      : colors.primary;

  const playIconColor = '#FFFFFF';

  const activeWaveColor = isCurrentUser
    ? '#FFFFFF'
    : isDark
      ? '#25D366'
      : colors.primary;

  const inactiveWaveColor = isCurrentUser
    ? 'rgba(255, 255, 255, 0.38)'
    : isDark
      ? 'rgba(148, 163, 184, 0.38)'
      : 'rgba(100, 116, 139, 0.3)';

  return (
    <View
      style={{
        width: 220,
        paddingVertical: 5,
        paddingHorizontal: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={togglePlay}
          style={({ pressed }) => [
            {
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: playButtonBg,
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
            },
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
        >
          <Ionicons
            name={status.playing ? 'pause' : 'play'}
            size={22}
            color={playIconColor}
            style={{ marginLeft: status.playing ? 0 : 2 }}
          />

          <View
            style={{
              position: 'absolute',
              right: -1,
              bottom: -1,
              width: 17,
              height: 17,
              borderRadius: 8.5,
              backgroundColor: isCurrentUser
                ? '#005C4B'
                : isDark
                  ? '#182229'
                  : '#FFFFFF',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: isCurrentUser ? '#FFFFFF50' : colors.border,
            }}
          >
            <Ionicons
              name="mic"
              size={9.5}
              color={isCurrentUser ? '#A7F3D0' : colors.primaryText}
            />
          </View>
        </Pressable>

        <View style={{ flex: 1, gap: 5 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              height: 24,
              justifyContent: 'space-between',
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
                    justifyContent: 'center',
                    alignItems: 'center',
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

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                color: isCurrentUser
                  ? 'rgba(255, 255, 255, 0.85)'
                  : colors.muted,
                fontSize: tokens.moderateScale(11),
                fontWeight: '500',
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatDuration(displayTime)}
            </Text>

            <Pressable
              onPress={handleToggleSpeed}
              hitSlop={6}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 10,
                  backgroundColor: isCurrentUser
                    ? 'rgba(255, 255, 255, 0.22)'
                    : isDark
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(0, 0, 0, 0.06)',
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={{
                  color: isCurrentUser ? '#FFFFFF' : colors.text,
                  fontSize: tokens.moderateScale(10),
                  fontWeight: '700',
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

export const AudioPlayerBubble = React.memo(AudioPlayerBubbleComponent);
