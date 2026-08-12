import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { loadItem, saveItem } from '../lib/storage';
import { darkColors, lightColors, shadowFor, ThemeColors, ThemeShadows } from '../lib/theme';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  scheme: ResolvedScheme;
  colors: ThemeColors;
  shadow: ThemeShadows;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadItem<ThemeMode>('themeMode', 'dark');
      setModeState(saved);
      setReady(true);
    })();
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    saveItem('themeMode', m);
  };

  const scheme: ResolvedScheme = mode === 'system' ? (deviceScheme === 'light' ? 'light' : 'dark') : mode;
  const colors = scheme === 'dark' ? darkColors : lightColors;
  const shadow = useMemo(() => shadowFor(scheme), [scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, colors, shadow, setMode }),
    [mode, scheme, colors, shadow]
  );

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
