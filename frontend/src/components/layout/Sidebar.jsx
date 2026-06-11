import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Repeat, Bell, CreditCard, Landmark,
  Menu, X, BarChart2, Wallet, Handshake, Target, PieChart, Activity,
} from 'lucide-react';
import logo from '../../assets/logo.png';

const SECTION_ICONS = {
  '/':               LayoutDashboard,
  '/income':         Wallet,
  '/personal-debts': Handshake,
  '/savings':        Target,
  '/budget':         PieChart,
  '/credit-cards':   CreditCard,
  '/bank-credits':   Landmark,
  '/subscriptions':  Repeat,
  '/reminders':      Bell,
  '/reports':        BarChart2,
  '/activity':       Activity,
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

export const Sidebar = ({ isOpen, setIsOpen }) => {
  const close = () => setIsOpen(false);
  const ActiveIcon = useActiveIcon();

  return (
    <>
      {/* Botón hamburguesa — solo en desktop/tablet; en móvil lo reemplaza el BottomNav */}
      <button
        className={`menu-toggle${isOpen ? ' sidebar-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
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
            <img src={logo} alt="Debti" style={{ height: 52, width: 'auto' }} />
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" end onClick={close} />

          <div className="nav-divider" />
          <NavItem to="/income"         icon={Wallet}    label="Ingresos"        onClick={close} />
          <NavItem to="/personal-debts" icon={Handshake} label="Obligaciones"    onClick={close} />
          <NavItem to="/savings"        icon={Target}    label="Metas de Ahorro" onClick={close} />
          <NavItem to="/budget"         icon={PieChart}  label="Presupuesto"     onClick={close} />

          <div className="nav-divider" />
          <NavItem to="/credit-cards"  icon={CreditCard} label="Tarjetas"     onClick={close} />
          <NavItem to="/bank-credits"  icon={Landmark}   label="Créditos"     onClick={close} />
          <NavItem to="/subscriptions" icon={Repeat}     label="Suscripciones" onClick={close} />

          <div className="nav-divider" />
          <NavItem to="/reminders" icon={Bell}     label="Recordatorios"  onClick={close} />
          <NavItem to="/reports"   icon={BarChart2} label="Reportes"       onClick={close} />
          <NavItem to="/activity"  icon={Activity}  label="Actividad"      onClick={close} />
        </nav>
      </aside>
    </>
  );
};
