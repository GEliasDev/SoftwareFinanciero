import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SavingsGoalService } from '../services/savingsGoalService';
import { PageHeader } from '../components/ui/PageHeader';
import { Plus, Target, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

const STATUS_BADGE = {
  activo:     'badge badge-primary',
  completado: 'badge badge-success',
  pausado:    'badge badge-neutral',
};

export const Savings = () => {
  const navigate = useNavigate();
  const [goals, setGoals]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    SavingsGoalService.getAll().then(setGoals).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar esta meta?',
      text: 'Se perderá el progreso registrado. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--neg-600)',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar',
    });
    if (!isConfirmed) return;
    await SavingsGoalService.delete(id);
    load();
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Metas de Ahorro"
        subtitle="Objetivos de ahorro con seguimiento de progreso"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/savings/new')}>
            <Plus size={15} /> Nueva meta
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Target size={24} /></div>
            <p className="empty-state-title">Sin metas de ahorro</p>
            <p>Define una meta para darle dirección a tu dinero libre mensual.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/savings/new')}>
              <Plus size={14} /> Nueva meta
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {goals.map(goal => {
            const pct      = parseFloat(goal.montoMeta) > 0
              ? Math.min(100, (parseFloat(goal.montoAcumulado) / parseFloat(goal.montoMeta)) * 100)
              : 0;
            const restante = Math.max(0, parseFloat(goal.montoMeta) - parseFloat(goal.montoAcumulado));
            const mesesEst = parseFloat(goal.aporteMensual) > 0 ? Math.ceil(restante / parseFloat(goal.aporteMensual)) : null;
            return (
              <div
                key={goal.id} className="card" role="button" tabIndex={0}
                style={{ padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => navigate(`/savings/${goal.id}`)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/savings/${goal.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', margin: 0 }}>
                      {goal.emoji && <span style={{ marginRight: 6 }}>{goal.emoji}</span>}{goal.nombre}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
                      {fmt(goal.montoAcumulado)} de {fmt(goal.montoMeta)}
                      {mesesEst ? ` · ~${mesesEst} meses restantes` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={STATUS_BADGE[goal.status] || STATUS_BADGE.activo}>{goal.status}</span>
                    <span className="tabular" style={{ fontWeight: 700, fontSize: 15, color: 'var(--pos-600)' }}>{pct.toFixed(0)}%</span>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/savings/${goal.id}/edit`); }} title="Editar"><Pencil size={13} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(goal.id, e)} title="Eliminar" style={{ color: 'var(--neg-600)' }}><Trash2 size={13} /></button>
                    <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
                  </div>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{
                    transform: `scaleX(${pct / 100})`,
                    background: pct >= 100 ? 'var(--pos-600)' : undefined,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
