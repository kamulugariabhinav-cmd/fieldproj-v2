import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccentColor, ThemeMode, ThemePreferences } from '../types';

interface ThemeContextType {
  preferences: ThemePreferences;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setReducedTransparency: (reduced: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  resetDefaults: () => void;
}

const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: 'dark',
  accent: 'indigo',
  reducedTransparency: false,
  reducedMotion: false,
};

const ACCENT_MAP: Record<AccentColor, { hex: string; rgb: string; hover: string }> = {
  indigo: { hex: '#4F46E5', rgb: '79, 70, 229', hover: '#4338CA' },
  blue: { hex: '#2563EB', rgb: '37, 99, 235', hover: '#1D4ED8' },
  purple: { hex: '#9333EA', rgb: '147, 51, 234', hover: '#7E22CE' },
  emerald: { hex: '#059669', rgb: '5, 150, 105', hover: '#047857' },
  amber: { hex: '#D97706', rgb: '217, 119, 6', hover: '#B45309' },
  rose: { hex: '#E11D48', rgb: '225, 29, 72', hover: '#BE123C' },
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<ThemePreferences>(() => {
    try {
      const saved = localStorage.getItem('voiceguard_theme_prefs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load theme prefs from storage', e);
    }
    return DEFAULT_PREFERENCES;
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolvedTheme: 'light' | 'dark' = preferences.mode === 'system' ? systemTheme : preferences.mode;

  useEffect(() => {
    try {
      localStorage.setItem('voiceguard_theme_prefs', JSON.stringify(preferences));
    } catch (e) {
      console.error(e);
    }

    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    const accentData = ACCENT_MAP[preferences.accent];
    root.style.setProperty('--vg-accent', accentData.hex);
    root.style.setProperty('--vg-accent-rgb', accentData.rgb);
    root.style.setProperty('--vg-accent-hover', accentData.hover);

    if (preferences.reducedTransparency) {
      root.classList.add('reduce-transparency');
    } else {
      root.classList.remove('reduce-transparency');
    }

    if (preferences.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [preferences, resolvedTheme]);

  const setMode = (mode: ThemeMode) => setPreferences(prev => ({ ...prev, mode }));
  const setAccent = (accent: AccentColor) => setPreferences(prev => ({ ...prev, accent }));
  const setReducedTransparency = (reducedTransparency: boolean) =>
    setPreferences(prev => ({ ...prev, reducedTransparency }));
  const setReducedMotion = (reducedMotion: boolean) =>
    setPreferences(prev => ({ ...prev, reducedMotion }));
  const resetDefaults = () => setPreferences(DEFAULT_PREFERENCES);

  return (
    <ThemeContext.Provider
      value={{
        preferences,
        resolvedTheme,
        setMode,
        setAccent,
        setReducedTransparency,
        setReducedMotion,
        resetDefaults,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export { ACCENT_MAP };
