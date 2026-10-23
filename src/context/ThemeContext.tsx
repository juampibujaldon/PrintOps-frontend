import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '../constants/api';
import { storage } from '../services/storage';

// Tema de la interfaz: "system" sigue al sistema operativo; "light"/"dark" lo fijan.
// Se aplica con data-theme en <html> (los colores viven en las variables de tokens.css).
export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ preference: 'system', setPreference: () => {} });

function readPreference(): ThemePreference {
  const v = storage.getItem(STORAGE_KEYS.THEME);
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function applyTheme(p: ThemePreference): void {
  const root = document.documentElement;
  if (p === 'system') delete root.dataset.theme;
  else root.dataset.theme = p;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>(readPreference);

  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    if (p === 'system') storage.removeItem(STORAGE_KEYS.THEME);
    else storage.setItem(STORAGE_KEYS.THEME, p);
    setPref(p);
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
