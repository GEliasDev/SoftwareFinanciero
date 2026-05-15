import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, CreditCard, Bell, Repeat } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { Button } from '../ui/Button';

export const Sidebar = () => {
  const menuItems = [
    { path: '/', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/subscriptions', name: 'Suscripciones', icon: <Repeat size={20} /> },
    { path: '/reminders', name: 'Recordatorios', icon: <Bell size={20} /> },
    { path: '/credit-cards', name: 'Tarjetas de Crédito', icon: <CreditCard size={20} /> },
    { path: '/bank-credits', name: 'Créditos Bancarios', icon: <Wallet size={20} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="text-primary"><Wallet size={28} /></div>
          <span>FinSoft</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <Button variant="secondary" className="w-full" onClick={() => AuthService.logout()}>
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
};
