import { NavLink, useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Home, Wallet, CreditCard, Landmark, Repeat, BarChart3, UserCircle, Moon, Sun, LogOut, ChevronsUpDown } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { useShell, useThemeState } from './ShellContext';
import { userInitials, userShortName } from './userDisplay';

const NavItem = ({ to, icon: Icon, label, end, badge, badgeLabel }) => (
  <NavLink to={to} end={end} title={label} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
    <span className="nav-icon"><Icon size={18} /></span>
    <span className="nav-label">{label}</span>
    {badge > 0 && (
      <span className="nav-badge n" title={badgeLabel} aria-label={badgeLabel}>{badge}</span>
    )}
  </NavLink>
);

export const BrandLogo = ({ to = '/' }) => (
  <NavLink to={to} className="brand-logo" aria-label="Debti, ir a inicio">
    <span className="brand-mark" aria-hidden="true">D</span>
    <span className="brand-name">Debti</span>
  </NavLink>
);

export const Sidebar = () => {
  const navigate = useNavigate();
  const { pendingCount } = useShell();
  const user = AuthService.getCurrentUser();
  const [theme, applyTheme] = useThemeState();

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar-header"><BrandLogo /></div>

      <nav className="sidebar-nav">
        <NavItem to="/" icon={Home} label="Inicio" end />
        <NavItem to="/income" icon={Wallet} label="Ingresos" />
        <div className="nav-divider" />
        <NavItem
          to="/credit-cards" icon={CreditCard} label="Tarjetas"
          badge={pendingCount} badgeLabel={`${pendingCount} movimientos por aprobar`}
        />
        <NavItem to="/bank-credits" icon={Landmark} label="Créditos" />
        <NavItem to="/subscriptions" icon={Repeat} label="Suscripciones" />
        <div className="nav-divider" />
        <NavItem to="/reports" icon={BarChart3} label="Reportes" />
      </nav>

      <div className="sidebar-footer">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="sidebar-user" aria-label="Menú de cuenta">
              <span className="avatar">{userInitials(user)}</span>
              <span className="sidebar-user-text">
                <span className="sidebar-user-name">{userShortName(user)}</span>
                <span className="sidebar-user-sub">Perfil y ajustes</span>
              </span>
              <ChevronsUpDown size={16} className="sidebar-user-caret" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="menu-content" side="top" align="start" sideOffset={6}>
              {user?.email && <DropdownMenu.Label className="menu-label">{user.email}</DropdownMenu.Label>}
              <DropdownMenu.Item className="menu-item" onSelect={() => navigate('/profile')}>
                <UserCircle size={16} /> Perfil y seguridad
              </DropdownMenu.Item>
              <DropdownMenu.Item className="menu-item" onSelect={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="menu-sep" />
              <DropdownMenu.Item className="menu-item danger" onSelect={() => AuthService.logout()}>
                <LogOut size={16} /> Cerrar sesión
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </aside>
  );
};
