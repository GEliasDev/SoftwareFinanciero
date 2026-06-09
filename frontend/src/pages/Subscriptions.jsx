import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionService } from '../services/subscriptionService';
import { Plus, Repeat, ChevronRight, Wallet, CalendarRange, CalendarClock } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { CobrosCalendar } from '../components/subscriptions/CobrosCalendar';
import { fmt, nextOccurrence, daysUntil } from '../utils/format';

const FREQ_BADGE = {
  mensual: { label: 'Mensual', cls: 'badge badge-primary' },
  anual:   { label: 'Anual',   cls: 'badge badge-warning' },
};

const monthlyEquiv = (s) => (s.frecuencia === 'anual' ? (s.monto ?? 0) / 12 : (s.monto ?? 0));
const annualEquiv  = (s) => (s.frecuencia === 'anual' ? (s.monto ?? 0) : (s.monto ?? 0) * 12);

export const Subscriptions = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SubscriptionService.getAll()
      .then(setSubscriptions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalMensual = subscriptions.reduce((acc, s) => acc + monthlyEquiv(s), 0);
  const totalAnual   = totalMensual * 12;

  const proximo = useMemo(() => {
    if (subscriptions.length === 0) return null;
    return subscriptions
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

      {!loading && subscriptions.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
            <StatCard label="Costo mensual" value={fmt(totalMensual)} delta="Equivalente por mes" icon={Wallet} tone="brand" />
            <StatCard label="Costo anual" value={fmt(totalAnual)} delta="Lo que gastas al año" icon={CalendarRange} tone="neutral" />
            <StatCard label="Suscripciones" value={`${subscriptions.length}`} delta="en seguimiento" icon={Repeat} tone="neutral" />
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

      <SectionCard title="Tus suscripciones" icon={Repeat} style={{ padding: 0 }} bodyStyle={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 20, borderRadius: 'var(--radius-sm)' }} />)}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Repeat size={24} /></div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Sin suscripciones</p>
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
                  <th>Monto</th>
                  <th>Frecuencia</th>
                  <th>Costo anual</th>
                  <th>Día de cobro</th>
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
                      <td data-label="Monto">
                        <span className="tabular" style={{ fontWeight: 700, color: 'var(--text)' }}>{fmt(sub.monto, sub.moneda)}</span>
                        <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--text-3)' }}>{sub.moneda}</span>
                      </td>
                      <td data-label="Frecuencia"><span className={FREQ_BADGE[sub.frecuencia]?.cls || 'badge badge-neutral'}>{FREQ_BADGE[sub.frecuencia]?.label || sub.frecuencia}</span></td>
                      <td data-label="Costo anual"><span className="tabular" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{fmt(annualEquiv(sub), sub.moneda)}</span></td>
                      <td data-label="Cobro">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ color: 'var(--text-2)' }}>Día {sub.diaCobro}</span>
                          {urgente && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--neg-600)', background: 'var(--neg-50)', padding: '1px 6px', borderRadius: 99 }}>
                              {dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `${dias}d`}
                            </span>
                          )}
                        </span>
                      </td>
                      <td data-label="" style={{ width: 32 }}><ChevronRight size={14} style={{ color: 'var(--text-3)' }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
