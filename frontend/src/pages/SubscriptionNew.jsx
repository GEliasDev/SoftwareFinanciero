import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionService } from '../services/subscriptionService';
import { ArrowLeft, Info } from 'lucide-react';

export const SubscriptionNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nombre: '', descripcion: '', monto: '',
    moneda: 'COP', frecuencia: 'mensual',
    diaCobro: '', fechaInicio: '', fechaFin: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await SubscriptionService.create({
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        monto: Number(formData.monto),
        moneda: formData.moneda,
        frecuencia: formData.frecuencia,
        diaCobro: Number(formData.diaCobro),
        fechaInicio: formData.fechaInicio,
        fechaFin: formData.fechaFin || undefined,
      });
      navigate('/subscriptions');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la suscripción.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/subscriptions')} className="btn btn-secondary btn-icon">
            <ArrowLeft size={16} />
          </button>
          <h1 className="page-title">
            Nueva Suscripción
          </h1>
        </div>
      </div>

      <div className="card">
        {error && <div className="auth-message error"><Info size={14} />{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input className="form-input" name="nombre" value={formData.nombre}
              onChange={handleChange} required placeholder="Ej: Netflix, Spotify, AWS..." />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opcional)</span></label>
            <input className="form-input" name="descripcion" value={formData.descripcion}
              onChange={handleChange} placeholder="Detalle adicional" />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Monto *</label>
              <input className="form-input" type="number" name="monto" value={formData.monto}
                onChange={handleChange} required min="0.01" step="0.01" placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Moneda *</label>
              <select className="form-input" name="moneda" value={formData.moneda} onChange={handleChange}>
                <option value="COP">COP — Peso colombiano</option>
                <option value="USD">USD — Dólar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Frecuencia *</label>
              <select className="form-input" name="frecuencia" value={formData.frecuencia} onChange={handleChange}>
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Día de cobro * <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(1-31)</span></label>
              <input className="form-input" type="number" name="diaCobro" value={formData.diaCobro}
                onChange={handleChange} required min="1" max="31" placeholder="Ej: 15" />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Fecha de inicio *</label>
              <input className="form-input" type="date" name="fechaInicio" value={formData.fechaInicio}
                onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de fin <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opcional)</span></label>
              <input className="form-input" type="date" name="fechaFin" value={formData.fechaFin}
                onChange={handleChange} />
            </div>
          </div>

          <div className="flex justify-end gap-2" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/subscriptions')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Suscripción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
