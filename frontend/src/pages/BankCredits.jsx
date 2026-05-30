import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BankCreditService } from '../services/bankCreditService';
import { Plus, Landmark, ChevronRight } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n ?? 0);

const STATUS = {
  activo:   { label: 'Activo',   cls: 'badge badge-success' },
  pagado:   { label: 'Pagado',   cls: 'badge badge-primary' },
  atrasado: { label: 'Atrasado', cls: 'badge badge-danger' },
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

  const totalDebt     = credits.reduce((a, c) => a + (c.saldoPendiente ?? 0), 0);
  const monthlyCuotas = credits.filter(c => c.status === 'activo').reduce((a, c) => a + (c.valorCuota ?? 0), 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Créditos Bancarios</h1>
        <button className="btn btn-primary" onClick={() => navigate('/bank-credits/new')}>
          <Plus size={15} /> Nuevo Crédito
        </button>
      </div>

      {/* Resumen */}
      {!loading && credits.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Créditos activos',   value: credits.filter(c => c.status === 'activo').length + ' créditos', sub: 'en seguimiento' },
            { label: 'Deuda total',          value: fmt(totalDebt),     sub: 'saldo pendiente' },
            { label: 'Cuota mensual total',  value: fmt(monthlyCuotas), sub: 'comprometido/mes' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem', boxShadow: 'var(--shadow-sm)',
            }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.25rem' }}>{label}</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{value}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-md)' }} />)}
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
          {credits.map(credit => {
            const pct = credit.numeroCuotas ? (credit.cuotasPagadas / credit.numeroCuotas) * 100 : 0;
            const statusInfo = STATUS[credit.status] || STATUS.activo;
            return (
              <div
                key={credit.id}
                className="card"
                style={{ cursor: 'pointer', padding: '1.125rem 1.25rem' }}
                onClick={() => navigate(`/bank-credits/${credit.id}`)}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Icono + nombre */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 'var(--radius-md)',
                    background: 'var(--color-danger-bg)', color: 'var(--color-danger)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Landmark size={18} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0, color: 'var(--color-text-primary)' }}>{credit.nombre}</h3>
                      <span className={statusInfo.cls}>{statusInfo.label}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 0.875rem' }}>
                      {credit.entidad} · {credit.tasaInteres}% {credit.tipoTasa === 'mensual' ? 'M.V.' : 'E.A.'} · Día {credit.diaPago}
                    </p>

                    {/* Barra de progreso */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {credit.cuotasPagadas} de {credit.numeroCuotas} cuotas
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-success)' }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Montos */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 0.15rem' }}>Cuota mensual</p>
                    <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-danger)', margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>{fmt(credit.valorCuota)}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>Saldo: {fmt(credit.saldoPendiente)}</p>
                  </div>

                  <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', alignSelf: 'center', flexShrink: 0 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
