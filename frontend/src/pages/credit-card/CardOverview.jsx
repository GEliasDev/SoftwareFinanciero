import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { getCardColor } from '../../utils/cardColors';
import { fmt, fmtShort, parseLocalDate } from '../../utils/format';
import { getMovimientoVisual } from '../../utils/creditCard';
import { TASA_USURA_EA } from './CreditCardLayout';

const dueText = (d) => d < 0 ? `Venció hace ${-d} día${d === -1 ? '' : 's'}` : d === 0 ? 'Vence hoy' : d === 1 ? 'Vence mañana' : `Vence en ${d} días`;
const dueTone = (d) => d <= 1 ? 'danger' : d <= 3 ? 'warning' : 'neutral';
const fmtPct = (n) => `${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`;

export const CardOverview = () => {
  const navigate = useNavigate();
  const {
    card, id, activePurchases, monthlyObligation, cupoUsado, usagePct, tasaEA, isHighRate,
    nextCorte, nextPago, daysCorte, daysPago,
    totalCapital, totalConIntereses, totalYaPagado, totalRestante, maxMesesRestantes,
    payableTotal, payableLines, handlePayAll,
  } = useOutletContext();

  // Lo que se paga ahora: el corte cerrado pendiente o, si no hay, lo que va facturado del corte vigente.
  const hasPayable = payableTotal > 0;
  const corteAmount = hasPayable ? payableTotal : monthlyObligation;
  const corteCount = hasPayable ? payableLines.filter(l => !l.isCommission).length : activePurchases.length;
  const finDeuda = maxMesesRestantes > 0
    ? new Date(new Date().getFullYear(), new Date().getMonth() + maxMesesRestantes, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    : null;

  const pendientes = [...activePurchases]
    .filter(p => Number(p.numeroCuotas) > Number(p.cuotasPagadas))
    .sort((a, b) => b.fechaCompra.localeCompare(a.fechaCompra));

  return (
    <div className="cc-ov">
      {hasPayable && daysPago !== null && daysPago <= 5 && (
        <div className={`notice ${daysPago <= 3 ? 'warn' : 'info'}`}>
          <AlertTriangle size={18} />
          <span style={{ flex: 1 }}><b>El pago {daysPago < 0 ? 'está vencido' : daysPago === 0 ? 'vence hoy' : `vence en ${daysPago} día${daysPago !== 1 ? 's' : ''}`}.</b> Si pagas el total del corte evitas intereses de mora.</span>
          <Link to={`/credit-cards/${id}/statement`} className="link-sm desktop-only" style={{ color: 'inherit' }}>Ver extracto</Link>
        </div>
      )}
      {usagePct >= 75 && (
        <div className="notice warn">
          <AlertTriangle size={18} />
          <span><b>Cupo al {usagePct.toFixed(0)} %.</b> Evita nuevas compras para no afectar tu salud financiera.</span>
        </div>
      )}
      {isHighRate && (
        <div className="notice warn">
          <AlertTriangle size={18} />
          <span><b>Tasa alta:</b> {tasaEA} % E.A., por encima de la tasa de usura de referencia ({TASA_USURA_EA} % E.A.). Verifica con tu banco.</span>
        </div>
      )}

      <div className="cc-ov-grid">
        {/* Tarjeta + cupo */}
        <section className="card cc-ov-card" aria-label="Cupo">
          <div className="cc-visual" style={{ background: getCardColor(card?.color) }}>
            <div className="row-between"><span className="cc-visual-bank">{card?.entidad?.toUpperCase()}</span></div>
            <div>
              <span className="cc-visual-label">Cupo disponible</span>
              <span className="cc-visual-amount n">{fmt(card?.cupoDisponible ?? card?.cupoTotal)}</span>
            </div>
            <div className="cc-visual-mobile-bar mobile-only">
              <div className="cc-visual-track"><div style={{ width: `${Math.min(usagePct, 100)}%` }} /></div>
              <div className="row-between"><span>Usado {fmt(cupoUsado)} · {Math.round(usagePct)} %</span><span>de {fmt(card?.cupoTotal)}</span></div>
            </div>
            <span className="cc-visual-num n desktop-only">{card?.ultimos4 ? `•••• •••• •••• ${card.ultimos4}` : ''}</span>
          </div>
          <div className="desktop-only" style={{ marginTop: 16 }}>
            <div className="row-between text-sm">
              <span className="text-secondary">Cupo usado</span>
              <span className="n"><b>{fmt(cupoUsado)}</b> <span className="text-secondary">de {fmt(card?.cupoTotal)}</span></span>
            </div>
            <div className="progress-track" style={{ margin: '8px 0 6px' }}>
              <div className="progress-fill" style={{ transform: `scaleX(${Math.min(usagePct, 100) / 100})`, background: 'var(--cat-1)' }} />
            </div>
            <span className="text-sm text-muted n">{Math.round(usagePct)} % del cupo</span>
          </div>
        </section>

        {/* Pago de este corte */}
        <section className="card cc-ov-pay" aria-label="Pago de este corte">
          <div className="row-between">
            <p className="text-secondary" style={{ margin: 0, fontSize: 14 }}>Pago de este corte</p>
            {corteAmount > 0 && hasPayable && daysPago !== null && (
              <span className={`badge badge-${dueTone(daysPago)} mobile-only`}>{dueText(daysPago)}</span>
            )}
          </div>
          {corteAmount > 0 ? (
            <>
              <p className="amount-lg cc-ov-amount">{fmt(corteAmount)}</p>
              <p className="row text-sm text-secondary desktop-flex" style={{ gap: 8, margin: 0 }}>
                {hasPayable && daysPago !== null && <span className={`badge badge-${dueTone(daysPago)}`}>{dueText(daysPago)}</span>}
                {!hasPayable && <span>Se factura en el corte del {nextCorte ? fmtShort(nextCorte) : '—'} ·</span>}
                {nextPago && <span>paga el {nextPago.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}</span>}
              </p>
              <div className="cc-ov-kv desktop-only">
                <div className="kv"><span>Cuotas incluidas</span><span>{corteCount} compra{corteCount !== 1 ? 's' : ''}</span></div>
                {card?.pagoMinimo ? <div className="kv"><span>Pago mínimo</span><span>{fmt(card.pagoMinimo)}</span></div> : null}
              </div>
              {card?.pagoMinimo ? <span className="text-sm text-secondary mobile-only n" style={{ textAlign: 'right', marginTop: -28 }}>Mínimo {fmt(card.pagoMinimo)}</span> : null}
              <button className="btn btn-primary btn-lg btn-block cc-ov-btn" onClick={handlePayAll} disabled={!hasPayable}>
                Registrar pago del corte
              </button>
              {!hasPayable && <p className="form-hint" style={{ textAlign: 'center', margin: '8px 0 0' }}>Se habilita cuando cierre el corte del {nextCorte ? fmtShort(nextCorte) : '—'}.</p>}
            </>
          ) : (
            <>
              <p className="amount-lg cc-ov-amount" style={{ color: 'var(--pos-600)' }}>Al día</p>
              <p className="text-sm text-secondary" style={{ margin: 0 }}>No tienes cuotas pendientes en esta tarjeta.</p>
            </>
          )}
        </section>

        {/* Fechas y tasa */}
        <section className="card cc-ov-dates desktop-only" aria-label="Fechas y tasa">
          <p className="text-secondary" style={{ margin: '0 0 4px', fontSize: 14 }}>Fechas y tasa</p>
          <div className="row-list">
            <div className="cc-date-row">
              <div><span>Próximo pago</span><b>{nextPago ? fmtShort(nextPago) : '—'}</b></div>
              {daysPago !== null && <span className={daysPago <= 3 ? 'text-warning' : ''} style={{ fontWeight: daysPago <= 3 ? 600 : 400 }}>{daysPago === 0 ? 'hoy' : `${daysPago} días`}</span>}
            </div>
            <div className="cc-date-row">
              <div><span>Próximo corte</span><b>{nextCorte ? fmtShort(nextCorte) : '—'}</b></div>
              {daysCorte !== null && <span>{daysCorte === 0 ? 'hoy' : `${daysCorte} días`}</span>}
            </div>
            <div className="cc-date-row">
              <div><span>Tasa de interés</span><b className="n">{fmtPct(card?.tasaInteresMensual)} M.V.</b></div>
              <span className="n">{String(tasaEA).replace('.', ',')} % E.A.</span>
            </div>
          </div>
        </section>
      </div>

      <div className="cc-ov-bottom">
        {/* Compras con cuotas pendientes */}
        <section className="card card-flush" aria-labelledby="cc-pend">
          <div className="card-header">
            <h2 className="card-title" id="cc-pend">Compras con cuotas pendientes</h2>
            <Link to={`/credit-cards/${id}/purchases`} className="link-sm">Ver las {activePurchases.length}</Link>
          </div>
          {pendientes.length === 0 ? (
            <p className="card-empty">No hay compras con cuotas pendientes.</p>
          ) : (
            <>
              <table className="cc-table desktop-table">
                <thead><tr><th>Compra</th><th>Categoría</th><th>Cuotas</th><th style={{ textAlign: 'right' }}>Cuota</th><th style={{ textAlign: 'right' }}>Saldo</th></tr></thead>
                <tbody>
                  {pendientes.slice(0, 8).map(p => {
                    const pag = Number(p.cuotasPagadas), tot = Number(p.numeroCuotas);
                    const saldo = (tot - pag) * parseFloat(p.valorCuotaMensual ?? 0);
                    const vis = getMovimientoVisual(p.tipo, p.categoria || 'otros');
                    return (
                      <tr key={p.id} className="clickable" onClick={() => navigate(`/credit-cards/${id}/purchases/${p.id}`)}>
                        <td>
                          <span className="cell-title">{p.descripcion}</span>
                          <span className="cell-sub">{fmtShort(parseLocalDate(p.fechaCompra))}{p.commission ? ' · incluye comisión' : ''}</span>
                        </td>
                        <td className="text-secondary">{vis.label}</td>
                        <td style={{ width: 120 }}>
                          <span className="n text-sm">{pag} de {tot}</span>
                          <div className="progress-track" style={{ height: 4, marginTop: 6, width: 72 }}>
                            <div className="progress-fill" style={{ transform: `scaleX(${tot ? pag / tot : 0})` }} />
                          </div>
                        </td>
                        <td className="n" style={{ textAlign: 'right' }}>{fmt(p.valorCuotaMensual)}</td>
                        <td className="n" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(saldo)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mobile-list row-list">
                {pendientes.slice(0, 6).map(p => (
                  <Link key={p.id} to={`/credit-cards/${id}/purchases/${p.id}`} className="pay-row" style={{ padding: '12px 16px' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="cell-title">{p.descripcion}</span>
                      <span className="cell-sub">{getMovimientoVisual(p.tipo, p.categoria || 'otros').label} · {p.cuotasPagadas} de {p.numeroCuotas} cuotas</span>
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <b className="n" style={{ display: 'block' }}>{fmt(p.valorCuotaMensual)}</b>
                      <span className="cell-sub">por mes</span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Resumen de deuda */}
        {activePurchases.length > 0 && (
          <section className="card cc-debt" aria-labelledby="cc-debt">
            <h2 className="card-title" id="cc-debt" style={{ marginBottom: 8 }}>Resumen de deuda</h2>
            <div className="row-list">
              <div className="kv"><span>Capital</span><span>{fmt(totalCapital)}</span></div>
              <div className="kv"><span>Intereses</span><span>{fmt(totalConIntereses - totalCapital)}</span></div>
              <div className="kv"><span>Total con intereses</span><span>{fmt(totalConIntereses)}</span></div>
              <div className="kv"><span>Ya pagado</span><span className={totalYaPagado > 0 ? "text-success" : ""}>{totalYaPagado > 0 ? "−" : ""}{fmt(totalYaPagado)}</span></div>
            </div>
            <div className="row-between cc-debt-total">
              <b>Saldo pendiente</b>
              <span className="amount-lg" style={{ fontSize: 24 }}>{fmt(totalRestante)}</span>
            </div>
            {finDeuda && <p className="text-sm text-secondary" style={{ margin: '8px 0 0' }}>Terminas de pagar en {finDeuda} si no haces compras nuevas.</p>}
            <Link to={`/credit-cards/${id}/statement`} className="link-sm row" style={{ marginTop: 16, gap: 4 }}>Ver extracto por meses <ChevronRight size={16} /></Link>
          </section>
        )}
      </div>
    </div>
  );
};
