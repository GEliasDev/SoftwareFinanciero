import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { TrendingDown, Wallet, Percent, Pencil, Plus } from 'lucide-react';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

export const PersonalDebtDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [debt, setDebt] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => PersonalDebtService.getById(id).then(setDebt).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const handleAbono = async () => {
    const { value: montoStr, isConfirmed } = await Swal.fire({
      title: 'Registrar abono',
      input: 'number',
      inputLabel: 'Monto a abonar (COP)',
      inputValue: debt?.montoCuota,
      inputAttributes: { min: 1 },
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-600)',
      inputValidator: (v) => !v || Number(v) <= 0 ? 'Ingresa un monto válido' : null,
    });
    if (!isConfirmed) return;
    try {
      await PersonalDebtService.registerAbono(id, Number(montoStr));
      load();
      Swal.fire({ icon: 'success', title: 'Abono registrado', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo registrar', confirmButtonColor: 'var(--brand-600)' });
    }
  };

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)', margin: 24 }} />;
  if (!debt) return null;

  const pct = debt.numeroCuotas ? (debt.cuotasPagadas / debt.numeroCuotas) * 100 : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={debt.nombre}
        subtitle={`A: ${debt.prestamista}`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {debt.status === 'activo' && (
              <button className="btn btn-primary" onClick={handleAbono}><Plus size={14} /> Registrar abono</button>
            )}
            <button className="btn btn-secondary" onClick={() => navigate(`/personal-debts/${id}/edit`)}><Pencil size={14} /> Editar</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Saldo pendiente" value={fmt(debt.saldoPendiente)} delta={`de ${fmt(debt.montoTotal)} original`} icon={TrendingDown} tone="neg" />
        <StatCard label="Cuota mensual" value={fmt(debt.montoCuota)} delta={`Día ${debt.diaPago} de cada mes`} icon={Wallet} tone="neutral" />
        <StatCard label="Progreso" value={`${pct.toFixed(0)}%`} delta={`${debt.cuotasPagadas}/${debt.numeroCuotas} cuotas`} icon={Percent} tone="pos" />
      </div>

      <SectionCard title="Detalle">
        <div className="progress-track" style={{ marginBottom: 16 }}>
          <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'A quién', value: debt.prestamista },
            { label: 'Monto original', value: fmt(debt.montoTotal) },
            { label: 'Cuotas restantes', value: `${debt.numeroCuotas - debt.cuotasPagadas}` },
            { label: 'Estado', value: debt.status },
            ...(debt.descripcion ? [{ label: 'Descripción', value: debt.descripcion }] : []),
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
