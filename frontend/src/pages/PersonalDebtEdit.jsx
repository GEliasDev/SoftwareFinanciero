import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const PersonalDebtEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', descripcion: '', prestamista: '', montoCuota: '', diaPago: '', status: 'activo' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PersonalDebtService.getById(id).then(d =>
      setForm({ nombre: d.nombre, descripcion: d.descripcion || '', prestamista: d.prestamista, montoCuota: String(d.montoCuota), diaPago: String(d.diaPago), status: d.status })
    );
  }, [id]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await PersonalDebtService.update(id, {
        nombre:      form.nombre,
        descripcion: form.descripcion || undefined,
        prestamista: form.prestamista,
        montoCuota:  Number(form.montoCuota),
        diaPago:     Number(form.diaPago),
        status:      form.status,
      });
      navigate(`/personal-debts/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Editar Obligación" subtitle="Modifica los datos de esta obligación personal" />
      <div className="card" style={{ maxWidth: 520, padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input className="form-input" value={form.nombre} onChange={set('nombre')} required />
          </div>
          <div className="form-group">
            <label className="form-label">A quién le debes *</label>
            <input className="form-input" value={form.prestamista} onChange={set('prestamista')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="form-input" value={form.descripcion} onChange={set('descripcion')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Cuota mensual *</label>
              <input className="form-input" type="number" min="1" value={form.montoCuota} onChange={set('montoCuota')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Día de pago *</label>
              <input className="form-input" type="number" min="1" max="31" value={form.diaPago} onChange={set('diaPago')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-input" value={form.status} onChange={set('status')}>
              <option value="activo">Activo</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/personal-debts/${id}`)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
