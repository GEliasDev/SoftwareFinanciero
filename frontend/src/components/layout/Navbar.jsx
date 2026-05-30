import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, CalendarClock } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { CreditCardService } from '../../services/creditCardService';

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
  return ROUTE_LABELS[base] || 'Solventa';
};

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();

  const [menuOpen, setMenuOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    CreditCardService.getOverview().then(setOverview).catch(() => {});
  }, []);

  // Cerrar el menú al hacer click fuera.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const userInitial = (user?.primerNombre || user?.name || 'U').charAt(0).toUpperCase();
  const fullName = user?.primerNombre
    ? `${user.primerNombre} ${user.primerApellido || ''}`.trim()
    : user?.name || 'Usuario';

  const dias = overview?.nextPaymentDays;
  const urgente = dias !== null && dias !== undefined && dias <= 3 && (overview?.totalObligacionMensual ?? 0) > 0;

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <span className="navbar-title">{getPageLabel(location.pathname)}</span>

      <div className="navbar-right">
        {urgente && (
          <button className="navbar-pill urgent" onClick={() => navigate('/credit-cards')}>
            <CalendarClock size={13} />
            {dias === 0 ? <strong>Pago de tarjeta hoy</strong>
              : dias === 1 ? <strong>Pago de tarjeta mañana</strong>
              : <span>Pago de tarjeta en <strong>{dias} días</strong></span>}
          </button>
        )}

        <div className="user-menu" ref={menuRef}>
          <button className="user-menu-trigger" onClick={() => setMenuOpen(o => !o)}>
            <span className="user-name">{fullName}</span>
            <div className="user-avatar">{userInitial}</div>
          </button>

          {menuOpen && (
            <div className="user-menu-dropdown">
              <div className="user-menu-head">
                <div className="um-name">{fullName}</div>
                {user?.email && <div className="um-mail">{user.email}</div>}
              </div>
              <button className="user-menu-item" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>
                <UserCircle size={15} /> Mi Perfil
              </button>
              <button className="user-menu-item danger" onClick={handleLogout}>
                <LogOut size={15} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
