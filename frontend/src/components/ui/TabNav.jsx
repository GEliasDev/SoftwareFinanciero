import { NavLink } from 'react-router-dom';

/**
 * Barra de pestañas para páginas de detalle. Cada pestaña es una ruta real.
 *   <TabNav tabs={[{ to: '', label: 'Resumen', icon: Home, end: true, badge: 3 }, ...]} base="/credit-cards/5" />
 * `to` es relativo a `base`; usa `end` en la pestaña índice.
 */
export const TabNav = ({ tabs, base }) => (
  <div className="tab-nav">
    {tabs.map(t => (
      <NavLink
        key={t.label}
        to={t.to ? `${base}/${t.to}` : base}
        end={t.end}
        className={({ isActive }) => `tab-nav-item ${isActive ? 'active' : ''}`}
      >
        {t.icon && <t.icon size={15} />}
        {t.label}
        {t.badge != null && t.badge !== 0 && <span className="tab-badge">{t.badge}</span>}
      </NavLink>
    ))}
  </div>
);
