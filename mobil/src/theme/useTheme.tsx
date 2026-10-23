import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { lightColors, darkColors, getUserColor, ThemeColors } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = '@sehir_odalari_theme_mode';

type ThemeContextType = {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
  getUserColor: (userId: string) => string;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');

  // Local storage'dan kayıtlı tema modunu oku
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
          console.log(`[useTheme] Kayıtlı tema yüklendi: ${stored}`);
        }
      } catch (err) {
        console.warn('[useTheme] Tema okunamadı:', err);
      }
    };
    loadTheme();
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch((err) => {
      console.error('[useTheme] Tema kaydedilemedi:', err);
    });
  }, []);

  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemScheme]);

  const toggleDarkMode = useCallback(() => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  const value = useMemo(
    () => ({
      colors,
      isDark,
      mode,
      setMode,
      toggleDarkMode,
      getUserColor: (userId: string) => getUserColor(userId, isDark),
    }),
    [colors, isDark, mode, setMode, toggleDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    const isDark = false;
    return {
      colors: lightColors,
      isDark,
      mode: 'light',
      setMode: () => {},
      toggleDarkMode: () => {},
      getUserColor: (userId: string) => getUserColor(userId, isDark),
    };
  }
  return context;
};
