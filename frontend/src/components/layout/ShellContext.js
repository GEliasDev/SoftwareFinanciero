import { createContext, useContext, useEffect, useState } from 'react';

// Estado compartido del shell: abrir búsqueda / "Registrar movimiento" desde
// cualquier vista y los avisos globales (pago próximo, movimientos por aprobar).
export const ShellContext = createContext({
  openSearch: () => {},
  openRegistrar: () => {},
  pendingCount: 0,
  payAlert: null,
  refreshAlerts: () => {},
});

export const useShell = () => useContext(ShellContext);

const THEME_KEY = 'debti-theme';
export const getTheme = () => localStorage.getItem(THEME_KEY) || 'light';
export const setTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new Event('debti-theme'));
};

/** Tema actual + setter; se sincroniza entre componentes con el evento `debti-theme`. */
export const useThemeState = () => {
  const [theme, set] = useState(getTheme);
  useEffect(() => {
    const on = () => set(getTheme());
    window.addEventListener('debti-theme', on);
    return () => window.removeEventListener('debti-theme', on);
  }, []);
  return [theme, setTheme];
};
