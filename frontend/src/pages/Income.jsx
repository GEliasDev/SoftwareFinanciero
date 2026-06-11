import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IncomeService } from '../services/incomeService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Plus, Wallet, Zap, Pencil, Trash2 } from 'lucide-react';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

const STATUS_BADGE = {
  activo:   'badge badge-success',
  inactivo: 'badge badge-neutral',
};

const isThisMonth = (createdAt) => {
  const d = new Date(createdAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

const IncomeRow = ({ inc, onEdit, onDelete }) => {
  const esExtra = inc.tipo === 'extra';
  const cuentaEsteMes = esExtra && isThisMonth(inc.createdAt);
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {esExtra
          ? <Zap size={14} style={{ color: cuentaEsteMes ? 'var(--warn-600)' : 'var(--text-3)', flexShrink: 0 }} />
          : <Wallet size={14} style={{ color: 'var(--pos-600)', flexShrink: 0 }} />
        }
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: esExtra && !cuentaEsteMes ? 'var(--text-3)' : 'var(--text)' }}>{inc.nombre}</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {esExtra
              ? cuentaEsteMes
                ? <span style={{ color: 'var(--warn-600)', fontWeight: 600 }}>Cuenta este mes</span>
                : <span>Ya no cuenta en Dinero Libre</span>
              : <>Día {inc.diaCobro} · <span className={STATUS_BADGE[inc.status] || STATUS_BADGE.activo}>{inc.status}</span></>
            }
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="tabular" style={{ fontWeight: 700, fontSize: 15, color: esExtra ? (cuentaEsteMes ? 'var(--warn-600)' : 'var(--text-3)') : 'var(--pos-600)' }}>
          {fmt(inc.monto)}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(inc.id)} title="Editar"><Pencil size={14} /></button>
        <button className="btn btn-ghost btn-sm" onClick={() => onDelete(inc.id)} title="Eliminar" style={{ color: 'var(--neg-600)' }}><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

export const Income = () => {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    IncomeService.getAll().then(setIncomes).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const activos  = incomes.filter(i => i.status === 'activo');
  const fijos    = activos.filter(i => i.tipo === 'fijo' || !i.tipo);
  const extras   = activos.filter(i => i.tipo === 'extra');
  const totalFijo  = fijos.reduce((a, i)  => a + parseFloat(i.monto ?? 0), 0);
  const totalExtra = extras.reduce((a, i) => a + parseFloat(i.monto ?? 0), 0);

  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar este ingreso?',
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
        subtitle="Ingresos mensuales fijos y extras puntuales"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/income/new')}>
            <Plus size={15} /> Agregar ingreso
          </button>
        }
      />

      {!loading && incomes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
          <StatCard
            label="Total mensual"
            value={fmt(totalFijo)}
            delta={`${fijos.length} fuente(s) · siempre en Dinero Libre`}
            icon={Wallet}
            tone="pos"
          />
          {extras.length > 0 && (
            <StatCard
              label="Extras este mes"
              value={fmt(totalExtra)}
              delta={`${extras.length} ingreso(s) puntual(es) · solo cuenta este mes`}
              icon={Zap}
              tone="warn"
            />
          )}
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
            <p className="empty-state-title">Sin ingresos registrados</p>
            <p>Agrega tu salario u otras fuentes para calcular tu dinero libre mensual.</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/income/new')}>
              <Plus size={14} /> Agregar ingreso
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Ingresos fijos */}
          {incomes.filter(i => i.tipo === 'fijo' || !i.tipo).length > 0 && (
            <>
              {extras.length > 0 && (
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                  Mensuales
                </p>
              )}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {incomes.filter(i => i.tipo === 'fijo' || !i.tipo).map((inc, idx, arr) => (
                  <div key={inc.id} style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <IncomeRow inc={inc} onEdit={(id) => navigate(`/income/${id}/edit`)} onDelete={handleDelete} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Ingresos extra */}
          {incomes.filter(i => i.tipo === 'extra').length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: extras.length > 0 ? '0.25rem 0 0' : 0 }}>
                Extras
              </p>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {incomes.filter(i => i.tipo === 'extra').map((inc, idx, arr) => (
                  <div key={inc.id} style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <IncomeRow inc={inc} onEdit={(id) => navigate(`/income/${id}/edit`)} onDelete={handleDelete} />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '-8px 0 0', fontStyle: 'italic' }}>
                Los ingresos extra cuentan en el Dinero Libre solo el mes en que los registraste. El siguiente mes desaparecen solos del cálculo.
              </p>
            </>
          )}

        </div>
      )}
    </div>
  );
};
