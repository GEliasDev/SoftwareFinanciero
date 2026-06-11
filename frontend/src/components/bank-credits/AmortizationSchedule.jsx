import { useState } from 'react';
import {
  CalendarClock, ChevronDown, ChevronRight, DollarSign, Landmark, ArrowDownRight, CheckCircle2,
} from 'lucide-react';
import { fmt, fmtShort, daysUntil, urgencyStyle } from '../../utils/format';
import { buildLoanSchedule } from '../../utils/bankCredit';

export const AmortizationSchedule = ({ credit, onPay, paying = false }) => {
  const [open, setOpen] = useState(false);
  const { rows, remaining } = buildLoanSchedule(credit);

  if (remaining.length === 0) return null;

  const pagadas = Number(credit?.cuotasPagadas) || 0;
  const next = remaining[0];
  const days = daysUntil(next.date);
  const u = urgencyStyle(days);
  const capitalPct = next.totalMes > 0 ? (next.capital / (next.capital + next.interes)) * 100 : 0;

  // Totals across full schedule
  const totalIntereses = rows.reduce((a, r) => a + r.interes, 0);
  const totalCapital   = rows.reduce((a, r) => a + r.capital, 0);
  const totalPagado    = rows.slice(0, pagadas).reduce((a, r) => a + r.totalMes, 0);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-800) 100%)', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Landmark size={17} style={{ color: 'rgba(255,255,255,0.85)' }} />
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>Plan de pagos</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{credit?.entidad} · {credit?.nombre}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cuotas restantes</div>
          <div className="tabular" style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{remaining.length} de {rows.length}</div>
        </div>
      </div>

      {/* Next payment */}
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              Próxima cuota ({next.k}/{credit?.numeroCuotas})
            </div>
            <div className="tabular" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {fmt(next.totalMes)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              Capital <span className="tabular" style={{ color: 'var(--pos-600)', fontWeight: 600 }}>{fmt(next.capital)}</span>
              {' · '}Interés <span className="tabular" style={{ color: 'var(--neg-600)', fontWeight: 600 }}>{fmt(next.interes)}</span>
              {next.admin > 0 && <> · Admin <span className="tabular">{fmt(next.admin)}</span></>}
            </div>
          </div>

          <div style={{ background: u.bg, border: `1px solid ${u.border}`, borderRadius: 'var(--radius-md)', padding: '0.6rem 0.875rem', minWidth: 150 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <CalendarClock size={13} style={{ color: u.color }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: u.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vence</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: u.color }}>
              {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`}
            </div>
            <div style={{ fontSize: 11, color: u.color, opacity: 0.8 }}>{fmtShort(next.date)}</div>
          </div>
        </div>

        {/* Capital vs interest bar */}
        <div style={{ marginTop: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
            <span>Capital {capitalPct.toFixed(0)}%</span>
            <span>Interés {(100 - capitalPct).toFixed(0)}%</span>
          </div>
          <div style={{ display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', background: 'var(--neg-600)' }}>
            <div style={{ width: `${capitalPct}%`, background: 'var(--pos-600)' }} />
          </div>
        </div>

        {/* Summary totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
          {[
            { label: 'Total capital', value: fmt(totalCapital), color: 'var(--text)' },
            { label: 'Total intereses', value: fmt(totalIntereses), color: 'var(--neg-600)' },
            { label: 'Ya pagado', value: fmt(totalPagado), color: 'var(--pos-600)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.75rem' }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
              <div className="tabular" style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {onPay && credit?.status === 'activo' && (
          <button className="btn btn-success" style={{ width: '100%', marginTop: '0.875rem' }} onClick={onPay} disabled={paying}>
            <DollarSign size={14} /> {paying ? 'Registrando…' : `Pagar cuota · ${fmt(next.totalMes)}`}
          </button>
        )}
      </div>

      {/* Full amortization table */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
            <ArrowDownRight size={14} style={{ color: 'var(--brand-600)' }} />
            Tabla de amortización completa
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
            {open ? 'Ocultar' : `Ver ${rows.length} cuotas`}
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>

        {open && (
          <div style={{ marginTop: '0.875rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['#', 'Fecha', 'Cuota', 'Capital', 'Interés', 'Saldo'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: h === '#' ? 'center' : 'right', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const isPaid = r.k <= pagadas;
                  const rowDate = isPaid
                    ? null
                    : remaining[r.k - pagadas - 1]?.date;
                  const dateStr = rowDate ? fmtShort(rowDate) : '—';
                  return (
                    <tr
                      key={r.k}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        opacity: isPaid ? 0.45 : 1,
                        background: r.k === next.k ? 'var(--brand-50, rgba(91,77,241,0.04))' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        {isPaid
                          ? <CheckCircle2 size={13} style={{ color: 'var(--pos-600)', verticalAlign: 'middle' }} />
                          : <span className="tabular" style={{ fontWeight: 600, color: r.k === next.k ? 'var(--brand-600)' : 'var(--text-3)' }}>{r.k}</span>}
                      </td>
                      <td className="tabular" style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{dateStr}</td>
                      <td className="tabular" style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--text)' }}>{fmt(r.totalMes)}</td>
                      <td className="tabular" style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--pos-600)' }}>{fmt(r.capital)}</td>
                      <td className="tabular" style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--neg-600)' }}>{fmt(r.interes)}</td>
                      <td className="tabular" style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-2)' }}>{fmt(r.saldo)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface-2)' }}>
                  <td colSpan={2} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</td>
                  <td className="tabular" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{fmt(totalCapital + totalIntereses)}</td>
                  <td className="tabular" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--pos-600)' }}>{fmt(totalCapital)}</td>
                  <td className="tabular" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--neg-600)' }}>{fmt(totalIntereses)}</td>
                  <td style={{ padding: '8px 10px' }} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
