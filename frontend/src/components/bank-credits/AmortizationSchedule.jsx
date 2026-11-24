import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { fmt, daysUntil, capFirst } from '../../utils/format';
import { buildLoanSchedule } from '../../utils/bankCredit';

const whenText = (d) => d < 0 ? 'Vencida' : d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`;
const shortDate = (d) => d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '').replace(/ de /g, ' ');

export const AmortizationSchedule = ({ credit, onPay, paying = false }) => {
  const [showPaid, setShowPaid] = useState(false);
  const { rows, remaining } = buildLoanSchedule(credit);

  if (remaining.length === 0) return null;

  const pagadas = Number(credit?.cuotasPagadas) || 0;
  const next = remaining[0];
  const days = daysUntil(next.date);
  const capitalPct = next.capital + next.interes > 0 ? (next.capital / (next.capital + next.interes)) * 100 : 0;
  // Fecha de cualquier cuota: se cuenta en meses desde la próxima (las pagadas hacia atrás).
  const dateOf = (k) => new Date(next.date.getFullYear(), next.date.getMonth() + (k - next.k), next.date.getDate());

  const totalIntereses = rows.reduce((a, r) => a + r.interes, 0);
  const totalCapital   = rows.reduce((a, r) => a + r.capital, 0);
  const totalPagado    = rows.slice(0, pagadas).reduce((a, r) => a + r.totalMes, 0);
  // Admin + seguro van dentro de `totalMes`; se totalizan aparte para que la
  // fila Total cuadre con la suma real de la columna Cuota.
  const cargosMes   = (rows[0]?.admin ?? 0) + (rows[0]?.seguro ?? 0);
  const hayCargos   = cargosMes > 0;
  const totalCargos = cargosMes * rows.length;
  const totalCuotas = rows.reduce((a, r) => a + r.totalMes, 0);

  // Se muestran las 4 últimas pagadas; las anteriores quedan plegadas.
  const VISIBLE_PAID = 4;
  const hiddenPaid = Math.max(0, pagadas - VISIBLE_PAID);
  const visibleRows = rows.filter(r => r.k > pagadas || showPaid || r.k > hiddenPaid);

  return (
    <div className="am">
      <div className="am-top">
        <section className="card bc-next" aria-label="Próxima cuota">
          <div className="row-between">
            <p className="text-secondary n" style={{ margin: 0, fontSize: 14 }}>Próxima cuota · {next.k} de {rows.length}</p>
            <span className={`badge badge-${days <= 3 ? 'warning' : 'neutral'}`}>{whenText(days)}</span>
          </div>
          <p className="amount-lg" style={{ margin: '10px 0 4px', fontSize: 36 }}>{fmt(next.totalMes)}</p>
          <p className="text-sm text-secondary" style={{ margin: 0 }}>{capFirst(next.date.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long' }))}</p>
          <div className="bc-split" aria-hidden="true">
            <span style={{ flexGrow: capitalPct, background: 'var(--pos-500)' }} />
            <span style={{ flexGrow: 100 - capitalPct, background: 'var(--cat-2)' }} />
          </div>
          <div className="row-between text-sm text-muted n"><span>Capital {Math.round(capitalPct)} %</span><span>Interés {Math.round(100 - capitalPct)} %</span></div>
          <div className="row-list" style={{ marginTop: 12, borderTop: '1px solid var(--divider)' }}>
            <div className="kv"><span>Capital</span><span>{fmt(next.capital)}</span></div>
            <div className="kv"><span>Interés</span><span>{fmt(next.interes)}</span></div>
            {hayCargos && <div className="kv"><span>Administración y seguro</span><span>{fmt(cargosMes)}</span></div>}
          </div>
          {onPay && (
            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 16 }} onClick={onPay} disabled={paying}>
              {paying ? 'Registrando…' : `Pagar cuota · ${fmt(next.totalMes)}`}
            </button>
          )}
        </section>

        <section className="card am-totals" aria-label="Totales del plan">
          <p className="text-secondary" style={{ margin: '0 0 4px', fontSize: 14 }}>Totales del plan</p>
          <div className="row-list">
            <div className="kv"><span>Cuotas restantes</span><span>{remaining.length} <span className="text-muted" style={{ fontWeight: 400 }}>de {rows.length}</span></span></div>
            <div className="kv"><span>Total capital</span><span>{fmt(totalCapital)}</span></div>
            <div className="kv"><span>Total intereses</span><span>{fmt(totalIntereses)}</span></div>
            {hayCargos && <div className="kv"><span>Total cargos (admin. y seguro)</span><span>{fmt(totalCargos)}</span></div>}
            <div className="kv"><span>Ya pagado</span><span className={totalPagado > 0 ? 'text-success' : ''}>{fmt(totalPagado)}</span></div>
          </div>
          <p className="text-sm text-muted bc-foot">La cuota es fija: cada mes una parte mayor va a capital.</p>
        </section>
      </div>

      <section className="card card-flush" style={{ marginTop: 20 }} aria-labelledby="am-table">
        <div className="card-header">
          <h2 className="card-title" id="am-table">Tabla de amortización</h2>
          <span className="am-legend desktop-flex">
            <span><CheckCircle2 size={14} className="text-success" /> Pagada</span>
            <span><i /> Próxima</span>
            <span className="n">{rows.length} cuotas</span>
          </span>
        </div>
        <div className="table-container">
          <table className="cc-table am-table">
            <thead>
              <tr>
                <th style={{ width: 56, textAlign: 'center' }}>#</th><th>Fecha</th>
                <th className="r">Cuota</th><th className="r desktop-cell">Capital</th><th className="r desktop-cell">Interés</th>
                {hayCargos && <th className="r desktop-cell">Cargos</th>}
                <th className="r">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {hiddenPaid > 0 && (
                <tr className="am-toggle">
                  <td colSpan={hayCargos ? 7 : 6}>
                    <button onClick={() => setShowPaid(v => !v)} aria-expanded={showPaid}>
                      {showPaid ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      {showPaid ? `Ocultar cuotas 1 a ${hiddenPaid}` : `Mostrar cuotas 1 a ${hiddenPaid}`}
                      <span className="text-muted" style={{ fontWeight: 400 }}> · pagadas</span>
                    </button>
                  </td>
                </tr>
              )}
              {visibleRows.map(r => {
                const paid = r.k <= pagadas;
                const isNext = r.k === next.k;
                return (
                  <tr key={r.k} className={paid ? 'paid' : isNext ? 'next' : ''}>
                    <td style={{ textAlign: 'center' }} className="n">{paid ? <CheckCircle2 size={16} className="text-success" aria-label={`Cuota ${r.k} pagada`} /> : <b>{r.k}</b>}</td>
                    <td className="n">{shortDate(dateOf(r.k))} {isNext && <span className="badge badge-primary" style={{ marginLeft: 6 }}>Próxima</span>}</td>
                    <td className="n r" style={{ fontWeight: 600 }}>{fmt(r.totalMes)}</td>
                    <td className="n r desktop-cell">{fmt(r.capital)}</td>
                    <td className="n r desktop-cell">{fmt(r.interes)}</td>
                    {hayCargos && <td className="n r desktop-cell">{fmt(r.admin + r.seguro)}</td>}
                    <td className="n r">{fmt(r.saldo)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}><b>Total</b></td>
                <td className="n r"><b>{fmt(totalCuotas)}</b></td>
                <td className="n r desktop-cell"><b>{fmt(totalCapital)}</b></td>
                <td className="n r desktop-cell"><b>{fmt(totalIntereses)}</b></td>
                {hayCargos && <td className="n r desktop-cell"><b>{fmt(totalCargos)}</b></td>}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};
