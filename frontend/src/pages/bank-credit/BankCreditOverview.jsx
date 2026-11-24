import { Link, useOutletContext } from 'react-router-dom';
import { fmt, fmtDateLong, nextOccurrence, daysUntil, capFirst } from '../../utils/format';
import { buildLoanSchedule } from '../../utils/bankCredit';

const TIPO_LABEL = {
  libre_inversion: 'Libre inversión',
  consumo: 'Consumo',
  libranza: 'Libranza',
  vehiculo: 'Vehículo',
  hipotecario: 'Hipotecario',
  fintech: 'Fintech',
  otro: 'Otro',
};

const pctFmt = (n, d = 2) => `${Number(n).toLocaleString('es-CO', { maximumFractionDigits: d })} %`;
const whenText = (d) => d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`;

const Info = ({ label, value }) => (
  <div className="bc-info-item"><span>{label}</span><b>{value}</b></div>
);

export const BankCreditOverview = () => {
  const { credit, handlePay, paying } = useOutletContext();
  const n = Number(credit?.numeroCuotas) || 0;
  const pagadas = Number(credit?.cuotasPagadas) || 0;
  const pct = n ? (pagadas / n) * 100 : 0;
  const seguro = parseFloat(credit?.seguro ?? 0);
  const admin = parseFloat(credit?.cuotaAdministracion ?? 0);
  const tasaMensualPct = parseFloat(credit?.tasaMensual ?? 0) * 100; // se persiste como fracción
  const tasaEA = (Math.pow(1 + tasaMensualPct / 100, 12) - 1) * 100;
  const active = credit?.status === 'activo' && pagadas < n;

  const { remaining } = buildLoanSchedule(credit);
  const next = remaining[0];
  const nextDate = active ? nextOccurrence(credit.diaPago) : null;
  const days = nextDate ? daysUntil(nextDate) : null;
  const capShare = next ? (next.capital / (next.capital + next.interes || 1)) * 100 : 0;
  const fin = active ? credit?.fechaFin : null;

  return (
    <div className="bc-ov">
      <div className="bc-grid">
        <section className="card bc-balance" aria-label="Saldo pendiente">
          <p className="text-secondary" style={{ margin: 0, fontSize: 14 }}>Saldo pendiente</p>
          <p className="amount-lg" style={{ margin: '10px 0 4px', fontSize: 36 }}>{fmt(credit?.saldoPendiente)}</p>
          <p className="text-sm text-secondary n" style={{ margin: 0 }}>de {fmt(credit?.montoTotal)} prestados</p>
          <div className="row-between text-sm" style={{ marginTop: 20 }}><span>Cuotas pagadas</span><span className="n"><b>{pagadas}</b> de {n}</span></div>
          <div className="progress-track" style={{ margin: '8px 0 6px' }}><div className="progress-fill" style={{ transform: `scaleX(${pct / 100})` }} /></div>
          <div className="row-between text-sm text-muted n"><span>{Math.round(pct)} % completado</span><span>{n - pagadas} cuotas restantes</span></div>
          {fin && <p className="text-sm text-secondary bc-foot">Terminas de pagar el {fmtDateLong(fin)}.</p>}
        </section>

        <section className="card bc-next" aria-label="Próxima cuota">
          {active && next ? (
            <>
              <div className="row-between">
                <p className="text-secondary n" style={{ margin: 0, fontSize: 14 }}>Próxima cuota · {pagadas + 1} de {n}</p>
                {days !== null && <span className={`badge badge-${days <= 3 ? 'warning' : 'neutral'}`}>{whenText(days)}</span>}
              </div>
              <p className="amount-lg" style={{ margin: '10px 0 4px', fontSize: 36 }}>{fmt(credit.valorCuota)}</p>
              {nextDate && <p className="text-sm text-secondary" style={{ margin: 0 }}>{capFirst(nextDate.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long' }))}</p>}
              <div className="bc-split" aria-hidden="true">
                <span style={{ flexGrow: capShare, background: 'var(--pos-500)' }} />
                <span style={{ flexGrow: 100 - capShare, background: 'var(--cat-2)' }} />
              </div>
              <div className="row-between text-sm text-muted n"><span>Capital {Math.round(capShare)} %</span><span>Interés {Math.round(100 - capShare)} %</span></div>
              <div className="row-list" style={{ marginTop: 12, borderTop: '1px solid var(--divider)' }}>
                <div className="kv"><span>Capital</span><span>{fmt(next.capital)}</span></div>
                <div className="kv"><span>Interés</span><span>{fmt(next.interes)}</span></div>
                {(admin + seguro) > 0 && <div className="kv"><span>Administración y seguro</span><span>{fmt(admin + seguro)}</span></div>}
              </div>
              <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 16 }} onClick={handlePay} disabled={paying}>
                {paying ? 'Registrando…' : `Pagar cuota · ${fmt(credit.valorCuota)}`}
              </button>
            </>
          ) : (
            <>
              <p className="text-secondary" style={{ margin: 0, fontSize: 14 }}>Próxima cuota</p>
              <p className="amount-lg" style={{ margin: '10px 0 4px', color: 'var(--pos-600)' }}>Sin cuotas pendientes</p>
              <p className="text-sm text-secondary" style={{ margin: 0 }}>Este crédito está {credit?.status === 'pagado' ? 'pagado' : 'inactivo'}.</p>
            </>
          )}
        </section>

        <section className="card bc-cost desktop-only" aria-label="Costo del crédito">
          <p className="text-secondary" style={{ margin: '0 0 4px', fontSize: 14 }}>Costo del crédito</p>
          <div className="row-list">
            <div className="cc-date-row"><div><span>Intereses totales</span><b className="n" style={{ fontSize: 20 }}>{fmt(credit?.totalIntereses)}</b></div></div>
            <div className="cc-date-row"><div><span>Tasa de interés</span><b className="n">{pctFmt(tasaMensualPct)} M.V.</b></div><span className="n">{pctFmt(tasaEA, 1)} E.A.</span></div>
            <div className="cc-date-row"><div><span>Total a pagar</span><b className="n">{fmt(credit?.totalAPagar)}</b></div><span className="n">{n} × {fmt(credit?.valorCuota)}</span></div>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }} aria-labelledby="bc-details">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <h2 className="card-title" id="bc-details">Detalles del crédito</h2>
          <Link to={`/bank-credits/${credit?.id}/edit`} className="link-sm">Editar datos</Link>
        </div>
        <div className="bc-info">
          <Info label="Entidad" value={credit?.entidad} />
          <Info label="Tipo de crédito" value={TIPO_LABEL[credit?.tipoCredito] ?? 'Otro'} />
          {credit?.numeroReferencia && <Info label="N.° referencia" value={credit.numeroReferencia} />}
          <Info label="Día de pago" value={`Día ${credit?.diaPago} de cada mes`} />
          <Info label="Monto original" value={fmt(credit?.montoTotal)} />
          <Info label="Total a pagar" value={fmt(credit?.totalAPagar)} />
          <Info label="Tipo de tasa" value={credit?.tipoTasa === 'mensual' ? 'Mensual (M.V.)' : 'Anual (E.A.)'} />
          <Info label="Tasa de interés" value={pctFmt(credit?.tasaInteres)} />
          <Info label="Tasa mensual" value={pctFmt(tasaMensualPct)} />
          {admin > 0 && <Info label="Cuota administración" value={fmt(admin)} />}
          {seguro > 0 && <Info label="Seguro mensual" value={fmt(seguro)} />}
          <Info label="Fecha de inicio" value={fmtDateLong(credit?.fechaInicio)} />
          <Info label="Fecha fin estimada" value={fmtDateLong(credit?.fechaFin)} />
        </div>
      </section>
    </div>
  );
};
