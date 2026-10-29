import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { LoadError } from '../components/ui/LoadError';
import { Plus, CalendarCheck, ChevronRight, Repeat, Pencil, Trash2 } from 'lucide-react';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

const STATUS_BADGE = {
  activo: 'badge badge-warning',
  inactivo: 'badge badge-neutral',
};

export const PersonalDebts = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    PersonalDebtService.getAll().then(setItems).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const activos = items.filter(d => d.status === 'activo');
  const totalCuota = activos.reduce((a, d) => a + parseFloat(d.montoCuota ?? 0), 0);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar este compromiso?',
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

  const CommitmentRow = ({ item }) => (
    <div
      className="card" role="button" tabIndex={0}
      style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      onClick={() => navigate(`/fixed-commitments/${item.id}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/fixed-commitments/${item.id}`)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Repeat size={15} style={{ color: 'var(--brand-600)', flexShrink: 0 }} />
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', margin: 0 }}>{item.nombre}</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
            Día {item.diaPago} · <span className={STATUS_BADGE[item.status] || STATUS_BADGE.activo}>{item.status}</span>
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="tabular" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{fmt(item.montoCuota)}/mes</span>
        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/fixed-commitments/${item.id}/edit`); }} title="Editar"><Pencil size={13} /></button>
        <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(item.id, e)} title="Eliminar" style={{ color: 'var(--neg-600)' }}><Trash2 size={13} /></button>
        <ChevronRight size={16} style={{ color: 'var(--text-3)' }} />
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Compromisos fijos"
        subtitle="Lo que sí o sí debes pagar cada mes"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/fixed-commitments/new')}>
            <Plus size={15} /> Nuevo compromiso
          </button>
        }
      />

      {!loading && !error && items.length > 0 && (
        <div className="kpi-grid" style={{ marginBottom: 18 }}>
          <StatCard label="Compromisos mensuales" value={fmt(totalCuota)} delta={`${activos.length} compromiso${activos.length !== 1 ? 's' : ''} activo${activos.length !== 1 ? 's' : ''}`} icon={Repeat} tone="warn" />
          <StatCard label="Anual estimado" value={fmt(totalCuota * 12)} delta="12 meses" icon={CalendarCheck} tone="brand" />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : error ? (
        <LoadError onRetry={load} title="No se pudieron cargar tus compromisos fijos" />
      ) : items.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CalendarCheck size={24} /></div>
            <p className="empty-state-title">Sin compromisos fijos</p>
            <p>Registra lo que pagas todos los meses: aporte a la casa, arriendo, mercado base…</p>
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/fixed-commitments/new')}>
              <Plus size={14} /> Nuevo compromiso
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => <CommitmentRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
};
