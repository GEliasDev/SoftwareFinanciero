import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Wallet, BarChart2, Menu } from 'lucide-react';

// Rutas que tienen ítem propio en la barra inferior
const PRIMARY_ROUTES = new Set(['/', '/credit-cards', '/income', '/reports']);

export const BottomNav = ({ onOpenSidebar }) => {
  const { pathname } = useLocation();
  const base = pathname === '/' ? '/' : '/' + pathname.split('/')[1];
  const isMoreActive = !PRIMARY_ROUTES.has(base);

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <NavLink to="/" end className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
        <LayoutDashboard size={22} />
        <span>Inicio</span>
      </NavLink>

      <NavLink to="/credit-cards" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
        <CreditCard size={22} />
        <span>Tarjetas</span>
      </NavLink>

      <NavLink to="/income" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
        <Wallet size={22} />
        <span>Ingresos</span>
      </NavLink>

      <NavLink to="/reports" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
        <BarChart2 size={22} />
        <span>Reportes</span>
      </NavLink>

      <button
        className={`bottom-nav-item${isMoreActive ? ' active' : ''}`}
        onClick={onOpenSidebar}
        aria-label="Abrir menú completo"
      >
        <Menu size={22} />
        <span>Más</span>
      </button>
    </nav>
  );
};
