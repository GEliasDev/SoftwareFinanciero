import { useEffect, useState } from 'react';

export const useMediaQuery = (query) => {
  const get = () => typeof window !== 'undefined' && window.matchMedia?.(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return;
    const on = () => setMatches(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return !!matches;
};

/** Teléfono: por debajo de 768 px la app usa barra inferior y bottom sheets. */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
