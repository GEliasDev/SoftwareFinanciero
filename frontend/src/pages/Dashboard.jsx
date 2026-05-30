import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionService } from '../services/subscriptionService';
import { CreditCardService } from '../services/creditCardService';
import { BankCreditService } from '../services/bankCreditService';
import { AuthService } from '../services/authService';
import { Repeat, CreditCard, Landmark, ArrowRight } from 'lucide-react';

const fmt = (n, currency = 'COP') =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n ?? 0);

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

  const activeSubs     = data.subs.length;
  const totalCards     = data.cards.length;
  const activeCredits  = data.credits.filter(c => c.status === 'activo').length;
  const monthlySubCost = data.subSummary?.totalMonthlyExpense ?? 0;
  const totalDebt      = data.credits.reduce((acc, c) => acc + (c.saldoPendiente ?? 0), 0);
  const upcomingRenewals = data.subSummary?.upcomingRenewals ?? [];
  const cardObligation   = data.overview?.totalObligacionMensual ?? 0;
  const nextPaymentDays  = data.overview?.nextPaymentDays;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
            Bienvenido, {firstName}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 88 }} />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="metric-card">
              <p className="metric-label">Gasto mensual suscripciones</p>
              <p className="metric-value">{fmt(monthlySubCost)}</p>
              <p className="metric-delta">{activeSubs} suscripciones</p>
            </div>

            <div className="metric-card">
              <p className="metric-label">Suscripciones activas</p>
              <p className="metric-value">{activeSubs}</p>
              <p className="metric-delta">en seguimiento</p>
            </div>

            <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/credit-cards')}>
              <p className="metric-label">Obligación tarjetas / mes</p>
              <p className="metric-value" style={{ fontSize: cardObligation > 0 ? 18 : undefined }}>
                {cardObligation > 0 ? fmt(cardObligation) : totalCards}
              </p>
              <p className="metric-delta" style={{
                color: nextPaymentDays !== null && nextPaymentDays <= 3 ? 'var(--color-danger)' : undefined
              }}>
                {cardObligation > 0
                  ? nextPaymentDays !== null
                    ? nextPaymentDays === 0 ? 'Pago hoy'
                      : nextPaymentDays <= 3 ? `Pago en ${nextPaymentDays} días`
                      : `Pago en ${nextPaymentDays} días`
                    : `${totalCards} tarjeta${totalCards !== 1 ? 's' : ''}`
                  : 'registradas'}
              </p>
            </div>

            <div className="metric-card">
              <p className="metric-label">Deuda total créditos</p>
              <p className="metric-value" style={{ fontSize: 18 }}>{fmt(totalDebt)}</p>
              <p className="metric-delta">{activeCredits} crédito{activeCredits !== 1 ? 's' : ''} activo{activeCredits !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Content grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Upcoming renewals */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Próximos Vencimientos</h3>
                  <p className="card-subtitle">Suscripciones en los próximos 7 días</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/subscriptions')}>
                  Ver todo <ArrowRight size={12} />
                </button>
              </div>
              {upcomingRenewals.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {upcomingRenewals.slice(0, 5).map((sub, i) => (
                    <div key={sub._id || sub.id || i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: i < Math.min(upcomingRenewals.length, 5) - 1
                        ? '1px solid var(--color-border)' : 'none',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 13, margin: 0 }}
                           className="truncate">
                          {sub.nombre || sub.name}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                          Día {sub.diaCobro ?? new Date(sub.nextRenewalDate).getDate()}
                        </p>
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--color-warning)', fontSize: 13,
                                     whiteSpace: 'nowrap', marginLeft: 12 }}>
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
            </div>

            {/* Active credits */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Créditos Activos</h3>
                  <p className="card-subtitle">Seguimiento de pagos</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/bank-credits')}>
                  Ver todo <ArrowRight size={12} />
                </button>
              </div>
              {data.credits.filter(c => c.status === 'activo').length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {data.credits.filter(c => c.status === 'activo').slice(0, 4).map(credit => {
                    const pct = credit.numeroCuotas ? (credit.cuotasPagadas / credit.numeroCuotas) * 100 : 0;
                    return (
                      <div key={credit.id} style={{ cursor: 'pointer' }}
                           onClick={() => navigate(`/bank-credits/${credit.id}`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--color-text-primary)' }}
                                className="truncate">
                            {credit.nombre}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                            {credit.cuotasPagadas}/{credit.numeroCuotas}
                          </span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{fmt(credit.valorCuota)}/mes</span>
                          <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
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
            </div>

          </div>

          {/* Quick actions */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3 className="card-title" style={{ marginBottom: 16 }}>Accesos Rápidos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {[
                { icon: Repeat,     label: 'Nueva Suscripción', path: '/subscriptions/new' },
                { icon: CreditCard, label: 'Nueva Tarjeta',     path: '/credit-cards/new' },
                { icon: Landmark,   label: 'Nuevo Crédito',     path: '/bank-credits/new' },
              ].map(({ icon: Icon, label, path }) => (
                <button key={path} className="quick-action-btn" onClick={() => navigate(path)}>
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
