import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { SubscriptionService } from '../services/subscriptionService';
import { ArrowLeft, Edit2, Trash2, Check, X, Wallet, CalendarRange, CalendarClock, Info } from 'lucide-react';
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await SubscriptionService.getById(id);
      setSub(data);
      setEditData({
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        monto: data.monto,
        moneda: data.moneda,
        frecuencia: data.frecuencia,
        diaCobro: data.diaCobro,
        fechaInicio: data.fechaInicio?.slice(0, 10) || '',
        fechaFin: data.fechaFin?.slice(0, 10) || '',
      });
    } catch {
      setError('No se pudo cargar la suscripción.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await SubscriptionService.update(id, {
        nombre: editData.nombre,
        descripcion: editData.descripcion || undefined,
        monto: Number(editData.monto),
        moneda: editData.moneda,
        frecuencia: editData.frecuencia,
        diaCobro: Number(editData.diaCobro),
        fechaInicio: editData.fechaInicio,
        fechaFin: editData.fechaFin || undefined,
      });
      await load();
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar.');
    } finally {
      setSaving(false);
    }
  };

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
    <div className="animate-fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="skeleton" style={{ height: 40, marginBottom: 16, borderRadius: 'var(--radius-md)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 92 }} />)}
      </div>
      <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)' }} />
    </div>
  );

  const anual = sub ? (sub.frecuencia === 'anual' ? sub.monto : sub.monto * 12) : 0;
  const dias = sub ? daysUntil(nextOccurrence(sub.diaCobro)) : null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      <PageHeader
        title={sub?.nombre}
        subtitle={sub?.descripcion || FRECUENCIA_LABEL[sub?.frecuencia]}
        back={
          <button onClick={() => navigate('/subscriptions')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
        }
        actions={!editing && (
          <>
            <button className="btn btn-secondary" onClick={() => setEditing(true)}><Edit2 size={14} /> Editar</button>
            <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar</button>
          </>
        )}
      />

      {error && <div className="auth-message error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {!editing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
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
      )}

      {!editing ? (
        <SectionCard title="Detalles de la suscripción" icon={Info}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <InfoRow label="Nombre" value={sub?.nombre} />
            <InfoRow label="Descripción" value={sub?.descripcion || '—'} />
            <InfoRow label="Monto" value={fmt(sub?.monto, sub?.moneda)} money />
            <InfoRow label="Moneda" value={sub?.moneda} />
            <InfoRow label="Frecuencia" value={FRECUENCIA_LABEL[sub?.frecuencia]} />
            <InfoRow label="Día de cobro" value={`Día ${sub?.diaCobro}`} />
            <InfoRow label="Fecha inicio" value={fmtDateLong(sub?.fechaInicio)} />
            <InfoRow label="Fecha fin" value={fmtDateLong(sub?.fechaFin)} />
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Editar suscripción" icon={Edit2}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" name="nombre" value={editData.nombre} onChange={handleEditChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input className="form-input" name="descripcion" value={editData.descripcion} onChange={handleEditChange} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Monto *</label>
                <input className="form-input" type="number" name="monto" value={editData.monto} onChange={handleEditChange} required min="0.01" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Moneda *</label>
                <select className="form-input" name="moneda" value={editData.moneda} onChange={handleEditChange}>
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Frecuencia *</label>
                <select className="form-input" name="frecuencia" value={editData.frecuencia} onChange={handleEditChange}>
                  <option value="mensual">Mensual</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Día de cobro * (1-31)</label>
                <input className="form-input" type="number" name="diaCobro" value={editData.diaCobro} onChange={handleEditChange} required min="1" max="31" />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha inicio *</label>
                <input className="form-input" type="date" name="fechaInicio" value={editData.fechaInicio} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha fin (opcional)</label>
                <input className="form-input" type="date" name="fechaFin" value={editData.fechaFin} onChange={handleEditChange} />
              </div>
            </div>
            <div className="flex justify-end gap-2" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}><X size={14} /> Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}><Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </SectionCard>
      )}
    </div>
  );
};

const InfoRow = ({ label, value, money }) => (
  <div>
    <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</p>
    <p className={money ? 'tabular' : ''} style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5 }}>{value}</p>
  </div>
);
