import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Repeat, Bell, CreditCard, Landmark,
  Menu, X, BarChart2, Wallet, Handshake, Target,
} from 'lucide-react';
import { BrandMark } from '../ui/BrandMark';

const SECTION_ICONS = {
  '/':               LayoutDashboard,
  '/subscriptions':  Repeat,
  '/credit-cards':   CreditCard,
  '/bank-credits':   Landmark,
  '/reminders':      Bell,
  '/reports':        BarChart2,
  '/income':         Wallet,
  '/personal-debts': Handshake,
  '/savings':        Target,
};

function useActiveIcon() {
  const { pathname } = useLocation();
  const base = '/' + pathname.split('/')[1];
  return SECTION_ICONS[base] ?? SECTION_ICONS['/'];
}

const NavItem = ({ to, icon: Icon, label, end, onClick }) => (
  <NavLink
    to={to}
    end={end}
    title={label}
    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    onClick={onClick}
  >
    <span className="nav-icon"><Icon size={16} /></span>
    <span>{label}</span>
  </NavLink>
);

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  const ActiveIcon = useActiveIcon();

  return (
    <>
      <button
        className="menu-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
        {/* Indicador de sección activa — solo visible cuando el sidebar está cerrado */}
        {!isOpen && (
          <span style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 14, height: 14, borderRadius: '50%',
            background: 'var(--brand-600)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ActiveIcon size={8} color="white" />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          onClick={close}
          className="sidebar-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 49 }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-logo" onClick={close}>
            <BrandMark size={28} />
            <span className="sidebar-logo-name">Debti</span>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" end onClick={close} />

          <div className="nav-divider" />
          <NavItem to="/subscriptions" icon={Repeat} label="Suscripciones" onClick={close} />

          <NavItem to="/credit-cards" icon={CreditCard} label="Tarjetas" onClick={close} />

          <NavItem to="/bank-credits" icon={Landmark} label="Créditos" onClick={close} />

          <div className="nav-divider" />
          <NavItem to="/income"         icon={Wallet}    label="Ingresos"       onClick={close} />
          <NavItem to="/personal-debts" icon={Handshake} label="Obligaciones"   onClick={close} />
          <NavItem to="/savings"        icon={Target}    label="Metas de Ahorro" onClick={close} />

          <div className="nav-divider" />
          <NavItem to="/reminders" icon={Bell} label="Recordatorios" onClick={close} />

          <div className="nav-divider" />
          <NavItem to="/reports" icon={BarChart2} label="Reportes" onClick={close} />
        </nav>
      </aside>
    </>
  );
};
