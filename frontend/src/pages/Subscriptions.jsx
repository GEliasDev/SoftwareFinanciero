import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionService } from '../services/subscriptionService';
import { Plus, Repeat, ChevronRight } from 'lucide-react';

const fmt = (n, currency = 'COP') =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (str) => {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const FREQ_BADGE = {
  mensual: { label: 'Mensual', cls: 'badge badge-primary' },
  anual:   { label: 'Anual',   cls: 'badge badge-info' },
};

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

  const totalMensual = subscriptions.reduce((acc, s) => {
    const monto = s.monto ?? 0;
    return acc + (s.frecuencia === 'anual' ? monto / 12 : monto);
  }, 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Suscripciones</h1>
        <button className="btn btn-primary" onClick={() => navigate('/subscriptions/new')}>
          <Plus size={15} /> Nueva Suscripción
        </button>
      </div>

      {/* Resumen rápido */}
      {!loading && subscriptions.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem', marginBottom: '1.25rem',
        }}>
          {[
            { label: 'Total registradas', value: subscriptions.length, unit: 'suscripciones' },
            { label: 'Costo mensual est.', value: fmt(totalMensual), unit: 'en COP' },
            { label: 'Cobro esta semana',  value: subscriptions.filter(s => {
              const today = new Date().getDate();
              const end = today + 7;
              return s.diaCobro >= today && s.diaCobro <= end;
            }).length, unit: 'próximas' },
          ].map(({ label, value, unit }) => (
            <div key={label} style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem', boxShadow: 'var(--shadow-sm)',
            }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.25rem' }}>{label}</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{value}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>{unit}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 20, borderRadius: 'var(--radius-sm)' }} />)}
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
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Monto</th>
                  <th>Frecuencia</th>
                  <th>Día de cobro</th>
                  <th>Inicio</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr
                    key={sub.id}
                    className="clickable"
                    onClick={() => navigate(`/subscriptions/${sub.id}`)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 12, flexShrink: 0,
                        }}>
                          {sub.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{sub.nombre}</div>
                          {sub.descripcion && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{sub.descripcion}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmt(sub.monto, sub.moneda)}</span>
                      <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>{sub.moneda}</span>
                    </td>
                    <td><span className={FREQ_BADGE[sub.frecuencia]?.cls || 'badge badge-neutral'}>{FREQ_BADGE[sub.frecuencia]?.label || sub.frecuencia}</span></td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>Día {sub.diaCobro}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{fmtDate(sub.fechaInicio)}</td>
                    <td style={{ width: 32 }}><ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
