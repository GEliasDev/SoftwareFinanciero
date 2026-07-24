import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionService } from '../services/subscriptionService';
import { Plus, Repeat, ChevronRight, Wallet, CalendarRange, CalendarClock, CreditCard } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { LoadError } from '../components/ui/LoadError';
import { CobrosCalendar } from '../components/subscriptions/CobrosCalendar';
import { fmt, nextOccurrence, daysUntil } from '../utils/format';
import { subMonthlyCOP, subAnnualCOP } from '../utils/currency';

const FREQ_BADGE = {
  mensual: { label: 'Mensual', cls: 'badge badge-primary' },
  anual: { label: 'Anual', cls: 'badge badge-warning' },
};

const STATUS_BADGE = {
  activa:    { label: 'Activa',    cls: 'badge badge-success' },
  pausada:   { label: 'Pausada',   cls: 'badge badge-warning' },
  cancelada: { label: 'Cancelada', cls: 'badge badge-neutral' },
};

// En COP: una suscripción en USD/EUR no se puede sumar cruda con las de COP.
const annualEquiv = (s) => subAnnualCOP(s);

export const Subscriptions = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    SubscriptionService.getAll()
      .then(setSubscriptions)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Los totales cuentan SOLO las activas: una suscripción cancelada o pausada
  // ya no se cobra, incluirla inflaba el costo mensual del usuario.
  const activas = subscriptions.filter(s => s.status === 'activa');
  const totalMensual = activas.reduce((acc, s) => acc + subMonthlyCOP(s), 0);
  const totalAnual = totalMensual * 12;

  const proximo = useMemo(() => {
    const act = subscriptions.filter(s => s.status === 'activa');
    if (act.length === 0) return null;
    return act
      .map(s => ({ sub: s, date: nextOccurrence(s.diaCobro), dias: daysUntil(nextOccurrence(s.diaCobro)) }))
      .sort((a, b) => a.dias - b.dias)[0];
  }, [subscriptions]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Suscripciones"
        subtitle="Servicios recurrentes, calendario de cobros y costo anualizado"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/subscriptions/new')}>
            <Plus size={15} /> Nueva Suscripción
          </button>
        }
      />

      {error && !loading && <LoadError onRetry={load} title="No se pudieron cargar tus suscripciones" />}

      {!loading && !error && subscriptions.length > 0 && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 16 }}>
            <StatCard label="Costo mensual" value={fmt(totalMensual)} delta="Solo suscripciones activas" icon={Wallet} tone="brand" />
            <StatCard label="Costo anual" value={fmt(totalAnual)} delta="Lo que gastas al año" icon={CalendarRange} tone="neutral" />
            <StatCard label="Suscripciones" value={`${activas.length}`} delta={`activas de ${subscriptions.length} en total`} icon={Repeat} tone="neutral" />
            <StatCard
              label="Próximo cobro"
              value={proximo ? (proximo.dias === 0 ? 'Hoy' : proximo.dias === 1 ? 'Mañana' : `En ${proximo.dias} días`) : '—'}
              delta={proximo ? `${proximo.sub.nombre} · ${fmt(proximo.sub.monto, proximo.sub.moneda)}` : ''}
              icon={CalendarClock}
              tone={proximo && proximo.dias <= 3 ? 'neg' : 'neutral'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
            <SectionCard title="Calendario de cobros" subtitle="Días de cobro de este mes" icon={CalendarRange}>
              <CobrosCalendar subscriptions={subscriptions} />
            </SectionCard>
          </div>
        </>
      )}

      {!error && <SectionCard>
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 20, borderRadius: 'var(--radius-sm)' }} />)}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Repeat size={24} /></div>
            <p className="empty-state-title">Sin suscripciones</p>
            <p>Registra tus servicios recurrentes para hacer seguimiento de tu gasto.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/subscriptions/new')}>
              <Plus size={14} /> Agregar suscripción
            </button>
          </div>
        ) : (
          <div className="table-container responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Monto</th>
                  <th>Frecuencia</th>
                  <th>Costo anual</th>
                  <th>Día de cobro</th>
                  <th>Cobro</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => {
                  const dias = daysUntil(nextOccurrence(sub.diaCobro));
                  const urgente = dias <= 3;
                  return (
                    <tr key={sub.id} className="clickable" onClick={() => navigate(`/subscriptions/${sub.id}`)}>
                      <td data-label="Nombre">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                            {sub.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{sub.nombre}</div>
                            {sub.descripcion && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub.descripcion}</div>}
                          </div>
                        </div>
                      </td>
                      <td data-label="Estado">
                        <span className={STATUS_BADGE[sub.status]?.cls || 'badge badge-neutral'}>
                          {STATUS_BADGE[sub.status]?.label || sub.status}
                        </span>
                      </td>
                      <td data-label="Monto">
                        <span className="tabular" style={{ fontWeight: 700, color: 'var(--text)' }}>{fmt(sub.monto, sub.moneda)}</span>
                        <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--text-3)' }}>{sub.moneda}</span>
                      </td>
                      <td data-label="Frecuencia"><span className={FREQ_BADGE[sub.frecuencia]?.cls || 'badge badge-neutral'}>{FREQ_BADGE[sub.frecuencia]?.label || sub.frecuencia}</span></td>
                      {/* annualEquiv ya devuelve COP: formatear con la moneda
                          original mostraría "US$" sobre un valor en pesos. */}
                      <td data-label="Costo anual"><span className="tabular" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{fmt(annualEquiv(sub))}</span></td>
                      <td data-label="Día de cobro">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ color: 'var(--text-2)' }}>Día {sub.diaCobro}</span>
                          {urgente && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--neg-600)', background: 'var(--neg-50)', padding: '1px 6px', borderRadius: 99 }}>
                              {dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `${dias}d`}
                            </span>
                          )}
                        </span>
                      </td>
                      <td data-label="Cobro">
                        {sub.CreditCard ? (
                          <span className="badge badge-success" title={`Se cobra automáticamente en ${sub.CreditCard.nombre}`}>
                            <CreditCard size={11} /> {sub.CreditCard.nombre}
                          </span>
                        ) : (
                          <span className="badge badge-neutral">Manual</span>
                        )}
                      </td>
                      <td data-label="" style={{ width: 32 }}><ChevronRight size={14} style={{ color: 'var(--text-3)' }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>}
    </div>
  );
};
