import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BankCreditService } from '../services/bankCreditService';
import { ArrowLeft, Info } from 'lucide-react';

export const BankCreditNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nombre: '', entidad: '', montoTotal: '', numeroCuotas: '',
    tasaInteres: '', tipoTasa: 'mensual', cuotaAdministracion: '', diaPago: '', fechaInicio: '',
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
      await BankCreditService.create({
        nombre: formData.nombre,
        entidad: formData.entidad,
        montoTotal: Number(formData.montoTotal),
        numeroCuotas: Number(formData.numeroCuotas),
        tasaInteres: Number(formData.tasaInteres),
        tipoTasa: formData.tipoTasa,
        cuotaAdministracion: formData.cuotaAdministracion ? Number(formData.cuotaAdministracion) : 0,
        diaPago: Number(formData.diaPago),
        fechaInicio: formData.fechaInicio,
      });
      navigate('/bank-credits');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear el crédito.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/bank-credits')} className="btn btn-secondary btn-icon">
            <ArrowLeft size={16} />
          </button>
          <h1 className="page-title">
            Nuevo Crédito Bancario
          </h1>
        </div>
      </div>

      <div className="card">
        {error && <div className="auth-message error"><Info size={14} />{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Nombre / Alias *</label>
              <input className="form-input" name="nombre" value={formData.nombre}
                onChange={handleChange} required placeholder="Ej: Crédito Libre Inversión" />
            </div>
            <div className="form-group">
              <label className="form-label">Entidad / Banco *</label>
              <input className="form-input" name="entidad" value={formData.entidad}
                onChange={handleChange} required placeholder="Ej: Bancolombia..." />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Monto Total *</label>
              <input className="form-input" type="number" name="montoTotal" value={formData.montoTotal}
                onChange={handleChange} required min="0.01" step="0.01" placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Número de Cuotas *</label>
              <input className="form-input" type="number" name="numeroCuotas" value={formData.numeroCuotas}
                onChange={handleChange} required min="1" step="1" placeholder="Ej: 36" />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Tasa de Interés (%) *</label>
              <input className="form-input" type="number" name="tasaInteres" value={formData.tasaInteres}
                onChange={handleChange} required min="0.01" step="0.01" placeholder="Ej: 1.8" />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Tasa *</label>
              <select className="form-input" name="tipoTasa" value={formData.tipoTasa} onChange={handleChange}>
                <option value="mensual">Mensual (M.V.)</option>
                <option value="anual">Anual (E.A.)</option>
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Cuota Administración <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opcional)</span></label>
              <input className="form-input" type="number" name="cuotaAdministracion" value={formData.cuotaAdministracion}
                onChange={handleChange} min="0" step="0.01" placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Día de Pago * <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(1-31)</span></label>
              <input className="form-input" type="number" name="diaPago" value={formData.diaPago}
                onChange={handleChange} required min="1" max="31" placeholder="Ej: 5" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de Inicio *</label>
            <input className="form-input" type="date" name="fechaInicio" value={formData.fechaInicio}
              onChange={handleChange} required />
          </div>

          <div className="info-box primary" style={{ marginBottom: '1rem' }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>El valor de cuota, total de intereses y saldo pendiente se calcularán automáticamente.</span>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/bank-credits')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Crédito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
