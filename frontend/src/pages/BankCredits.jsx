import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BankCreditService } from '../services/bankCreditService';
import { Plus, Landmark, ChevronRight, CalendarClock, Wallet, TrendingDown } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { fmt, nextOccurrence, daysUntil, urgencyStyle } from '../utils/format';

const STATUS = {
  activo:    { label: 'Activo',    cls: 'badge badge-success' },
  pagado:    { label: 'Pagado',    cls: 'badge badge-primary' },
  en_mora:   { label: 'En mora',   cls: 'badge badge-danger' },
  cancelado: { label: 'Cancelado', cls: 'badge badge-neutral' },
};

export const BankCredits = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BankCreditService.getAll()
      .then(setCredits)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activos       = credits.filter(c => c.status === 'activo');
  const totalDebt     = credits.reduce((a, c) => a + (c.saldoPendiente ?? 0), 0);
  const monthlyCuotas = activos.reduce((a, c) => a + (c.valorCuota ?? 0), 0);

  // Orden: activos primero, por proximidad de pago.
  const ordered = useMemo(() => [...credits].sort((a, b) => {
    const oa = a.status === 'activo' ? 1 : 0;
    const ob = b.status === 'activo' ? 1 : 0;
    if (oa !== ob) return ob - oa;
    if (oa === 1) return daysUntil(nextOccurrence(a.diaPago)) - daysUntil(nextOccurrence(b.diaPago));
    return 0;
  }), [credits]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Créditos Bancarios"
        subtitle="Seguimiento de cuotas, saldos y amortización"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/bank-credits/new')}>
            <Plus size={15} /> Nuevo Crédito
          </button>
        }
      />

      {!loading && credits.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
          <StatCard label="Deuda total" value={fmt(totalDebt)} delta="Saldo pendiente" icon={TrendingDown} tone="neg" />
          <StatCard label="Cuota mensual total" value={fmt(monthlyCuotas)} delta="Comprometido por mes" icon={Wallet} tone="warn" />
          <StatCard label="Créditos activos" value={`${activos.length}`} delta={`de ${credits.length} registrado${credits.length !== 1 ? 's' : ''}`} icon={Landmark} tone="brand" />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 116, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : credits.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Landmark size={24} /></div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Sin créditos</p>
            <p>Registra tus créditos bancarios para hacer seguimiento de cuotas y saldos.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/bank-credits/new')}>
              <Plus size={14} /> Agregar crédito
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {ordered.map(credit => {
            const pct = credit.numeroCuotas ? (credit.cuotasPagadas / credit.numeroCuotas) * 100 : 0;
            const statusInfo = STATUS[credit.status] || STATUS.activo;
            const isActive = credit.status === 'activo';
            const days = isActive ? daysUntil(nextOccurrence(credit.diaPago)) : null;
            const u = isActive ? urgencyStyle(days) : null;

            return (
              <div key={credit.id} className="card clickable" style={{ padding: '1.125rem 1.25rem' }} onClick={() => navigate(`/bank-credits/${credit.id}`)}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Landmark size={18} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0, color: 'var(--text)' }}>{credit.nombre}</h3>
                      <span className={statusInfo.cls}>{statusInfo.label}</span>
                      {isActive && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
                          padding: '1px 8px', borderRadius: 99, background: u.bg, color: u.color, border: `1px solid ${u.border}`,
                        }}>
                          <CalendarClock size={10} />
                          {days === 0 ? 'Paga hoy' : days === 1 ? 'Paga mañana' : `Paga en ${days}d`}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 0.875rem' }}>
                      {credit.entidad} · {credit.tasaInteres}% {credit.tipoTasa === 'mensual' ? 'M.V.' : 'E.A.'} · Día {credit.diaPago}
                    </p>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span className="tabular" style={{ fontSize: 12, color: 'var(--text-3)' }}>{credit.cuotasPagadas} de {credit.numeroCuotas} cuotas</span>
                        <span className="tabular" style={{ fontSize: 12, fontWeight: 700, color: 'var(--pos-600)' }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 0.15rem' }}>Cuota mensual</p>
                    <p className="tabular" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>{fmt(credit.valorCuota)}</p>
                    <p className="tabular" style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Saldo: {fmt(credit.saldoPendiente)}</p>
                  </div>

                  <ChevronRight size={16} style={{ color: 'var(--text-3)', alignSelf: 'center', flexShrink: 0 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
