import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { LoadError } from '../components/ui/LoadError';
import { Wallet, Pencil, Repeat, ArrowLeft, Trash2 } from 'lucide-react';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

export const PersonalDebtDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    PersonalDebtService.getById(id).then(setItem).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
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
    navigate('/fixed-commitments');
  };

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)', margin: 24 }} />;
  if (error || !item) return (
    <div className="animate-fade-in" style={{ padding: 24 }}>
      <LoadError onRetry={load} title="No se pudo cargar este compromiso" />
    </div>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={item.nombre}
        subtitle="Compromiso fijo mensual"
        back={
          <button onClick={() => navigate('/fixed-commitments')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate(`/fixed-commitments/${id}/edit`)}>
              <Pencil size={14} /> Editar
            </button>
            <button className="btn btn-secondary" onClick={handleDelete} style={{ color: 'var(--neg-600)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Monto mensual"  value={fmt(item.montoCuota)}                          delta="Mensual recurrente" icon={Wallet} tone="warn" />
        <StatCard label="Anual estimado" value={fmt(parseFloat(String(item.montoCuota)) * 12)} delta="12 meses"           icon={Repeat} tone="neutral" />
      </div>
      <SectionCard title="Detalle">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Monto mensual', value: fmt(item.montoCuota) },
            { label: 'Estado',        value: item.status },
            ...(item.descripcion ? [{ label: 'Descripción', value: item.descripcion }] : []),
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
