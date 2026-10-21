import { createContext, useContext } from 'react';

export interface ShellContextValue {
  /** Abre el drawer de navegación (mobile). */
  openMenu: () => void;
}

// null fuera de AppShell (pantallas públicas): ScreenHeader no muestra el botón de menú.
export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue | null {
  return useContext(ShellContext);
}
