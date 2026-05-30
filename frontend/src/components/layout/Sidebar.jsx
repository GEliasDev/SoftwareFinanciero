import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Repeat, Bell, CreditCard, Landmark,
  LogOut, Menu, X, BarChart2, UserCircle,
} from 'lucide-react';
import { AuthService } from '../../services/authService';
import { CreditCardService } from '../../services/creditCardService';
import { fmt, fmtK } from '../../utils/format';
import { BrandMark } from '../ui/BrandMark';

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

  const oblMes   = overview?.totalObligacionMensual ?? 0;
  const dias     = overview?.nextPaymentDays;
  const urgente  = dias !== null && dias !== undefined && dias <= 3;

  return (
    <>
      <button className="menu-toggle" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isOpen && (
        <div
          onClick={close}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 49 }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-logo" onClick={close}>
            <BrandMark size={28} />
            <span className="sidebar-logo-name">Solventa</span>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-title">Principal</span>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" end onClick={close} />

          <div className="nav-divider" />
          <span className="nav-section-title">Finanzas</span>
          <NavItem to="/subscriptions" icon={Repeat} label="Suscripciones" onClick={close} />

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
            {oblMes > 0 && (
              <span className="tabular" style={{
                fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                background: urgente ? 'var(--neg-50)' : 'var(--brand-100)',
                color: urgente ? 'var(--neg-600)' : 'var(--brand-700)',
              }}>
                {fmtK(oblMes)}
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

        {oblMes > 0 && (
          <div
            className="sidebar-summary"
            style={urgente ? { background: 'var(--neg-50)', borderColor: 'rgba(220,38,38,0.2)' } : undefined}
            onClick={() => { navigate('/credit-cards'); close(); }}
            role="button"
          >
            <p className="sidebar-summary-label" style={urgente ? { color: 'var(--neg-700)' } : undefined}>
              Por pagar este mes
            </p>
            <p className="sidebar-summary-value tabular">{fmt(oblMes)}</p>
            {dias !== null && dias !== undefined && (
              <p className="sidebar-summary-sub" style={urgente ? { color: 'var(--neg-600)', fontWeight: 600 } : undefined}>
                {dias === 0 ? 'Próximo pago hoy' : dias === 1 ? 'Próximo pago mañana' : `Próximo pago en ${dias} días`}
              </p>
            )}
          </div>
        )}

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
