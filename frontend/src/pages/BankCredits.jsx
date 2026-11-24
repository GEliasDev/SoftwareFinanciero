import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BankCreditService } from '../services/bankCreditService';
import { Plus, Landmark, ChevronRight } from 'lucide-react';
import { LoadError } from '../components/ui/LoadError';
import { fmt, fmtShort, nextOccurrence, daysUntil } from '../utils/format';

const STATUS = {
  activo:    { label: 'Activo',    tone: 'success' },
  pagado:    { label: 'Pagado',    tone: 'neutral' },
  en_mora:   { label: 'En mora',   tone: 'danger' },
  cancelado: { label: 'Cancelado', tone: 'neutral' },
};

const rateLabel = (c) => `${Number(c.tasaInteres).toLocaleString('es-CO', { maximumFractionDigits: 2 })} % ${c.tipoTasa === 'mensual' ? 'M.V.' : 'E.A.'}`;
const whenText = (d) => d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`;

export const BankCredits = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    BankCreditService.getAll()
      .then(setCredits)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const activos       = credits.filter(c => c.status === 'activo');
  const totalDebt     = credits.reduce((a, c) => a + parseFloat(c.saldoPendiente ?? 0), 0);
  const monthlyCuotas = activos.reduce((a, c) => a + parseFloat(c.valorCuota ?? 0), 0);

  // Orden: activos primero, por proximidad de pago.
  const ordered = useMemo(() => [...credits].sort((a, b) => {
    const oa = a.status === 'activo' ? 1 : 0;
    const ob = b.status === 'activo' ? 1 : 0;
    if (oa !== ob) return ob - oa;
    if (oa === 1) return daysUntil(nextOccurrence(a.diaPago)) - daysUntil(nextOccurrence(b.diaPago));
    return 0;
  }), [credits]);

  const header = (
    <div className="page-header">
      <div>
        <h1 className="page-title">Créditos</h1>
        <p className="page-subtitle">Seguimiento de cuotas, saldos y amortización</p>
      </div>
      <button className="btn btn-primary desktop-flex" onClick={() => navigate('/bank-credits/new')}><Plus size={18} /> Nuevo crédito</button>
      <button className="icon-btn mobile-only" onClick={() => navigate('/bank-credits/new')} aria-label="Nuevo crédito"><Plus size={20} /></button>
    </div>
  );

  if (loading) return (
    <div aria-busy="true">{header}
      <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)', marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 240, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
  if (error) return <div>{header}<LoadError onRetry={load} title="No se pudieron cargar tus créditos" /></div>;
  if (credits.length === 0) return (
    <div className="animate-fade-in">{header}
      <div className="card empty-state">
        <div className="empty-state-icon"><Landmark size={24} /></div>
        <p className="empty-state-title">Agrega tu primer crédito</p>
        <p>Con el monto, la tasa y el número de cuotas calculamos tu plan de pagos y te avisamos antes de cada cuota.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/bank-credits/new')}><Plus size={16} /> Agregar crédito</button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {header}

      <section className="card stat-strip" aria-label="Resumen de créditos">
        <div><p>Deuda total</p><b className="n">{fmt(totalDebt)}</b><span>Saldo pendiente de {credits.length} crédito{credits.length !== 1 ? 's' : ''}</span></div>
        <div><p>Cuota mensual total</p><b className="n">{fmt(monthlyCuotas)}</b><span>Comprometido por mes</span></div>
        <div className="desktop-only"><p>Créditos activos</p><b className="n">{activos.length}</b><span>de {credits.length} registrado{credits.length !== 1 ? 's' : ''}</span></div>
      </section>

      <section className="card card-flush" aria-labelledby="tus-creditos">
        <div className="card-header">
          <h2 className="card-title" id="tus-creditos">Tus créditos</h2>
          <span className="text-sm text-muted desktop-only">Activos primero, por fecha de pago</span>
        </div>

        <table className="cc-table desktop-table">
          <thead>
            <tr><th>Crédito</th><th>Estado</th><th>Próximo pago</th><th>Progreso</th><th style={{ textAlign: 'right' }}>Cuota mensual</th><th style={{ textAlign: 'right' }}>Saldo pendiente</th><th aria-label="Abrir" /></tr>
          </thead>
          <tbody>
            {ordered.map(c => {
              const pct = c.numeroCuotas ? (c.cuotasPagadas / c.numeroCuotas) * 100 : 0;
              const st = STATUS[c.status] || STATUS.activo;
              const active = c.status === 'activo';
              const next = active ? nextOccurrence(c.diaPago) : null;
              const days = next ? daysUntil(next) : null;
              return (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/bank-credits/${c.id}`)}>
                  <td>
                    <div className="row" style={{ gap: 12 }}>
                      <span className="list-icon"><Landmark size={18} /></span>
                      <div style={{ minWidth: 0 }}>
                        <span className="cell-title">{c.nombre}</span>
                        <span className="cell-sub">{c.entidad} · {rateLabel(c)} · día {c.diaPago}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge badge-${st.tone}`}>{st.label}</span></td>
                  <td>
                    {next ? (<><span className="n">{fmtShort(next)}</span><span className={`cell-sub ${days <= 3 ? 'tone-warning' : ''}`}>{whenText(days)}</span></>) : <span className="text-muted">—</span>}
                  </td>
                  <td style={{ width: 180 }}>
                    <div className="row-between text-sm"><span className="text-secondary n">{c.cuotasPagadas} de {c.numeroCuotas} cuotas</span><b className={`n ${active ? 'text-success' : ''}`}>{Math.round(pct)} %</b></div>
                    <div className="progress-track" style={{ height: 4, marginTop: 6 }}>
                      <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})`, background: active ? undefined : 'var(--text-4)' }} />
                    </div>
                  </td>
                  <td className="n" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.valorCuota)}</td>
                  <td className="n" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.saldoPendiente)}</td>
                  <td style={{ width: 40 }}><ChevronRight size={18} className="text-muted" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mobile-list row-list">
          {ordered.map(c => {
            const pct = c.numeroCuotas ? (c.cuotasPagadas / c.numeroCuotas) * 100 : 0;
            const st = STATUS[c.status] || STATUS.activo;
            const active = c.status === 'activo';
            const days = active ? daysUntil(nextOccurrence(c.diaPago)) : null;
            return (
              <button key={c.id} className="cc-mrow" onClick={() => navigate(`/bank-credits/${c.id}`)}>
                <div className="row-between" style={{ alignItems: 'flex-start' }}>
                  <span style={{ minWidth: 0 }}>
                    <span className="cell-title">{c.nombre}</span>
                    <span className="cell-sub">{c.entidad} · {c.cuotasPagadas} de {c.numeroCuotas} cuotas</span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <b className="n" style={{ fontSize: 15 }}>{fmt(c.valorCuota)}</b>
                    {active ? <span className={`cell-sub ${days <= 3 ? 'tone-warning' : ''}`}>{whenText(days)}</span> : <span className={`badge badge-${st.tone}`}>{st.label}</span>}
                  </span>
                </div>
                <div className="progress-track" style={{ height: 4, margin: '10px 0 8px' }}>
                  <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})`, background: active ? undefined : 'var(--text-4)' }} />
                </div>
                <div className="row-between text-sm text-secondary n"><span>{Math.round(pct)} % pagado</span><span>Saldo {fmt(c.saldoPendiente)}</span></div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
