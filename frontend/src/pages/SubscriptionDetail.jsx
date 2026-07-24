import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { SubscriptionService } from '../services/subscriptionService';
import { ArrowLeft, Edit2, Trash2, Wallet, CalendarRange, CalendarClock, Info, CreditCard } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { fmt, fmtDateLong, nextOccurrence, daysUntil } from '../utils/format';

const FRECUENCIA_LABEL = { mensual: 'Mensual', anual: 'Anual' };

export const SubscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setSub(await SubscriptionService.getById(id));
    } catch {
      setError('No se pudo cargar la suscripción.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: '¿Eliminar esta suscripción?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626', cancelButtonColor: '#64748B',
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await SubscriptionService.delete(id);
      navigate('/subscriptions');
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la suscripción.' });
    }
  };

  if (loading) return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ height: 40, marginBottom: 16, borderRadius: 'var(--radius-md)' }} />
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 92 }} />)}
      </div>
      <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)' }} />
    </div>
  );

  const anual = sub ? (sub.frecuencia === 'anual' ? sub.monto : sub.monto * 12) : 0;
  const dias = sub ? daysUntil(nextOccurrence(sub.diaCobro)) : null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={sub?.nombre}
        subtitle={sub?.descripcion || FRECUENCIA_LABEL[sub?.frecuencia]}
        back={
          <button onClick={() => navigate('/subscriptions')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
        }
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => navigate(`/subscriptions/${id}/edit`)}><Edit2 size={14} /> Editar</button>
            <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar</button>
          </>
        }
      />

      {error && <div className="auth-message error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <StatCard label="Monto por cobro" value={fmt(sub?.monto, sub?.moneda)} delta={FRECUENCIA_LABEL[sub?.frecuencia]} icon={Wallet} tone="brand" />
        <StatCard label="Costo anual" value={fmt(anual, sub?.moneda)} delta="Equivalente al año" icon={CalendarRange} tone="warn" />
        <StatCard
          label="Próximo cobro"
          value={dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`}
          delta={`Día ${sub?.diaCobro} de cada mes`}
          icon={CalendarClock}
          tone={dias <= 3 ? 'neg' : 'neutral'}
        />
      </div>

      <SectionCard title="Detalles de la suscripción" icon={Info}>
        <div className="info-grid">
          <InfoRow label="Nombre" value={sub?.nombre} />
          <InfoRow label="Descripción" value={sub?.descripcion || '—'} />
          <InfoRow label="Monto" value={fmt(sub?.monto, sub?.moneda)} money />
          <InfoRow label="Moneda" value={sub?.moneda} />
          <InfoRow label="Frecuencia" value={FRECUENCIA_LABEL[sub?.frecuencia]} />
          <InfoRow label="Día de cobro" value={`Día ${sub?.diaCobro}`} />
          <InfoRow label="Fecha inicio" value={fmtDateLong(sub?.fechaInicio)} />
          <InfoRow label="Fecha fin" value={fmtDateLong(sub?.fechaFin)} />
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Cobro</p>
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, color: 'var(--text)', fontSize: 13.5 }}>
              {sub?.CreditCard && <CreditCard size={13} style={{ color: 'var(--pos-600)' }} />}
              {sub?.CreditCard ? `Automático · ${sub.CreditCard.nombre}` : 'Manual'}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

const InfoRow = ({ label, value, money }) => (
  <div>
    <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</p>
    <p className={money ? 'tabular' : ''} style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5 }}>{value}</p>
  </div>
);
