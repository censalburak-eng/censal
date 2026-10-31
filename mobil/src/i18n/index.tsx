import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tr } from './tr';
import { ar } from './ar';
import { en } from './en';
import { ru } from './ru';
import { Language, TranslationStructure } from './types';
import { supabase } from '../lib/supabase';

export * from './types';
export { tr } from './tr';
export { ar } from './ar';
export { en } from './en';
export { ru } from './ru';

const LANGUAGE_STORAGE_KEY = '@sehir_odalari_lang';

const translations: Record<Language, TranslationStructure> = {
  tr,
  ar,
  en,
  ru,
};

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: TranslationStructure;
  isRTL: boolean;
};

const I18nContext = createContext<I18nContextType>({
  language: 'tr',
  setLanguage: async () => {},
  t: tr,
  isRTL: false,
});

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>('tr');

  useEffect(() => {
    const loadStoredLang = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === 'tr' || stored === 'ar' || stored === 'en' || stored === 'ru') {
          setLangState(stored as Language);
        }
      } catch (err) {
        console.warn('[I18n] Dil yüklenemedi:', err);
      }
    };
    loadStoredLang();
  }, []);

  const setLanguage = async (newLang: Language) => {
    try {
      setLangState(newLang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      console.log(`[I18n] Dil değiştirildi: ${newLang}`);

      // Kullanıcı oturumu varsa profildeki preferred_language alanını senkronize et
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user?.id) {
          supabase
            .from('profiles')
            .update({ preferred_language: newLang })
            .eq('id', data.session.user.id)
            .then();
        }
      });
    } catch (err) {
      console.error('[I18n] Dil kaydedilemedi:', err);
    }
  };

  const t = useMemo(() => {
    return translations[language] ?? tr;
  }, [language]);

  const isRTL = language === 'ar';

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
