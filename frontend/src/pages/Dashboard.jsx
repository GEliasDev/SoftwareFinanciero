import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionService } from '../services/subscriptionService';
import { CreditCardService } from '../services/creditCardService';
import { BankCreditService } from '../services/bankCreditService';
import { AuthService } from '../services/authService';
import {
  Repeat, CreditCard, Landmark, ArrowRight, Wallet, Bell, Plus, PieChart as PieIcon,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { fmt } from '../utils/format';

const DIST_COLORS = { tarjetas: '#4F46E5', creditos: '#D97706', suscripciones: '#059669' };

export const Dashboard = () => {
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();
  const firstName = user?.primerNombre || user?.name?.split(' ')[0] || 'Usuario';

  const [data, setData] = useState({ subs: [], cards: [], credits: [], subSummary: null, overview: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      SubscriptionService.getAll(),
      CreditCardService.getAll(),
      BankCreditService.getAll(),
      SubscriptionService.getSummary(),
      CreditCardService.getOverview(),
    ]).then(([subsRes, cardsRes, creditsRes, summaryRes, overviewRes]) => {
      setData({
        subs:       subsRes.status === 'fulfilled'    ? subsRes.value    : [],
        cards:      cardsRes.status === 'fulfilled'   ? cardsRes.value   : [],
        credits:    creditsRes.status === 'fulfilled' ? creditsRes.value : [],
        subSummary: summaryRes.status === 'fulfilled' ? summaryRes.value : null,
        overview:   overviewRes.status === 'fulfilled' ? overviewRes.value : null,
      });
    }).finally(() => setLoading(false));
  }, []);

  const activeSubs      = data.subs.length;
  const activeCreditsArr = data.credits.filter(c => c.status === 'activo');
  const monthlySubCost  = data.subSummary?.totalMonthlyExpense ?? 0;
  const cardObligation  = data.overview?.totalObligacionMensual ?? 0;
  const monthlyCredit   = activeCreditsArr.reduce((s, c) => s + parseFloat(c.valorCuota ?? 0), 0);
  const totalDebt       = data.credits.reduce((acc, c) => acc + (c.saldoPendiente ?? 0), 0);
  const compromisoMensual = monthlySubCost + cardObligation + monthlyCredit;
  const upcomingRenewals = data.subSummary?.upcomingRenewals ?? [];
  const nextPaymentDays  = data.overview?.nextPaymentDays;
  const urgente = nextPaymentDays !== null && nextPaymentDays !== undefined && nextPaymentDays <= 3 && cardObligation > 0;

  const dist = [
    { name: 'Tarjetas',      value: cardObligation, color: DIST_COLORS.tarjetas },
    { name: 'Créditos',      value: monthlyCredit,  color: DIST_COLORS.creditos },
    { name: 'Suscripciones', value: monthlySubCost, color: DIST_COLORS.suscripciones },
  ].filter(d => d.value > 0);

  const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const cardPagoTexto = nextPaymentDays === 0 ? 'Pago hoy'
    : nextPaymentDays === 1 ? 'Pago mañana'
    : nextPaymentDays > 0 ? `Pago en ${nextPaymentDays} días`
    : `${data.cards.length} tarjeta${data.cards.length !== 1 ? 's' : ''}`;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Hola, ${firstName}`}
        subtitle={`${hoy.charAt(0).toUpperCase()}${hoy.slice(1)} · Resumen de tus finanzas`}
      />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 96 }} />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 16 }}>
            <StatCard
              label="Compromiso mensual"
              value={fmt(compromisoMensual)}
              delta="Suscripciones + tarjetas + créditos"
              icon={Wallet}
              tone="brand"
            />
            <StatCard
              label="Suscripciones"
              value={fmt(monthlySubCost)}
              delta={`${activeSubs} activa${activeSubs !== 1 ? 's' : ''}`}
              icon={Repeat}
              tone="pos"
              onClick={() => navigate('/subscriptions')}
            />
            <StatCard
              label="Obligación tarjetas"
              value={cardObligation > 0 ? fmt(cardObligation) : `${data.cards.length}`}
              delta={cardPagoTexto}
              icon={CreditCard}
              tone={urgente ? 'neg' : 'warn'}
              onClick={() => navigate('/credit-cards')}
            />
            <StatCard
              label="Deuda en créditos"
              value={fmt(totalDebt)}
              delta={`${activeCreditsArr.length} crédito${activeCreditsArr.length !== 1 ? 's' : ''} activo${activeCreditsArr.length !== 1 ? 's' : ''}`}
              icon={Landmark}
              tone="neg"
              onClick={() => navigate('/bank-credits')}
            />
          </div>

          {/* Distribución + Próximos vencimientos */}
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: 16, marginBottom: 16 }}>
            <SectionCard title="Distribución del compromiso mensual" subtitle="A dónde va tu dinero cada mes" icon={PieIcon}>
              {dist.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dist} cx="50%" cy="50%" innerRadius={54} outerRadius={78} paddingAngle={2} dataKey="value" stroke="none">
                          {dist.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                      <span className="tabular" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{fmt(compromisoMensual)}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dist.map(d => {
                      const pct = compromisoMensual > 0 ? (d.value / compromisoMensual) * 100 : 0;
                      return (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1 }}>{d.name}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                          <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 92, textAlign: 'right' }}>{fmt(d.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <p>Aún no tienes compromisos mensuales registrados.</p>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Próximos vencimientos"
              subtitle="Suscripciones en los próximos 7 días"
              icon={Bell}
              action={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/subscriptions')}>Ver todo <ArrowRight size={12} /></button>}
            >
              {upcomingRenewals.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {upcomingRenewals.slice(0, 5).map((sub, i) => (
                    <div key={sub._id || sub.id || i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0',
                      borderBottom: i < Math.min(upcomingRenewals.length, 5) - 1 ? '1px solid var(--color-border)' : 'none',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <p className="truncate" style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, margin: 0 }}>{sub.nombre || sub.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Día {sub.diaCobro ?? new Date(sub.nextRenewalDate).getDate()}</p>
                      </div>
                      <span className="tabular" style={{ fontWeight: 700, color: 'var(--warn-600)', fontSize: 13, whiteSpace: 'nowrap', marginLeft: 12 }}>
                        {fmt(sub.monto ?? sub.cost, sub.moneda)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <p>Sin vencimientos en los próximos 7 días</p>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Créditos activos + Accesos rápidos */}
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: 16 }}>
            <SectionCard
              title="Créditos activos"
              subtitle="Seguimiento de pagos"
              icon={Landmark}
              action={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/bank-credits')}>Ver todo <ArrowRight size={12} /></button>}
            >
              {activeCreditsArr.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {activeCreditsArr.slice(0, 4).map(credit => {
                    const pct = credit.numeroCuotas ? (credit.cuotasPagadas / credit.numeroCuotas) * 100 : 0;
                    return (
                      <div key={credit.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/bank-credits/${credit.id}`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span className="truncate" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{credit.nombre}</span>
                          <span className="tabular" style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', marginLeft: 8 }}>{credit.cuotasPagadas}/{credit.numeroCuotas}</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span className="tabular" style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmt(credit.valorCuota)}/mes</span>
                          <span style={{ fontSize: 12, color: 'var(--pos-600)', fontWeight: 700 }}>{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <p>Sin créditos activos</p>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Accesos rápidos" subtitle="Registra un movimiento" icon={Plus}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { icon: Repeat,     label: 'Suscripción', path: '/subscriptions/new' },
                  { icon: CreditCard, label: 'Tarjeta',     path: '/credit-cards/new' },
                  { icon: Landmark,   label: 'Crédito',     path: '/bank-credits/new' },
                  { icon: Bell,       label: 'Recordatorio', path: '/reminders/new' },
                ].map(({ icon: Icon, label, path }) => (
                  <button key={path} className="quick-action-btn" onClick={() => navigate(path)}>
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
};
