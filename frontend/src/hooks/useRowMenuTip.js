import { useEffect } from 'react';
import { toast } from 'sonner';

const TIP_KEY = 'debti-tip-row-menu';

/**
 * Aviso único: la primera vez que una vista muestra filas con menú (RowMenu),
 * explica el clic derecho (PC) o mantener presionado (teléfono). No vuelve a salir.
 */
export const useRowMenuTip = (enabled) => {
  useEffect(() => {
    if (!enabled || localStorage.getItem(TIP_KEY)) return;
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    const t = setTimeout(() => {
      localStorage.setItem(TIP_KEY, '1');
      toast('Acciones rápidas', {
        description: touch
          ? 'Mantén presionada una fila para ver sus opciones.'
          : 'Haz clic derecho sobre una fila para ver sus opciones.',
        duration: 6000,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [enabled]);
};
