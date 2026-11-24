import { NavLink, useLocation } from 'react-router-dom';
import { Home, CreditCard, Landmark, Menu, Plus, X } from 'lucide-react';
import { useShell } from './ShellContext';

// Secciones que viven dentro de "Más" en el teléfono.
const MORE_PATHS = ['/more', '/income', '/subscriptions', '/reports', '/profile'];

const Tab = ({ to, icon: Icon, label, end, forceActive }) => (
  <NavLink to={to} end={end} className={({ isActive }) => `bn-item ${(isActive || forceActive) ? 'active' : ''}`}>
    <Icon size={22} />
    <span>{label}</span>
  </NavLink>
);

export const BottomNav = ({ registrarOpen }) => {
  const { openRegistrar } = useShell();
  const { pathname } = useLocation();
  const inMore = MORE_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <Tab to="/" icon={Home} label="Inicio" end />
      <Tab to="/credit-cards" icon={CreditCard} label="Tarjetas" />
      <div className="bn-fab-slot">
        <button className="bn-fab" onClick={openRegistrar} aria-label="Registrar movimiento" aria-expanded={registrarOpen}>
          {registrarOpen ? <X size={24} /> : <Plus size={26} />}
        </button>
      </div>
      <Tab to="/bank-credits" icon={Landmark} label="Créditos" />
      <Tab to="/more" icon={Menu} label="Más" forceActive={inMore} />
    </nav>
  );
};
