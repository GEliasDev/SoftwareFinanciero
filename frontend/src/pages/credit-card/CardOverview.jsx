import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CreditCard, RotateCcw, Percent, TrendingDown, Calendar, DollarSign, AlertTriangle,
} from 'lucide-react';
import { getCardGradient } from '../../utils/cardColors';
import { fmt, fmtShort, urgencyStyle } from '../../utils/format';
import { TASA_USURA_EA } from './CreditCardLayout';

export const CardOverview = () => {
  const {
    card, activePurchases, monthlyObligation, cupoUsado, usagePct, barColor, tasaEA, isHighRate,
    nextCorte, nextPago, daysCorte, daysPago,
    totalCapital, totalConIntereses, totalYaPagado, totalRestante, maxMesesRestantes,
  } = useOutletContext();
  const [flipped, setFlipped] = useState(false);

  return (
    <div>
      {/* Alerts */}
      {usagePct >= 75 && (
        <div className="info-box warning" style={{ marginBottom: '0.875rem' }}>
          <AlertTriangle size={15} />
          <span><strong>Cupo al {usagePct.toFixed(0)}%.</strong> Evita nuevas compras para no afectar tu salud financiera.</span>
        </div>
      )}
      {isHighRate && (
        <div className="info-box warning" style={{ marginBottom: '0.875rem' }}>
          <AlertTriangle size={15} />
          <span><strong>Tasa alta:</strong> esta tarjeta tiene {tasaEA}% E.A., por encima de la tasa de usura referencial ({TASA_USURA_EA}% E.A.). Verifica con tu banco.</span>
        </div>
      )}

      {/* HERO: flip card + countdown + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '6fr 5fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className={`cc-flip-wrapper ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(f => !f)} style={{ marginBottom: 0 }}>
          <div className="cc-flip-inner">
            <div className="cc-flip-front" style={{ background: getCardGradient(card?.color) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '0 0 0.15rem', fontWeight: 600, letterSpacing: '0.08em' }}>{card?.entidad?.toUpperCase()}</p>
                  <p style={{ color: 'white', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{card?.nombre}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 3 }}><RotateCcw size={10} /> voltear</span>
                  <CreditCard size={22} style={{ color: 'rgba(255,255,255,0.4)' }} />
                </div>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: '0 0 0.15rem', fontWeight: 600, letterSpacing: '0.08em' }}>CUPO DISPONIBLE</p>
                <p className="tabular" style={{ color: 'white', fontSize: '1.9rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{fmt(card?.cupoDisponible ?? card?.cupoTotal)}</p>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }}>
                  <span>Usado: {fmt(cupoUsado)} ({usagePct.toFixed(0)}%)</span>
                  <span>Cupo total: {fmt(card?.cupoTotal)}</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 99 }}>
                  <div style={{ height: 5, width: `${Math.min(usagePct, 100)}%`, background: barColor, borderRadius: 99, boxShadow: `0 0 6px ${barColor}88`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0, fontFamily: 'monospace', letterSpacing: '0.15em' }}>{card?.ultimos4 ? `•••• •••• •••• ${card.ultimos4}` : ''}</p>
              </div>
            </div>

            <div className="cc-flip-back" style={{ background: getCardGradient(card?.color) }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 3 }}><RotateCcw size={10} /> voltear</span>
                <CreditCard size={22} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </div>
              <div className="cc-magnetic-strip" style={{ position: 'relative', zIndex: 1 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
                {[
                  { label: 'Tasa mensual', value: `${card?.tasaInteresMensual}% M.V.`, Icon: Percent },
                  { label: 'Tasa E.A.',   value: `${tasaEA}% E.A.`,                   Icon: TrendingDown },
                  { label: 'Día corte',   value: `Día ${card?.fechaCorte}`,            Icon: Calendar },
                  { label: 'Día pago',    value: `Día ${card?.fechaPago}`,             Icon: Calendar },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                    <item.Icon size={13} style={{ color: 'rgba(255,255,255,0.5)', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 1 }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.6)', position: 'relative', zIndex: 1 }}>
                <span>{activePurchases.length} compras activas</span>
                <span>Oblig. mensual: {fmt(monthlyObligation)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {card && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {[
                { label: 'Próximo corte', days: daysCorte, date: nextCorte, Icon: Calendar },
                { label: 'Próximo pago',  days: daysPago,  date: nextPago,  Icon: DollarSign },
              ].map(({ label, days, date, Icon }) => {
                const s = urgencyStyle(days);
                return (
                  <div key={label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Icon size={13} style={{ color: s.color }} />
                      <span style={{ fontSize: 10, color: s.color, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days} días`}</div>
                    <div style={{ fontSize: 11, color: s.color, opacity: 0.75, marginTop: 1 }}>{date ? fmtShort(date) : '—'}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', flex: 1 }}>
            {[
              { label: 'Obligación mensual', value: activePurchases.length > 0 ? fmt(monthlyObligation) : '—', sub: activePurchases.length > 0 ? `${activePurchases.length} compra${activePurchases.length !== 1 ? 's' : ''}` : 'sin cuotas activas', bg: 'var(--brand-50)', color: 'var(--brand-600)', border: 'rgba(91,77,241,0.15)' },
              { label: 'Cupo disponible', value: fmt(card?.cupoDisponible ?? 0), sub: `${(100 - usagePct).toFixed(0)}% disponible`, bg: usagePct >= 80 ? '#fef2f2' : 'var(--color-success-bg)', color: usagePct >= 80 ? '#dc2626' : 'var(--color-success)', border: usagePct >= 80 ? 'rgba(220,38,38,0.15)' : 'rgba(5,150,105,0.15)' },
              { label: 'Saldo pendiente', value: activePurchases.length > 0 ? fmt(totalRestante) : '—', sub: activePurchases.length > 0 ? `${maxMesesRestantes} mes${maxMesesRestantes !== 1 ? 'es' : ''} restante${maxMesesRestantes !== 1 ? 's' : ''}` : '0 deuda activa', bg: '#fffbeb', color: 'var(--color-warning)', border: 'rgba(217,119,6,0.15)' },
              { label: 'Tasa efectiva anual', value: `${tasaEA}%`, sub: isHighRate ? '⚠ Por encima de usura' : '✓ Dentro del límite', bg: isHighRate ? 'var(--color-warning-bg)' : 'var(--color-bg)', color: isHighRate ? 'var(--color-warning)' : 'var(--color-text-secondary)', border: isHighRate ? 'rgba(217,119,6,0.15)' : 'var(--color-border)' },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: kpi.bg, border: `1px solid ${kpi.border}`, borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', boxShadow: 'var(--shadow-sm)' }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: kpi.color, margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>{kpi.label}</p>
                <p className="tabular" style={{ fontSize: '1.05rem', fontWeight: 800, color: kpi.color, margin: '0 0 0.2rem', letterSpacing: '-0.01em' }}>{kpi.value}</p>
                <p style={{ fontSize: 10, color: kpi.color, margin: 0, opacity: 0.65 }}>{kpi.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Debt summary */}
      {activePurchases.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
            <TrendingDown size={15} style={{ color: 'var(--brand-600)' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: 0 }}>Resumen de deuda activa</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 1.5rem' }}>
            {[
              { label: 'Capital total',      value: fmt(totalCapital),      color: 'var(--color-text-secondary)' },
              { label: 'Total c/ intereses', value: fmt(totalConIntereses), color: '#dc2626' },
              { label: 'Ya pagado',          value: fmt(totalYaPagado),     color: 'var(--color-success)' },
              { label: 'Saldo restante',     value: fmt(totalRestante),     color: 'var(--brand-600)', bold: true },
              { label: 'Intereses totales',  value: fmt(totalConIntereses - totalCapital), color: 'var(--color-warning)' },
              { label: 'Meses hasta saldar', value: `${maxMesesRestantes} mes${maxMesesRestantes !== 1 ? 'es' : ''}`, color: 'var(--color-text-secondary)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.325rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{row.label}</span>
                <span className="tabular" style={{ fontSize: 13, fontWeight: row.bold ? 700 : 600, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
