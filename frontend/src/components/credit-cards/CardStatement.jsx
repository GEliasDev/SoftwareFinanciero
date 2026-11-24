import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight, Check, CalendarClock } from 'lucide-react';
import {
  fmt, fmtShort, getMovimientoVisual, nextOccurrence, daysUntil, buildSchedule, weekendToFriday,
} from '../../utils/creditCard';
import { capFirst } from '../../utils/format';

const whenText = (d) => d < 0 ? `hace ${-d} día${d === -1 ? '' : 's'}` : d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`;

const LinesTable = ({ lines }) => (
  <>
    <table className="st-lines desktop-table">
      <thead><tr><th>Compra</th><th>Tipo</th><th>Cuota</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
      <tbody>
        {lines.map(line => {
          const vis = getMovimientoVisual(line.tipo, line.categoria);
          return (
            <tr key={`${line.id}-${line.cuotaActual}`} className={line.wasPaid ? 'paid' : ''}>
              <td>{line.descripcion}</td>
              <td className="text-secondary">{line.tipo && line.tipo !== 'compra' ? vis.label : 'Compra'}</td>
              <td className="n">
                {line.cuotaActual} de {line.numeroCuotas}
                {line.isLast && <span className="text-success" style={{ fontWeight: 600 }}> · última</span>}
                {line.wasPaid && <span className="text-muted"> · pagada</span>}
              </td>
              <td className="n" style={{ textAlign: 'right' }}>{fmt(line.valorCuota)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
    <div className="mobile-list">
      {lines.map(line => (
        <div key={`${line.id}-${line.cuotaActual}`} className={`st-mline ${line.wasPaid ? 'paid' : ''}`}>
          <span style={{ minWidth: 0 }}>
            <span className="cell-title">{line.descripcion}</span>
            <span className="cell-sub">Cuota {line.cuotaActual} de {line.numeroCuotas}{line.isLast ? ' · última' : ''}{line.wasPaid ? ' · pagada' : ''}</span>
          </span>
          <span className="n">{fmt(line.valorCuota)}</span>
        </div>
      ))}
    </div>
  </>
);

const AccordionItem = ({
  slot, isCurrent = false, isOpen, onToggle, maxTotal, oldestUnpaidKey, daysPago, payDate, onPayMonth, paying,
}) => {
  const monthName    = capFirst(slot.date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }));
  const pendingLines = slot.lines.filter(l => !l.wasPaid);
  const pendingTotal = pendingLines.reduce((s, l) => s + l.valorCuota, 0);

  // Corte pasado con saldo pendiente: atrasado. El más antiguo de ellos se puede pagar.
  const isOverdue = slot.isPast && pendingLines.length > 0;
  const isPayable = oldestUnpaidKey != null && slot.key === oldestUnpaidKey && pendingLines.length > 0;
  const showPaymentDue = slot.isPaymentDue && pendingLines.length > 0;
  const isPaid = slot.isPast && pendingLines.length === 0;
  const tone = (showPaymentDue || isOverdue) ? 'due' : isCurrent ? 'current' : '';

  return (
    <div className={`st-item ${tone} ${isOpen ? 'open' : ''}`}>
      <button className="st-head" onClick={() => onToggle(slot.key)} aria-expanded={isOpen}>
        {isOpen ? <ChevronDown size={16} className="st-chev" /> : <ChevronRight size={16} className="st-chev" />}
        <span className="st-month">{monthName}</span>
        <span className="st-bar desktop-only"><span style={{ width: `${(slot.total / maxTotal) * 100}%` }} /></span>
        <span className="st-count desktop-only">{slot.lines.length} compra{slot.lines.length !== 1 ? 's' : ''}</span>
        <span className="st-total n">{fmt(slot.total)}</span>
        <span className="st-tag">
          {isPaid && <span className="badge badge-neutral">Pagado</span>}
          {isCurrent && <span className="badge st-badge-current">En curso</span>}
          {(showPaymentDue || isOverdue) && <span className="badge badge-warning">{showPaymentDue ? 'Pago pendiente' : 'Atrasado'}</span>}
          {!isPaid && !isCurrent && !showPaymentDue && !isOverdue && slot.endingCount > 0 && (
            <span className="badge badge-success desktop-only">{slot.endingCount === 1 ? 'Termina 1 compra' : `Terminan ${slot.endingCount}`}</span>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="st-body">
          {slot.endingCount > 0 && (
            <span className="badge badge-success" style={{ marginBottom: 8 }}>
              {slot.endingCount === 1 ? 'Termina 1 compra' : `Terminan ${slot.endingCount} compras`}
            </span>
          )}
          <LinesTable lines={slot.lines} />

          {isPayable && (
            <div className="st-pay">
              <span className="row" style={{ gap: 8, flex: 1, minWidth: 0 }}>
                <CalendarClock size={16} className="text-muted" />
                <span className="text-sm text-secondary">
                  {slot.isCurrent ? 'Corte en curso (puedes pagar por adelantado)'
                    : showPaymentDue ? <>Vence el pago: <b className="text-warning">{whenText(daysPago)}</b>{payDate ? ` · ${fmtShort(payDate)}` : ''}</>
                    : <><b className="text-warning">Pago atrasado</b> del corte de {monthName}</>}
                </span>
              </span>
              {onPayMonth && (
                <button className="btn btn-primary" onClick={onPayMonth} disabled={paying}>
                  <Check size={16} /> {paying ? 'Registrando…' : `Pagar este corte · ${fmt(pendingTotal)}`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CardStatement = ({ card, purchases, onPayMonth, paying = false }) => {
  // Un solo cómputo del calendario; todo lo demás se deriva de él.
  const schedule = useMemo(() => buildSchedule(purchases, card), [purchases, card]);
  const past     = useMemo(() => schedule.filter(s => s.isPast),              [schedule]);
  const current  = useMemo(() => schedule.find(s => s.isCurrent),             [schedule]);
  const future   = useMemo(() => schedule.filter(s => !s.isPast && !s.isCurrent), [schedule]);
  const maxTotal = useMemo(() => Math.max(...schedule.map(s => s.total), 1),  [schedule]);

  // Corte más antiguo con saldo pendiente para realizar pagos (solo de cortes cerrados en el pasado)
  const oldestUnpaid = useMemo(() => schedule.find(s => s.isPast && s.lines.some(l => !l.wasPaid)), [schedule]);

  const payDate  = card ? weekendToFriday(nextOccurrence(card.fechaPago))  : null;
  const cutDate  = card ? weekendToFriday(nextOccurrence(card.fechaCorte)) : null;
  const daysPago = payDate ? daysUntil(payDate) : null;
  const daysCut  = cutDate ? daysUntil(cutDate) : null;

  // Abrir por defecto SOLO un corte: el más antiguo con pago pendiente
  // (vencido o en ventana de pago); si ya está todo pagado, el corte vigente.
  const [expanded, setExpanded] = useState(() => {
    const target = oldestUnpaid ?? schedule.find(s => s.isCurrent);
    return target ? { [target.key]: true } : {};
  });
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // Historial: los cortes con saldo pendiente siempre se muestran; de los ya
  // pagados se ven los 3 más recientes y el resto queda detrás de "Ver más extractos".
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showAllFuture, setShowAllFuture] = useState(false);

  const hasData = (current && current.total > 0) || past.length > 0 || future.length > 0;
  if (!hasData) return null;

  const HISTORY_VISIBLE_PAID = 3;
  const FUTURE_VISIBLE = 4;
  const hiddenPaidCount = past.filter((slot, idx) => !slot.lines.some(l => !l.wasPaid) && idx < past.length - HISTORY_VISIBLE_PAID).length;
  const visiblePast = showAllHistory
    ? past
    : past.filter((slot, idx) => slot.lines.some(l => !l.wasPaid) || idx >= past.length - HISTORY_VISIBLE_PAID);
  const visibleFuture = showAllFuture ? future : future.slice(0, FUTURE_VISIBLE);

  const accordionProps = { maxTotal, oldestUnpaidKey: oldestUnpaid?.key ?? null, daysPago, payDate, onPayMonth, paying };

  return (
    <section className="card card-flush st">
      <div className="card-header st-header">
        <div>
          <h2 className="card-title">Extracto por corte</h2>
          <p className="card-subtitle">Cuotas facturadas en cada corte de {card?.nombre}</p>
        </div>
        <div className="st-dates">
          <div><span>Próximo corte</span><b className="n">{cutDate ? fmtShort(cutDate) : `Día ${card?.fechaCorte}`}</b>{daysCut !== null && <span className="n"> · {daysCut} días</span>}</div>
          <div><span>Próximo pago</span><b className="n">{payDate ? fmtShort(payDate) : `Día ${card?.fechaPago}`}</b>{daysPago !== null && <span className={`n ${daysPago <= 3 ? 'text-warning' : ''}`}> · {daysPago} días</span>}</div>
        </div>
      </div>

      <div className="st-sections">
        {past.length > 0 && (
          <div>
            <div className="st-label"><span>Historial</span><span>{visiblePast.length < past.length ? `${visiblePast.length} de ${past.length} cortes` : `${past.length} corte${past.length !== 1 ? 's' : ''}`}</span></div>
            <div className="st-list">
              {visiblePast.map(slot => <AccordionItem key={slot.key} slot={slot} isOpen={!!expanded[slot.key]} onToggle={toggle} {...accordionProps} />)}
            </div>
            {hiddenPaidCount > 0 && (
              <button className="st-more" onClick={() => setShowAllHistory(v => !v)}>
                {showAllHistory ? <>Ocultar extractos anteriores <ChevronUp size={16} /></> : <>Ver más extractos ({hiddenPaidCount}) <ChevronDown size={16} /></>}
              </button>
            )}
          </div>
        )}

        {current && current.total > 0 && (
          <div>
            <div className="st-label"><span>Próximo corte</span></div>
            <AccordionItem slot={current} isCurrent isOpen={!!expanded[current.key]} onToggle={toggle} {...accordionProps} />
          </div>
        )}

        {future.length > 0 && (
          <div>
            <div className="st-label"><span>Próximos pagos</span><span>{future.length} mes{future.length !== 1 ? 'es' : ''}</span></div>
            <div className="st-list">
              {visibleFuture.map(slot => <AccordionItem key={slot.key} slot={slot} isOpen={!!expanded[slot.key]} onToggle={toggle} {...accordionProps} />)}
            </div>
            {future.length > FUTURE_VISIBLE && (
              <button className="st-more" onClick={() => setShowAllFuture(v => !v)}>
                {showAllFuture ? <>Ver menos <ChevronUp size={16} /></> : <>Ver los {future.length} meses <ChevronDown size={16} /></>}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
