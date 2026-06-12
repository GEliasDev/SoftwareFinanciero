import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Plus, Handshake, ChevronRight, TrendingDown, Repeat, Pencil, Trash2 } from 'lucide-react';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

const STATUS_BADGE = {
  activo: 'badge badge-warning',
  pagado: 'badge badge-success',
  inactivo: 'badge badge-neutral',
};

export const PersonalDebts = () => {
  const navigate = useNavigate();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    PersonalDebtService.getAll().then(setDebts).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const activas = debts.filter(d => d.status === 'activo');
  const deudas = activas.filter(d => d.tipo === 'deuda' || !d.tipo);
  const gastos = activas.filter(d => d.tipo === 'gasto');
  const totalSaldo = deudas.reduce((a, d) => a + parseFloat(d.saldoPendiente ?? 0), 0);
  const totalCuota = activas.reduce((a, d) => a + parseFloat(d.montoCuota ?? 0), 0);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar esta obligación?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--neg-600)',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar',
    });
    if (!isConfirmed) return;
    await PersonalDebtService.delete(id);
    load();
  };

  const DeudaCard = ({ debt }) => {
    const montoTotal = parseFloat(debt.montoTotal ?? 0);
    const saldoActual = parseFloat(debt.saldoPendiente ?? 0);
    const pct = montoTotal > 0 ? Math.min(100, ((montoTotal - saldoActual) / montoTotal) * 100) : 0;
    return (
      <div
        className="card" role="button" tabIndex={0}
        style={{ padding: '16px 20px', cursor: 'pointer' }}
        onClick={() => navigate(`/personal-debts/${debt.id}`)}
        onKeyDown={e => e.key === 'Enter' && navigate(`/personal-debts/${debt.id}`)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', margin: 0 }}>{debt.nombre}</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
              {debt.prestamista ? `A: ${debt.prestamista} · ` : ''}Día {debt.diaPago}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={STATUS_BADGE[debt.status] || STATUS_BADGE.activo}>{debt.status}</span>
            <span className="tabular" style={{ fontWeight: 700, fontSize: 15 }}>{fmt(saldoActual)}</span>
            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/personal-debts/${debt.id}/edit`); }} title="Editar"><Pencil size={13} /></button>
            <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(debt.id, e)} title="Eliminar" style={{ color: 'var(--neg-600)' }}><Trash2 size={13} /></button>
            <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
          </div>
        </div>
        <div className="progress-track" style={{ marginBottom: 6 }}>
          <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)' }}>
          <span>Cuota: {fmt(debt.montoCuota)}/mes</span>
          <span className="tabular" style={{ color: 'var(--pos-600)', fontWeight: 600 }}>{pct.toFixed(0)}% pagado</span>
        </div>
      </div>
    );
  };

  const GastoRow = ({ debt }) => (
    <div
      className="card" role="button" tabIndex={0}
      style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      onClick={() => navigate(`/personal-debts/${debt.id}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/personal-debts/${debt.id}`)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Repeat size={15} style={{ color: 'var(--brand-600)', flexShrink: 0 }} />
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', margin: 0 }}>{debt.nombre}</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
            Día {debt.diaPago} · <span className={STATUS_BADGE[debt.status] || STATUS_BADGE.activo}>{debt.status}</span>
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="tabular" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{fmt(debt.montoCuota)}/mes</span>
        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/personal-debts/${debt.id}/edit`); }} title="Editar"><Pencil size={13} /></button>
        <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(debt.id, e)} title="Eliminar" style={{ color: 'var(--neg-600)' }}><Trash2 size={13} /></button>
        <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
      </div>
    </div>
  );

  const hasMixed = deudas.length > 0 && gastos.length > 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Deudas"
        subtitle="Deudas personales y gastos mensuales recurrentes"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/personal-debts/new')}>
            <Plus size={15} /> Nueva deuda
          </button>
        }
      />

      {!loading && debts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
          <StatCard label="Comprometido mensual" value={fmt(totalCuota)} delta="Todos los gastos fijos mensuales activas" icon={Handshake} tone="warn" />
          {deudas.length > 0 && (
            <StatCard label="Saldo en deudas" value={fmt(totalSaldo)} delta="Por pagar en cuotas" icon={TrendingDown} tone="neg" />
          )}
          <StatCard label="Activas" value={`${activas.length}`} delta={`de ${debts.length} total`} icon={Handshake} tone="brand" />
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
            <p className="empty-state-title">Sin obligaciones</p>
            <p>Registra deudas personales o gastos mensuales recurrentes.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/personal-debts/new')}>
              <Plus size={14} /> Nueva obligación
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {hasMixed && deudas.length > 0 && (
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
              Deudas
            </p>
          )}
          {(debts.filter(d => d.tipo === 'deuda' || !d.tipo)).map(debt => <DeudaCard key={debt.id} debt={debt} />)}

          {hasMixed && gastos.length > 0 && (
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0.25rem 0 0' }}>
              Gastos mensuales
            </p>
          )}
          {debts.filter(d => d.tipo === 'gasto').map(debt => <GastoRow key={debt.id} debt={debt} />)}
        </div>
      )}
    </div>
  );
};
