import { useLocation } from 'react-router-dom';
import { AuthService } from '../../services/authService';

const ROUTE_LABELS = {
  '/':              'Dashboard',
  '/subscriptions': 'Suscripciones',
  '/credit-cards':  'Tarjetas de Crédito',
  '/bank-credits':  'Créditos Bancarios',
  '/reminders':     'Recordatorios',
  '/reports':       'Reportes y Analítica',
  '/profile':       'Mi Perfil',
};

const getPageLabel = (pathname) => {
  if (pathname === '/') return 'Dashboard';
  const base = '/' + pathname.split('/')[1];
  return ROUTE_LABELS[base] || 'Debti';
};

export const Navbar = () => {
  const location = useLocation();
  const user = AuthService.getCurrentUser();

  const userInitial = (user?.primerNombre || user?.name || 'U').charAt(0).toUpperCase();
  const fullName = user?.primerNombre
    ? `${user.primerNombre} ${user.primerApellido || ''}`.trim()
    : user?.name || 'Usuario';

  return (
    <header className="navbar">
      <span className="navbar-title">{getPageLabel(location.pathname)}</span>
      <div className="navbar-user">
        <span className="user-name">{fullName}</span>
        <div className="user-avatar">{userInitial}</div>
      </div>
    </header>
  );
};
