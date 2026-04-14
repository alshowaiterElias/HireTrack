'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { en } from './en';
import { ar } from './ar';
import type { Translations } from './en';

export type Language = 'en' | 'ar';
export type Theme = 'dark' | 'light';

const TRANSLATIONS: Record<Language, Translations> = { en, ar };
const LANG_KEY = 'hiretrack_lang';
const THEME_KEY = 'hiretrack_theme';

interface I18nContextValue {
  lang: Language;
  t: Translations;
  setLang: (lang: Language) => void;
  isRTL: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  t: en,
  setLang: () => {},
  isRTL: false,
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');
  const [theme, setThemeState] = useState<Theme>('dark');

  // Load persisted settings on mount
  useEffect(() => {
    const storedLang = localStorage.getItem(LANG_KEY) as Language | null;
    if (storedLang === 'en' || storedLang === 'ar') applyLang(storedLang);

    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    if (storedTheme === 'light' || storedTheme === 'dark') applyTheme(storedTheme);
  }, []);

  const applyLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
    document.documentElement.setAttribute('lang', l);
    document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
  }, []);

  const applyTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  const setLang = useCallback((l: Language) => applyLang(l), [applyLang]);
  const setTheme = useCallback((t: Theme) => applyTheme(t), [applyTheme]);
  const toggleTheme = useCallback(() => applyTheme(theme === 'dark' ? 'light' : 'dark'), [theme, applyTheme]);

  const value: I18nContextValue = {
    lang,
    t: TRANSLATIONS[lang],
    setLang,
    isRTL: lang === 'ar',
    theme,
    setTheme,
    toggleTheme,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
