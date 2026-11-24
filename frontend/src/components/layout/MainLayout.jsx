import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { ShellContext } from './ShellContext';
import { GlobalSearch } from '../ui/GlobalSearch';
import { RegistrarMovimiento } from './RegistrarMovimiento';
import { AuthService } from '../../services/authService';
import { CreditCardService } from '../../services/creditCardService';
import { CardInboxService } from '../../services/cardInboxService';
import { buildSchedule } from '../../utils/creditCard';
import { daysUntil, effectiveDayInMonth } from '../../utils/format';

// Próximo pago de tarjeta con algo realmente pendiente en el ciclo activo
// (misma lógica que CreditCards.jsx).
const nextCardPayment = (cards) => {
  let best = null;
  for (const c of cards) {
    const schedule = buildSchedule(c.CreditCardPurchases || [], c);
    const activeSlot = schedule.find(s => s.lines.some(l => !l.wasPaid));
    if (!activeSlot) continue;
    const payMonthOffset = Number(c.fechaPago) < Number(c.fechaCorte) ? 1 : 0;
    const payYear  = activeSlot.date.getFullYear();
    const payMonth = activeSlot.date.getMonth() + payMonthOffset;
    const date = new Date(payYear, payMonth, effectiveDayInMonth(c.fechaPago, payYear, payMonth));
    const dias = daysUntil(date);
    if (best === null || dias < best.dias) best = { dias, date, card: c };
  }
  return best;
};

export const MainLayout = () => {
  const user  = AuthService.getCurrentUser();
  const token = localStorage.getItem('token');
  const [searchOpen, setSearchOpen] = useState(false);
  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [payAlert, setPayAlert] = useState(null);

  const refreshAlerts = useCallback(() => {
    // Los avisos no deben bloquear la app: si fallan, simplemente no aparecen.
    CreditCardService.getAll().then(cards => setPayAlert(nextCardPayment(cards))).catch(() => setPayAlert(null));
    CardInboxService.list('pendiente').then(items => setPendingCount(items.length)).catch(() => setPendingCount(0));
  }, []);

  useEffect(() => { if (user && token) refreshAlerts(); }, [refreshAlerts]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const down = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const ctx = useMemo(() => ({
    openSearch: () => setSearchOpen(true),
    openRegistrar: () => setRegistrarOpen(true),
    pendingCount, payAlert, refreshAlerts,
  }), [pendingCount, payAlert, refreshAlerts]);

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ShellContext.Provider value={ctx}>
      <div className="app-container">
        <a href="#main-content" className="skip-link">Saltar al contenido principal</a>
        <Sidebar />
        <div className="main-wrapper">
          <Navbar registrarOpen={registrarOpen} />
          <main id="main-content" className="main-content" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
        <BottomNav registrarOpen={registrarOpen} />
      </div>
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
      <RegistrarMovimiento open={registrarOpen} onOpenChange={setRegistrarOpen} />
    </ShellContext.Provider>
  );
};
