import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const PersonalDebtNew = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', descripcion: '', prestamista: '', montoTotal: '', montoCuota: '', diaPago: '1', cuotasPagadas: '0' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await PersonalDebtService.create({
        nombre:        form.nombre,
        descripcion:   form.descripcion || undefined,
        prestamista:   form.prestamista,
        montoTotal:    Number(form.montoTotal),
        montoCuota:    Number(form.montoCuota),
        diaPago:       Number(form.diaPago),
        cuotasPagadas: Number(form.cuotasPagadas),
      });
      navigate('/personal-debts');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Nueva Obligación Personal" subtitle="Deuda sin interés con persona o entidad informal" />
      <div className="card" style={{ maxWidth: 520, padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nombre de la obligación *</label>
            <input className="form-input" value={form.nombre} onChange={set('nombre')} placeholder="Ej: Préstamo Juan" required />
          </div>
          <div className="form-group">
            <label className="form-label">A quién le debes *</label>
            <input className="form-input" value={form.prestamista} onChange={set('prestamista')} placeholder="Ej: Juan García" required />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="form-input" value={form.descripcion} onChange={set('descripcion')} placeholder="Opcional" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Monto total (COP) *</label>
              <input className="form-input" type="number" min="1" value={form.montoTotal} onChange={set('montoTotal')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Cuota mensual (COP) *</label>
              <input className="form-input" type="number" min="1" value={form.montoCuota} onChange={set('montoCuota')} required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Día de pago (1-31) *</label>
              <input className="form-input" type="number" min="1" max="31" value={form.diaPago} onChange={set('diaPago')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Cuotas ya pagadas</label>
              <input className="form-input" type="number" min="0" value={form.cuotasPagadas} onChange={set('cuotasPagadas')} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/personal-debts')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Crear obligación'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
