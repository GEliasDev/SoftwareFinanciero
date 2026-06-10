import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { SavingsGoalService } from '../services/savingsGoalService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const SavingsEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({});
  const [goalName, setGoalName] = useState('');
  const [form, setForm] = useState({ nombre: '', emoji: '', montoMeta: '', aporteMensual: '', fechaMeta: '', status: 'activo' });

  useEffect(() => {
    SavingsGoalService.getById(id).then(g => {
      setGoalName(g.nombre);
      setForm({
        nombre:        g.nombre,
        emoji:         g.emoji || '',
        montoMeta:     String(g.montoMeta),
        aporteMensual: String(g.aporteMensual),
        fechaMeta:     g.fechaMeta || '',
        status:        g.status,
      });
    });
  }, [id]);

  const errors = {};
  if (!form.nombre.trim())             errors.nombre    = 'Ingresa un nombre';
  if (!(Number(form.montoMeta) > 0))   errors.montoMeta = 'Debe ser mayor a 0';

  const showErr = (f) => touched[f] && errors[f];
  const mark    = (f) => setTouched(t => ({ ...t, [f]: true }));

  const field = (name, label, hint, props = {}) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label">{label}</label>
      <input
        className={`form-input ${showErr(name) ? 'error' : ''}`}
        value={form[name]}
        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        onBlur={() => mark(name)}
        {...props}
      />
      {showErr(name)
        ? <p className="form-error"><AlertCircle size={11} /> {errors[name]}</p>
        : hint && <p className="form-hint">{hint}</p>}
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(errors).map(k => [k, true])));
    if (Object.keys(errors).length > 0) return;
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
    <div className="animate-fade-in" style={{ maxWidth: 820 }}>
      <PageHeader
        title="Editar meta de ahorro"
        subtitle={goalName || 'Modifica los parámetros de tu meta'}
        back={
          <button onClick={() => navigate(`/savings/${id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
        }
      />

      <div className="card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Identidad de la meta</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Nombre, emoji y objetivo</p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Emoji</label>
                <input
                  className="form-input"
                  value={form.emoji}
                  onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                  style={{ textAlign: 'center', fontSize: 20 }}
                  maxLength={2}
                />
              </div>
              {field('nombre', 'Nombre *', null, { placeholder: 'Ej: Fondo de emergencia' })}
            </div>
            {field('montoMeta', 'Monto objetivo (COP) *', null, { type: 'number', min: '1' })}

            <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.75rem' }}>Plazo y estado</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                {field('aporteMensual', 'Aporte mensual', 'Referencia para proyectar el tiempo', { type: 'number', min: '0' })}
                {field('fechaMeta', 'Fecha objetivo', 'Opcional', { type: 'date' })}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="activo">Activo</option>
                    <option value="pausado">Pausado</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/savings/${id}`)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Check size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
