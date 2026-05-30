import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Repeat, Bell, CreditCard, Landmark,
  LogOut, Menu, X, BarChart2, UserCircle
} from 'lucide-react';
import { AuthService } from '../../services/authService';
import { CreditCardService } from '../../services/creditCardService';

const NavItem = ({ to, icon: Icon, label, end, onClick }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    onClick={onClick}
  >
    <span className="nav-icon"><Icon size={16} /></span>
    <span>{label}</span>
  </NavLink>
);

const fmtK = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
};

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const navigate = useNavigate();
  const close = () => setIsOpen(false);

  useEffect(() => {
    CreditCardService.getOverview()
      .then(setOverview)
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar sesión?')) {
      AuthService.logout();
      navigate('/login');
    }
  };

  return (
    <>
      <button className="menu-toggle" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isOpen && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)',
            zIndex: 49,
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-logo" onClick={close}>
            <span className="sidebar-logo-name">Debti</span>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-title">Principal</span>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" end onClick={close} />

          <div className="nav-divider" />
          <span className="nav-section-title">Finanzas</span>
          <NavItem to="/subscriptions" icon={Repeat}   label="Suscripciones" onClick={close} />

          <NavLink
            to="/credit-cards"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={close}
            style={{ justifyContent: 'space-between' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="nav-icon"><CreditCard size={16} /></span>
              <span>Tarjetas</span>
            </span>
            {overview && overview.totalObligacionMensual > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '1px 6px',
                borderRadius: 4,
                background: overview.nextPaymentDays !== null && overview.nextPaymentDays <= 3
                  ? 'var(--color-danger-bg)' : 'var(--color-primary-light)',
                color: overview.nextPaymentDays !== null && overview.nextPaymentDays <= 3
                  ? 'var(--color-danger)' : 'var(--color-primary)',
              }}>
                {fmtK(overview.totalObligacionMensual)}
              </span>
            )}
          </NavLink>

          <NavItem to="/bank-credits" icon={Landmark} label="Créditos" onClick={close} />

          <div className="nav-divider" />
          <span className="nav-section-title">Agenda</span>
          <NavItem to="/reminders" icon={Bell} label="Recordatorios" onClick={close} />

          <div className="nav-divider" />
          <span className="nav-section-title">Herramientas</span>
          <NavItem to="/reports"  icon={BarChart2}  label="Reportes"  onClick={close} />
          <NavItem to="/profile"  icon={UserCircle} label="Mi Perfil" onClick={close} />
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
