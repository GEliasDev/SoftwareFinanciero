import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SubscriptionService } from '../services/subscriptionService';
import { ArrowLeft, Repeat, Edit2, Trash2, Check, X } from 'lucide-react';

const FRECUENCIA_LABEL = { mensual: 'Mensual', anual: 'Anual' };
const MONEDA_LABEL = { COP: 'COP', USD: 'USD', EUR: 'EUR' };

const fmt = (amount, currency = 'COP') =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);

const fmtDate = (str) => {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

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
    if (!window.confirm('¿Eliminar esta suscripción?')) return;
    try {
      await SubscriptionService.delete(id);
      navigate('/subscriptions');
    } catch {
      setError('No se pudo eliminar la suscripción.');
    }
  };

  if (loading) return <div className="animate-fade-in" style={{ maxWidth: 640, margin: '0 auto' }}><p>Cargando...</p></div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate('/subscriptions')} className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2" style={{ flex: 1 }}>
          <Repeat size={20} style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-2xl m-0" style={{ flex: 1 }}>{sub?.nombre}</h1>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setEditing(true)}><Edit2 size={14} /> Editar</button>
            <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar</button>
          </div>
        )}
      </div>

      {error && <div className="auth-message error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {!editing ? (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <InfoRow label="Nombre" value={sub?.nombre} />
            <InfoRow label="Descripción" value={sub?.descripcion || '—'} />
            <InfoRow label="Monto" value={fmt(sub?.monto, sub?.moneda)} />
            <InfoRow label="Moneda" value={MONEDA_LABEL[sub?.moneda]} />
            <InfoRow label="Frecuencia" value={FRECUENCIA_LABEL[sub?.frecuencia]} />
            <InfoRow label="Día de cobro" value={`Día ${sub?.diaCobro}`} />
            <InfoRow label="Fecha inicio" value={fmtDate(sub?.fechaInicio)} />
            <InfoRow label="Fecha fin" value={fmtDate(sub?.fechaFin)} />
          </div>
        </div>
      ) : (
        <div className="card">
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
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div>
    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    <p style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</p>
  </div>
);
