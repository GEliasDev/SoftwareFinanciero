import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SavingsGoalService } from '../services/savingsGoalService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { Target, Wallet, Calendar, Pencil, Plus, CheckCircle } from 'lucide-react';
import { fmt, fmtDateLong } from '../utils/format';
import Swal from 'sweetalert2';

export const SavingsDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => SavingsGoalService.getById(id).then(setGoal).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const handleAporte = async () => {
    const { value: montoStr, isConfirmed } = await Swal.fire({
      title: 'Registrar aporte',
      input: 'number',
      inputLabel: 'Monto aportado (COP)',
      inputValue: goal?.aporteMensual || '',
      inputAttributes: { min: 1 },
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-600)',
      inputValidator: (v) => !v || Number(v) <= 0 ? 'Ingresa un monto válido' : null,
    });
    if (!isConfirmed) return;
    try {
      await SavingsGoalService.registerAporte(id, Number(montoStr));
      load();
      Swal.fire({ icon: 'success', title: 'Aporte registrado', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo registrar', confirmButtonColor: 'var(--brand-600)' });
    }
  };

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)', margin: 24 }} />;
  if (!goal) return null;

  const pct = parseFloat(goal.montoMeta) > 0
    ? Math.min(100, (parseFloat(goal.montoAcumulado) / parseFloat(goal.montoMeta)) * 100)
    : 0;
  const restante = Math.max(0, parseFloat(goal.montoMeta) - parseFloat(goal.montoAcumulado));
  const mesesEst = parseFloat(goal.aporteMensual) > 0 ? Math.ceil(restante / parseFloat(goal.aporteMensual)) : null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`${goal.emoji ? goal.emoji + ' ' : ''}${goal.nombre}`}
        subtitle={goal.status === 'completado' ? '¡Meta completada!' : `${fmt(restante)} restante`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {goal.status !== 'completado' && (
              <button className="btn btn-primary" onClick={handleAporte}><Plus size={14} /> Registrar aporte</button>
            )}
            <button className="btn btn-secondary" onClick={() => navigate(`/savings/${id}/edit`)}><Pencil size={14} /> Editar</button>
          </div>
        }
      />

      {goal.status === 'completado' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px',
          background: 'color-mix(in srgb, var(--pos-600) 10%, transparent)',
          border: '1px solid var(--pos-600)',
          borderRadius: 'var(--radius-md)', marginBottom: 16,
          color: 'var(--pos-600)', fontWeight: 600,
        }}>
          <CheckCircle size={18} /> ¡Felicitaciones! Alcanzaste esta meta.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Ahorrado" value={fmt(goal.montoAcumulado)} delta={`de ${fmt(goal.montoMeta)} meta`} icon={Wallet} tone="pos" />
        <StatCard label="Progreso" value={`${pct.toFixed(0)}%`} delta={`${fmt(restante)} restante`} icon={Target} tone={pct >= 100 ? 'pos' : 'brand'} />
        {mesesEst !== null && (
          <StatCard label="Meses estimados" value={`${mesesEst}`} delta={`A ${fmt(goal.aporteMensual)}/mes`} icon={Calendar} tone="neutral" />
        )}
      </div>

      <SectionCard title="Progreso">
        <div className="progress-track" style={{ height: 12, marginBottom: 16 }}>
          <div className="progress-fill" style={{
            transform: `scaleX(${pct / 100})`,
            background: pct >= 100 ? 'var(--pos-600)' : undefined,
          }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Monto objetivo', value: fmt(goal.montoMeta) },
            { label: 'Aporte mensual plan', value: fmt(goal.aporteMensual) },
            ...(goal.fechaMeta ? [{ label: 'Fecha objetivo', value: fmtDateLong(goal.fechaMeta) }] : []),
            { label: 'Estado', value: goal.status },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 2 }}>{label}</p>
              <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
