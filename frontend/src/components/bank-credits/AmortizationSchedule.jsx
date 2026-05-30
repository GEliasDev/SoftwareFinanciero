import { useState } from 'react';
import {
  CalendarClock, ChevronDown, ChevronRight, DollarSign, Landmark, ArrowDownRight,
} from 'lucide-react';
import { fmt, fmtShort, daysUntil, urgencyStyle } from '../../utils/format';
import { buildLoanSchedule } from '../../utils/bankCredit';

/**
 * Plan de pagos / tabla de amortización de un crédito bancario: próxima cuota
 * destacada + desglose capital/interés mes a mes hasta saldar. Análogo al
 * extracto de las tarjetas. Deriva todo de los datos del crédito.
 */
export const AmortizationSchedule = ({ credit, onPay, paying = false }) => {
  const [open, setOpen] = useState(false);
  const { remaining } = buildLoanSchedule(credit);

  if (remaining.length === 0) return null;

  const next = remaining[0];
  const days = daysUntil(next.date);
  const u = urgencyStyle(days);
  const capitalPct = next.totalMes > 0 ? (next.capital / (next.capital + next.interes)) * 100 : 0;
  const maxTotal = Math.max(...remaining.map(r => r.totalMes), 1);
  const visible = open ? remaining : remaining.slice(0, 0);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem' }}>
      {/* Cabecera */}
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
          <div className="tabular" style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{remaining.length}</div>
        </div>
      </div>

      {/* Próxima cuota */}
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

        {/* Barra capital vs interés */}
        <div style={{ marginTop: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
            <span>Capital {capitalPct.toFixed(0)}%</span>
            <span>Interés {(100 - capitalPct).toFixed(0)}%</span>
          </div>
          <div style={{ display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', background: 'var(--neg-600)' }}>
            <div style={{ width: `${capitalPct}%`, background: 'var(--pos-600)' }} />
          </div>
        </div>

        {onPay && credit?.status === 'activo' && (
          <button className="btn btn-success" style={{ width: '100%', marginTop: '0.875rem' }} onClick={onPay} disabled={paying}>
            <DollarSign size={14} /> {paying ? 'Registrando…' : `Pagar cuota · ${fmt(next.totalMes)}`}
          </button>
        )}
      </div>

      {/* Tabla de amortización */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
            <ArrowDownRight size={14} style={{ color: 'var(--brand-600)' }} />
            Tabla de amortización
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
            {open ? 'Ocultar' : `Ver ${remaining.length} cuotas`}
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>

        {open && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {visible.map(r => {
              const cPct = (r.capital / (r.capital + r.interes || 1)) * 100;
              const w = (r.totalMes / maxTotal) * 100;
              return (
                <div key={r.k} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>
                      Cuota {r.k} · <span style={{ color: 'var(--text-3)', fontWeight: 500, textTransform: 'capitalize' }}>{r.date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}</span>
                    </span>
                    <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmt(r.totalMes)}</span>
                  </div>
                  <div style={{ display: 'flex', height: 5, borderRadius: 99, overflow: 'hidden', background: 'var(--neg-600)', width: `${Math.max(w, 12)}%`, minWidth: 60 }}>
                    <div style={{ width: `${cPct}%`, background: 'var(--pos-600)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    <span>Capital <span className="tabular" style={{ color: 'var(--pos-600)' }}>{fmt(r.capital)}</span> · Interés <span className="tabular" style={{ color: 'var(--neg-600)' }}>{fmt(r.interes)}</span></span>
                    <span>Saldo <span className="tabular">{fmt(r.saldo)}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
