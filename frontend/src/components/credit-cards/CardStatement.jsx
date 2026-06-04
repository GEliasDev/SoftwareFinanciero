import { useMemo, useState } from 'react';
import {
  FileText, CalendarClock, ChevronDown, ChevronRight, CheckSquare, TrendingDown,
} from 'lucide-react';
import { getCardGradient } from '../../utils/cardColors';
import {
  fmt, fmtShort, getMovimientoVisual, nextOccurrence, daysUntil, urgencyStyle, buildSchedule, weekendToFriday,
} from '../../utils/creditCard';

export const CardStatement = ({ card, purchases, onPayMonth, paying = false }) => {
  const schedule = useMemo(() => buildSchedule(purchases, card), [purchases, card]);
  const past     = useMemo(() => schedule.filter(s => s.isPast),              [schedule]);
  const current  = useMemo(() => schedule.find(s => s.isCurrent),             [schedule]);
  const future   = useMemo(() => schedule.filter(s => !s.isPast && !s.isCurrent), [schedule]);
  const maxTotal = useMemo(() => Math.max(...schedule.map(s => s.total), 1),  [schedule]);

  // Corte más antiguo con saldo pendiente para realizar pagos (solo de cortes cerrados en el pasado)
  const oldestUnpaid = useMemo(() => {
    return schedule.find(s => s.isPast && s.lines.some(l => !l.wasPaid));
  }, [schedule]);

  const payDate  = card ? weekendToFriday(nextOccurrence(card.fechaPago))  : null;
  const cutDate  = card ? weekendToFriday(nextOccurrence(card.fechaCorte)) : null;
  const daysPago = payDate ? daysUntil(payDate) : null;
  const u        = urgencyStyle(daysPago ?? 99);

  // Abrir por defecto: corte vigente (próximo) + corte con pago pendiente (si existe)
  const [expanded, setExpanded] = useState(() => {
    const init = {};
    buildSchedule(purchases ?? [], card).forEach(s => {
      if (s.isCurrent || s.isPaymentDue) init[s.key] = true;
    });
    return init;
  });

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const hasData = (current && current.total > 0) || past.length > 0 || future.length > 0;
  if (!hasData) return null;

  const LineRow = ({ line }) => {
    const vis = getMovimientoVisual(line.tipo, line.categoria);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.4rem 0', opacity: line.wasPaid ? 0.55 : 1 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `${vis.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <vis.Icon size={13} style={{ color: vis.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {line.descripcion}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {line.tipo && line.tipo !== 'compra' && (
              <span style={{ fontWeight: 700, color: vis.color }}>{vis.label} · </span>
            )}
            Cuota {line.cuotaActual}/{line.numeroCuotas}
            {line.isLast && <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>· última</span>}
            {line.wasPaid && <span style={{ fontWeight: 600 }}>· pagada</span>}
          </div>
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: line.wasPaid ? 'var(--color-text-muted)' : 'var(--color-text-secondary)', flexShrink: 0 }}>
          {fmt(line.valorCuota)}
        </span>
      </div>
    );
  };

  const AccordionItem = ({ slot, isCurrent = false }) => {
    const isOpen       = !!expanded[slot.key];
    const barWidth     = (slot.total / maxTotal) * 100;
    const monthName    = slot.date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    const pendingLines = slot.lines.filter(l => !l.wasPaid);
    const pendingTotal = pendingLines.reduce((s, l) => s + l.valorCuota, 0);

    // Si es un corte pasado y aún tiene saldo pendiente, está atrasado
    const isOverdue = slot.isPast && pendingLines.length > 0;

    // Si es el corte más antiguo con saldo pendiente, se habilita para pago
    const isPayable = oldestUnpaid && slot.key === oldestUnpaid.key && pendingLines.length > 0;

    // showPaymentDue: para alertas visuales si corresponde a la ventana de pago pendiente
    const showPaymentDue = slot.isPaymentDue && pendingLines.length > 0;

    // showPaymentDue o isOverdue: corte vencido/atrasado → colores de urgencia
    // isCurrent: próximo corte (aún no ha cortado) → índigo neutro
    const accentColor  = (showPaymentDue || isOverdue) ? u.color
                       : isCurrent                      ? 'var(--brand-600)'
                       :                                  'var(--color-primary)';
    const accentBg     = (showPaymentDue || isOverdue) ? u.bg
                       : isCurrent                      ? 'var(--color-primary-light)'
                       :                                  'transparent';
    const accentBorder = (showPaymentDue || isOverdue || isCurrent) && isOpen
                       ? ((showPaymentDue || isOverdue) ? u.border : 'rgba(91,77,241,0.2)')
                       : 'var(--color-border)';

    return (
      <div style={{
        border: `1px solid ${accentBorder}`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: accentBg,
        transition: 'border-color 0.2s',
      }}>
        {/* Cabecera colapsable */}
        <button
          onClick={() => toggle(slot.key)}
          style={{
            width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', padding: '0.625rem 0.875rem',
            display: 'flex', flexDirection: 'column', gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            {/* Izquierda */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
              {isOpen
                ? <ChevronDown  size={14} style={{ color: accentColor, flexShrink: 0 }} />
                : <ChevronRight size={14} style={{ color: (showPaymentDue || isOverdue || isCurrent) ? accentColor : 'var(--color-text-muted)', flexShrink: 0 }} />
              }
              <span style={{ fontSize: 13, fontWeight: 700, color: (showPaymentDue || isOverdue || isCurrent) ? accentColor : 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                {monthName}
              </span>
              {isCurrent && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
                  background: 'var(--brand-600)', color: 'white', padding: '1px 6px', borderRadius: 99, flexShrink: 0,
                }}>Próximo</span>
              )}
              {(showPaymentDue || isOverdue) && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
                  background: u.color, color: 'white', padding: '1px 6px', borderRadius: 99, flexShrink: 0,
                }}>{isOverdue ? 'Atrasado' : 'Pago pendiente'}</span>
              )}
              {slot.endingCount > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, flexShrink: 0 }}>
                  <TrendingDown size={10} /> {slot.endingCount === 1 ? 'Termina 1 compra' : `Terminan ${slot.endingCount} compras`}
                </span>
              )}
            </div>

            {/* Derecha */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {slot.lines.length} compra{slot.lines.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: (showPaymentDue || isCurrent) ? accentColor : 'var(--color-text-primary)' }}>
                {fmt(slot.total)}
              </span>
              {/* Chip de urgencia visible al colapsar el corte con pago pendiente */}
              {showPaymentDue && !isOpen && daysPago !== null && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: u.color,
                  background: u.bg, border: `1px solid ${u.border}`,
                  borderRadius: 'var(--radius-sm)', padding: '2px 7px', flexShrink: 0,
                }}>
                  {daysPago === 0 ? 'Hoy' : daysPago === 1 ? 'Mañana' : `${daysPago}d`}
                </span>
              )}
            </div>
          </div>

          {/* Barra proporcional */}
          <div style={{ height: 3, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden', marginLeft: 22 }}>
            <div style={{
              height: 3, width: `${barWidth}%`,
              background: accentColor,
              opacity: (showPaymentDue || isCurrent) ? 0.65 : 0.45,
              borderRadius: 99, transition: 'width 0.4s ease',
            }} />
          </div>
        </button>

        {/* Contenido expandido */}
        {isOpen && (
          <div style={{ padding: '0.25rem 0.875rem 0.75rem', borderTop: `1px solid ${(showPaymentDue || isOverdue) ? u.border : 'var(--color-border)'}` }}>
            {slot.lines.map(line => (
              <LineRow key={`${line.id}-${line.cuotaActual}`} line={line} />
            ))}

            {/* Urgencia + botón pagar — corte activo y pagable */}
            {isPayable && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: slot.isCurrent ? 'var(--color-primary-light)' : u.bg,
                  border: `1px solid ${slot.isCurrent ? 'rgba(91,77,241,0.2)' : u.border}`,
                  borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem',
                }}>
                  <CalendarClock size={13} style={{ color: slot.isCurrent ? 'var(--brand-600)' : u.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: slot.isCurrent ? 'var(--brand-700)' : u.color }}>
                    {slot.isCurrent ? (
                      <span>Corte en curso (puedes pre-pagar este ciclo)</span>
                    ) : showPaymentDue ? (
                      <span>
                        Vence el pago:{' '}
                        <strong>
                          {daysPago === 0 ? 'Hoy' : daysPago === 1 ? 'Mañana' : `En ${daysPago} días`}
                        </strong>
                        {payDate && ` · ${fmtShort(payDate)}`}
                      </span>
                    ) : (
                      <span>
                        <strong>Pago atrasado</strong> (Corresponde al corte vencido de {monthName})
                      </span>
                    )}
                  </span>
                </div>
                {onPayMonth && (
                  <button
                    className="btn btn-success"
                    style={{ width: '100%' }}
                    onClick={onPayMonth}
                    disabled={paying}
                  >
                    <CheckSquare size={14} />
                    {paying ? 'Registrando…' : `Pagar este corte · ${fmt(pendingTotal)}`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const SectionLabel = ({ children, extra }) => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}
      </span>
      {extra && (
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{extra}</span>
      )}
    </div>
  );

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem' }}>

      {/* Cabecera gradiente */}
      <div style={{ background: getCardGradient(card?.color), padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FileText size={17} style={{ color: 'rgba(255,255,255,0.85)' }} />
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>Extracto</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{card?.entidad} · {card?.nombre}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Fecha de corte</div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>
            {cutDate ? fmtShort(cutDate) : `Día ${card?.fechaCorte}`}
          </div>
        </div>
      </div>

      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Historial de cortes — orden cronológico (mar, abr, may…) */}
        {past.length > 0 && (
          <div>
            <SectionLabel extra={`${past.length} corte${past.length !== 1 ? 's' : ''}`}>
              Historial
            </SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {past.map(slot => <AccordionItem key={slot.key} slot={slot} />)}
            </div>
          </div>
        )}

        {/* Próximo corte (aún no ha cortado) */}
        {current && current.total > 0 && (
          <div>
            <SectionLabel>Próximo corte</SectionLabel>
            <AccordionItem slot={current} isCurrent />
          </div>
        )}

        {/* Próximos pagos */}
        {future.length > 0 && (
          <div>
            <SectionLabel extra={`${future.length} mes${future.length !== 1 ? 'es' : ''}`}>
              Próximos pagos
            </SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {future.map(slot => <AccordionItem key={slot.key} slot={slot} />)}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
