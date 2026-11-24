import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Scale, Repeat, BarChart3, Moon, LogOut, ChevronRight } from 'lucide-react';
import { AuthService } from '../services/authService';
import { IncomeService } from '../services/incomeService';
import { SubscriptionService } from '../services/subscriptionService';
import { useThemeState } from '../components/layout/ShellContext';
import { userInitials, userShortName } from '../components/layout/userDisplay';
import { subMonthlyCOP } from '../utils/currency';
import { fmt } from '../utils/format';

// "Más" (solo teléfono): secciones que no caben en la barra inferior.
export const More = () => {
  const user = AuthService.getCurrentUser();
  const [theme, applyTheme] = useThemeState();
  const [income, setIncome] = useState(null);
  const [subs, setSubs] = useState(null);

  useEffect(() => {
    IncomeService.getAll().then(list => {
      const fijos = list.filter(i => i.status === 'activo' && i.tipo !== 'extra');
      setIncome({ total: fijos.reduce((a, i) => a + parseFloat(i.monto ?? 0), 0), n: fijos.length });
    }).catch(() => {});
    SubscriptionService.getAll().then(list => {
      const act = list.filter(s => s.status === 'activa');
      setSubs({ total: act.reduce((a, s) => a + subMonthlyCOP(s), 0), n: act.length });
    }).catch(() => {});
  }, []);

  const rows = [
    { to: '/income', icon: Wallet, title: 'Ingresos', sub: income ? `${fmt(income.total)} al mes · ${income.n} fuente${income.n !== 1 ? 's' : ''}` : 'Salario y otras entradas' },
    { to: '/balance', icon: Scale, title: 'Balance', sub: 'Ingresos y pagos del mes, y lo que queda' },
    { to: '/subscriptions', icon: Repeat, title: 'Suscripciones', sub: subs ? `${fmt(subs.total)} al mes · ${subs.n} activa${subs.n !== 1 ? 's' : ''}` : 'Cobros recurrentes' },
    { to: '/reports', icon: BarChart3, title: 'Reportes', sub: 'Histórico, proyección y salud financiera' },
  ];

  return (
    <div className="page more-page">
      <h1 className="page-title" style={{ marginBottom: 16 }}>Más</h1>

      <Link to="/profile" className="card more-profile">
        <span className="avatar lg">{userInitials(user)}</span>
        <span className="more-text">
          <strong>{userShortName(user)}</strong>
          <span>Perfil, seguridad y Gmail</span>
        </span>
        <ChevronRight size={18} className="more-chev" />
      </Link>

      <div className="card card-flush row-list">
        {rows.map(r => (
          <Link key={r.to} to={r.to} className="more-row">
            <span className="more-icon"><r.icon size={18} /></span>
            <span className="more-text"><strong>{r.title}</strong><span className="n">{r.sub}</span></span>
            <ChevronRight size={18} className="more-chev" />
          </Link>
        ))}
      </div>

      <div className="card card-flush">
        <label className="more-row" style={{ cursor: 'pointer' }}>
          <span className="more-icon"><Moon size={18} /></span>
          <span className="more-text"><strong>Modo oscuro</strong></span>
          <input
            type="checkbox" role="switch" className="switch"
            checked={theme === 'dark'}
            onChange={(e) => applyTheme(e.target.checked ? 'dark' : 'light')}
          />
        </label>
      </div>

      <button className="btn btn-secondary btn-lg more-logout" onClick={() => AuthService.logout()}>
        <LogOut size={18} /> Cerrar sesión
      </button>
      {user?.email && <p className="more-foot">Sesión iniciada como {user.email}</p>}
    </div>
  );
};
