import { useMemo, useState } from 'react';
import {
  FileText, CalendarClock, ChevronDown, ChevronRight, CheckSquare, TrendingDown,
} from 'lucide-react';
import { getCardGradient } from '../../utils/cardColors';
import {
  fmt, fmtShort, getCat, nextOccurrence, daysUntil, urgencyStyle, buildSchedule, weekendToFriday,
} from '../../utils/creditCard';

/**
 * Extracto mensual de una tarjeta: corte vigente destacado + calendario de los
 * próximos meses con desglose por compra. Deriva todo de las compras activas;
 * no requiere datos adicionales del backend.
 */
export const CardStatement = ({ card, activePurchases, onPayMonth, paying = false }) => {
  const [expanded, setExpanded] = useState({});

  const schedule = useMemo(() => buildSchedule(activePurchases, card), [activePurchases, card]);
  const current  = schedule[0];
  const future   = schedule.slice(1);
  const maxTotal = useMemo(() => Math.max(...schedule.map(s => s.total), 1), [schedule]);

  if (!current || current.total === 0) return null;

  // El día de corte/pago se ajusta al viernes anterior si cae en fin de semana.
  const cutDate = card ? weekendToFriday(nextOccurrence(card.fechaCorte)) : null;
  const payDate = card ? weekendToFriday(nextOccurrence(card.fechaPago))  : null;
  const daysPago = payDate ? daysUntil(payDate) : null;
  const u = urgencyStyle(daysPago ?? 99);

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const LineRow = ({ line }) => {
    const cat = getCat(line.categoria);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.4rem 0' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <cat.Icon size={13} style={{ color: cat.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {line.descripcion}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Cuota {line.cuotaActual}/{line.numeroCuotas}
            {line.isLast && (
              <span style={{ color: 'var(--color-success)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                · última
              </span>
            )}
          </div>
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
          {fmt(line.valorCuota)}
        </span>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem' }}>

      {/* ── Cabecera tipo estado de cuenta ──────────────────────────── */}
      <div style={{ background: getCardGradient(card?.color), padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FileText size={17} style={{ color: 'rgba(255,255,255,0.85)' }} />
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>Extracto del corte</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{card?.entidad} · {card?.nombre}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Fecha de corte</div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{cutDate ? fmtShort(cutDate) : `Día ${card?.fechaCorte}`}</div>
        </div>
      </div>

      {/* ── Cuerpo del corte vigente ────────────────────────────────── */}
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
              Total a pagar este corte
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {fmt(current.total)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {current.lines.length} compra{current.lines.length !== 1 ? 's' : ''} en este ciclo
            </div>
          </div>

          {/* Chip de vencimiento con semáforo */}
          <div style={{ background: u.bg, border: `1px solid ${u.border}`, borderRadius: 'var(--radius-md)', padding: '0.6rem 0.875rem', minWidth: 150 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <CalendarClock size={13} style={{ color: u.color }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: u.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vence el pago</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: u.color }}>
              {daysPago === 0 ? 'Hoy' : daysPago === 1 ? 'Mañana' : `En ${daysPago} días`}
            </div>
            <div style={{ fontSize: 11, color: u.color, opacity: 0.8 }}>{payDate ? fmtShort(payDate) : `Día ${card?.fechaPago}`}</div>
          </div>
        </div>

        {/* Desglose del corte */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Desglose
          </div>
          {current.lines.map(line => <LineRow key={line.id} line={line} />)}
        </div>

        {onPayMonth && current.lines.length > 0 && (
          <button
            className="btn btn-success"
            style={{ width: '100%', marginTop: '0.875rem' }}
            onClick={onPayMonth}
            disabled={paying}
          >
            <CheckSquare size={14} /> {paying ? 'Registrando…' : `Pagar este corte · ${fmt(current.total)}`}
          </button>
        )}
      </div>

      {/* ── Calendario de meses futuros ─────────────────────────────── */}
      {future.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <CalendarClock size={14} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: 0 }}>Próximos pagos</h3>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{future.length} mes{future.length !== 1 ? 'es' : ''} restante{future.length !== 1 ? 's' : ''}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {future.map(month => {
              const isOpen   = !!expanded[month.key];
              const barWidth = (month.total / maxTotal) * 100;
              const monthName = month.date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

              return (
                <div key={month.key} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <button
                    onClick={() => toggle(month.key)}
                    style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '0.625rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        {isOpen ? <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{monthName}</span>
                        {month.endingCount > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
                            <TrendingDown size={10} /> baja {month.endingCount}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{month.lines.length} compra{month.lines.length !== 1 ? 's' : ''}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmt(month.total)}</span>
                      </div>
                    </div>
                    {/* Mini-barra proporcional */}
                    <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: 4, width: `${barWidth}%`, background: 'var(--color-primary)', opacity: 0.55, borderRadius: 99, transition: 'width 0.4s ease' }} />
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0.25rem 0.875rem 0.625rem', borderTop: '1px solid var(--color-border)' }}>
                      {month.lines.map(line => <LineRow key={line.id} line={line} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
