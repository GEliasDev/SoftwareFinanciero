import { useNavigate, useLocation } from 'react-router-dom';

// Vuelve a la pantalla (y pestaña) de la que venía el usuario. Si la página se abrió directo por URL
// (no hay historial dentro de la app; `location.key` es 'default'), va a `fallback`.
export const useGoBack = (fallback) => {
  const navigate = useNavigate();
  const { key } = useLocation();
  return () => (key !== 'default' ? navigate(-1) : navigate(fallback));
};
