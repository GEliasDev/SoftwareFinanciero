import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Plus, Handshake, ChevronRight, TrendingDown } from 'lucide-react';
import { fmt } from '../utils/format';

const STATUS_BADGE = { activo: 'badge badge-warning', pagado: 'badge badge-success' };

export const PersonalDebts = () => {
  const navigate = useNavigate();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PersonalDebtService.getAll().then(setDebts).catch(console.error).finally(() => setLoading(false));
  }, []);

  const activas = debts.filter(d => d.status === 'activo');
  const totalSaldo = activas.reduce((a, d) => a + parseFloat(d.saldoPendiente ?? 0), 0);
  const totalCuota = activas.reduce((a, d) => a + parseFloat(d.montoCuota ?? 0), 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Obligaciones Personales"
        subtitle="Deudas sin interés con personas o entidades informales"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/personal-debts/new')}>
            <Plus size={15} /> Nueva obligación
          </button>
        }
      />

      {!loading && debts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
          <StatCard label="Saldo total pendiente" value={fmt(totalSaldo)} delta="Por pagar" icon={TrendingDown} tone="neg" />
          <StatCard label="Cuota mensual total" value={fmt(totalCuota)} delta="Comprometido por mes" icon={Handshake} tone="warn" />
          <StatCard label="Obligaciones activas" value={`${activas.length}`} delta={`de ${debts.length} total`} icon={Handshake} tone="brand" />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : debts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Handshake size={24} /></div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Sin obligaciones</p>
            <p>Registra deudas informales para llevar el control de tus pagos.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/personal-debts/new')}>
              <Plus size={14} /> Nueva obligación
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {debts.map(debt => {
            const pct = debt.numeroCuotas ? (debt.cuotasPagadas / debt.numeroCuotas) * 100 : 0;
            return (
              <div
                key={debt.id} className="card" role="button" tabIndex={0}
                style={{ padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => navigate(`/personal-debts/${debt.id}`)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/personal-debts/${debt.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', margin: 0 }}>{debt.nombre}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>A: {debt.prestamista} · Día {debt.diaPago}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={STATUS_BADGE[debt.status] || STATUS_BADGE.activo}>{debt.status}</span>
                    <span className="tabular" style={{ fontWeight: 700, fontSize: 15 }}>{fmt(debt.saldoPendiente)}</span>
                    <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
                  </div>
                </div>
                <div className="progress-track" style={{ marginBottom: 6 }}>
                  <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)' }}>
                  <span>Cuota: {fmt(debt.montoCuota)}/mes</span>
                  <span>{debt.cuotasPagadas}/{debt.numeroCuotas} cuotas · {pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
