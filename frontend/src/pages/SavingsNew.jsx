import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SavingsGoalService } from '../services/savingsGoalService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const SavingsNew = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', emoji: '', montoMeta: '', aporteMensual: '', fechaMeta: '', montoAcumulado: '0' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await SavingsGoalService.create({
        nombre:         form.nombre,
        emoji:          form.emoji || undefined,
        montoMeta:      Number(form.montoMeta),
        aporteMensual:  Number(form.aporteMensual) || 0,
        fechaMeta:      form.fechaMeta || undefined,
        montoAcumulado: Number(form.montoAcumulado) || 0,
      });
      navigate('/savings');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Nueva Meta de Ahorro" subtitle="Define cuánto quieres ahorrar y para cuándo" />
      <div className="card" style={{ maxWidth: 480, padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Emoji</label>
              <input className="form-input" value={form.emoji} onChange={set('emoji')} placeholder="🎯" style={{ textAlign: 'center', fontSize: 20 }} maxLength={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre de la meta *</label>
              <input className="form-input" value={form.nombre} onChange={set('nombre')} placeholder="Ej: Fondo de emergencia" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Monto objetivo (COP) *</label>
            <input className="form-input" type="number" min="1" value={form.montoMeta} onChange={set('montoMeta')} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Aporte mensual planeado</label>
              <input className="form-input" type="number" min="0" value={form.aporteMensual} onChange={set('aporteMensual')} placeholder="0" />
              <span className="form-hint">Referencia para estimar cuándo llegas</span>
            </div>
            <div className="form-group">
              <label className="form-label">Ya tengo ahorrado</label>
              <input className="form-input" type="number" min="0" value={form.montoAcumulado} onChange={set('montoAcumulado')} placeholder="0" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha objetivo (opcional)</label>
            <input className="form-input" type="date" value={form.fechaMeta} onChange={set('fechaMeta')} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/savings')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Crear meta'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
