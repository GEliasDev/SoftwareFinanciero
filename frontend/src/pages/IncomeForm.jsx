import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IncomeService } from '../services/incomeService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const IncomeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ nombre: '', monto: '', diaCobro: '1', status: 'activo' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    IncomeService.getById(id).then(inc =>
      setForm({ nombre: inc.nombre, monto: String(inc.monto), diaCobro: String(inc.diaCobro), status: inc.status })
    );
  }, [id, isEdit]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { nombre: form.nombre, monto: Number(form.monto), diaCobro: Number(form.diaCobro), status: form.status };
      if (isEdit) { await IncomeService.update(id, payload); }
      else { await IncomeService.create(payload); }
      navigate('/income');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={isEdit ? 'Editar fuente de ingreso' : 'Nueva fuente de ingreso'}
        subtitle="Ingreso mensual recurrente"
      />
      <div className="card" style={{ maxWidth: 480, padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nombre <span style={{ color: 'var(--neg-600)' }}>*</span></label>
            <input className="form-input" value={form.nombre} onChange={set('nombre')} placeholder="Ej: Salario Bancolombia" required />
          </div>
          <div className="form-group">
            <label className="form-label">Monto mensual (COP) <span style={{ color: 'var(--neg-600)' }}>*</span></label>
            <input className="form-input" type="number" min="1" value={form.monto} onChange={set('monto')} placeholder="3500000" required />
          </div>
          <div className="form-group">
            <label className="form-label">Día en que llega (1-31) <span style={{ color: 'var(--neg-600)' }}>*</span></label>
            <input className="form-input" type="number" min="1" max="31" value={form.diaCobro} onChange={set('diaCobro')} required />
          </div>
          {isEdit && (
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-input" value={form.status} onChange={set('status')}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/income')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear fuente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
