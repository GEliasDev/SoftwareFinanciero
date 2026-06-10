import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IncomeService } from '../services/incomeService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Plus, Wallet, Pencil, Trash2 } from 'lucide-react';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

const STATUS_BADGE = {
  activo:   'badge badge-success',
  inactivo: 'badge badge-neutral',
};

export const Income = () => {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    IncomeService.getAll().then(setIncomes).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const totalMensual = incomes
    .filter(i => i.status === 'activo')
    .reduce((a, i) => a + parseFloat(i.monto ?? 0), 0);

  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar fuente de ingreso?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--neg-600)',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar',
    });
    if (!isConfirmed) return;
    await IncomeService.delete(id);
    load();
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ingresos"
        subtitle="Fuentes de ingreso mensual recurrentes"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/income/new')}>
            <Plus size={15} /> Agregar fuente
          </button>
        }
      />

      {!loading && incomes.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <StatCard
            label="Total mensual"
            value={fmt(totalMensual)}
            delta={`${incomes.filter(i => i.status === 'activo').length} fuente(s) activa(s)`}
            icon={Wallet}
            tone="pos"
          />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : incomes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Wallet size={24} /></div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Sin fuentes de ingreso</p>
            <p>Agrega tu salario u otras fuentes para calcular tu dinero libre mensual.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/income/new')}>
              <Plus size={14} /> Agregar fuente
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {incomes.map((inc, idx) => (
            <div
              key={inc.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 20px',
                borderBottom: idx < incomes.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{inc.nombre}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Día {inc.diaCobro} · <span className={STATUS_BADGE[inc.status] || STATUS_BADGE.activo}>{inc.status}</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="tabular" style={{ fontWeight: 700, fontSize: 15, color: 'var(--pos-600)' }}>{fmt(inc.monto)}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/income/${inc.id}/edit`)} title="Editar"><Pencil size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(inc.id)} title="Eliminar" style={{ color: 'var(--neg-600)' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
