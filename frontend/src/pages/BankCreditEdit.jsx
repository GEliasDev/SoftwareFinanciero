import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Info, Edit2 } from 'lucide-react';
import { BankCreditService } from '../services/bankCreditService';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';

export const BankCreditEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({ nombre: '', entidad: '', cuotaAdministracion: 0, diaPago: '' });

  useEffect(() => {
    BankCreditService.getById(id)
      .then(c => setData({ nombre: c.nombre, entidad: c.entidad, cuotaAdministracion: c.cuotaAdministracion ?? 0, diaPago: c.diaPago }))
      .catch(() => setError('No se pudo cargar el crédito.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => setData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await BankCreditService.update(id, {
        nombre: data.nombre, entidad: data.entidad,
        cuotaAdministracion: Number(data.cuotaAdministracion), diaPago: Number(data.diaPago),
      });
      navigate(`/bank-credits/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="animate-fade-in"><div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-md)' }} /></div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720 }}>
      <PageHeader
        title="Editar crédito"
        subtitle={data.nombre}
        back={<button onClick={() => navigate(`/bank-credits/${id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}><ArrowLeft size={16} /></button>}
      />
      {error && <div className="auth-message error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <SectionCard title="Datos editables" icon={Edit2}>
        <div className="info-box primary" style={{ marginBottom: '1rem', fontSize: 12 }}>
          <Info size={14} />
          <span>Solo puedes editar nombre, entidad, cuota de administración y día de pago. Los campos financieros no son modificables.</span>
        </div>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" name="nombre" value={data.nombre} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Entidad *</label>
              <input className="form-input" name="entidad" value={data.entidad} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Cuota de administración</label>
              <input className="form-input" type="number" name="cuotaAdministracion" value={data.cuotaAdministracion} onChange={handleChange} min="0" step="0.01" />
            </div>
            <div className="form-group">
              <label className="form-label">Día de pago * (1-31)</label>
              <input className="form-input" type="number" name="diaPago" value={data.diaPago} onChange={handleChange} required min="1" max="31" />
            </div>
          </div>
          <div className="flex justify-end gap-2" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/bank-credits/${id}`)}><X size={14} /> Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}><Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
};
