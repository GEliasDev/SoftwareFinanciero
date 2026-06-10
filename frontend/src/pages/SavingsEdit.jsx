import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SavingsGoalService } from '../services/savingsGoalService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const SavingsEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', emoji: '', montoMeta: '', aporteMensual: '', fechaMeta: '', status: 'activo' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    SavingsGoalService.getById(id).then(g =>
      setForm({
        nombre:        g.nombre,
        emoji:         g.emoji || '',
        montoMeta:     String(g.montoMeta),
        aporteMensual: String(g.aporteMensual),
        fechaMeta:     g.fechaMeta || '',
        status:        g.status,
      })
    );
  }, [id]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await SavingsGoalService.update(id, {
        nombre:        form.nombre,
        emoji:         form.emoji || null,
        montoMeta:     Number(form.montoMeta),
        aporteMensual: Number(form.aporteMensual) || 0,
        fechaMeta:     form.fechaMeta || null,
        status:        form.status,
      });
      navigate(`/savings/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Editar Meta de Ahorro" subtitle="Modifica los parámetros de tu meta" />
      <div className="card" style={{ maxWidth: 480, padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Emoji</label>
              <input className="form-input" value={form.emoji} onChange={set('emoji')} style={{ textAlign: 'center', fontSize: 20 }} maxLength={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={form.nombre} onChange={set('nombre')} required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Monto objetivo *</label>
              <input className="form-input" type="number" min="1" value={form.montoMeta} onChange={set('montoMeta')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Aporte mensual</label>
              <input className="form-input" type="number" min="0" value={form.aporteMensual} onChange={set('aporteMensual')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Fecha objetivo</label>
              <input className="form-input" type="date" value={form.fechaMeta} onChange={set('fechaMeta')} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-input" value={form.status} onChange={set('status')}>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="completado">Completado</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/savings/${id}`)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
