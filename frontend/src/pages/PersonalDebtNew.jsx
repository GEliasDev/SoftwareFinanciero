import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Repeat } from 'lucide-react';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { MoneyInput } from '../components/ui/MoneyInput';
import { fmt } from '../utils/format';
import { CATEGORIES } from '../utils/creditCard';
import Swal from 'sweetalert2';

export const PersonalDebtNew = () => {
  const navigate = useNavigate();
  const [saving, setSaving]   = useState(false);
  const [touched, setTouched] = useState({});
  const [form, setForm] = useState({
    nombre: '', descripcion: '', montoCuota: '', categoria: 'otros',
  });

  const montoCuota = Number(form.montoCuota) || 0;

  const errors = {};
  if (!form.nombre.trim()) errors.nombre     = 'Ingresa un nombre';
  if (!(montoCuota > 0))   errors.montoCuota = 'Debe ser mayor a 0';

  const showErr = (f) => touched[f] && errors[f];
  const mark    = (f) => setTouched(t => ({ ...t, [f]: true }));

  const field = (name, label, hint, props = {}) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" htmlFor={name}>{label}</label>
      {props.type === 'money'
        ? <MoneyInput id={name} name={name} value={form[name]} onChange={v => setForm(f => ({ ...f, [name]: v }))} onBlur={() => mark(name)} error={showErr(name)} placeholder={props.placeholder} disabled={props.disabled} />
        : <input
          id={name} className={`form-input ${showErr(name) ? 'error' : ''}`}
          value={form[name]}
          onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          onBlur={() => mark(name)}
          {...props}
        />}
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
      await PersonalDebtService.create({
        nombre: form.nombre, descripcion: form.descripcion || undefined, montoCuota, categoria: form.categoria,
      });
      navigate('/fixed-commitments');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Nuevo compromiso fijo"
        subtitle="Algo que pagas todos los meses sin falta"
        back={
          <button onClick={() => navigate('/fixed-commitments')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
        }
      />

      <div className="wizard-grid">
        {/* Preview */}
        <div>
          <div style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-800) 100%)',
            padding: '1.5rem', color: 'white',
            boxShadow: '0 16px 40px rgba(91,77,241,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <Repeat size={18} style={{ color: 'rgba(255,255,255,0.85)' }} />
              <div style={{ fontWeight: 700, fontSize: 14 }}>{form.nombre || 'Nombre del compromiso'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Monto mensual</div>
              <div className="tabular" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{montoCuota ? fmt(montoCuota) : '—'}</div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem', marginTop: '0.75rem' }}>
              {montoCuota > 0 ? `${fmt(montoCuota * 12)}/año` : 'Recurrente · todos los meses'}
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>
            Datos del compromiso
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
            ¿Cuánto pagas cada mes?
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {field('nombre', 'Nombre del compromiso *', null, { placeholder: 'Ej: Aporte comida casa' })}
              {field('montoCuota', 'Monto mensual (COP) *', null, { type: 'money', placeholder: '150 000' })}
              {field('descripcion', 'Descripción', 'Opcional — para qué es este compromiso', { placeholder: 'Ej: Aporte comida casa' })}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Categoría</label>
                {/* Misma taxonomía que Tarjetas: así este compromiso se suma
                    junto con las compras en Presupuesto del mes en curso. */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button"
                      onClick={() => setForm(f => ({ ...f, categoria: c.value }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 12, fontWeight: form.categoria === c.value ? 700 : 500,
                        padding: '5px 11px', borderRadius: 20, cursor: 'pointer', border: '1px solid',
                        borderColor: form.categoria === c.value ? c.color : 'var(--color-border)',
                        background: form.categoria === c.value ? `${c.color}18` : 'var(--surface-2)',
                        color: form.categoria === c.value ? c.color : 'var(--text-2)',
                        transition: 'all 0.12s ease',
                      }}>
                      <c.Icon size={12} /> {c.label}
                    </button>
                  ))}
                </div>
                <p className="form-hint">Para que Presupuesto lo cuente en la categoría correcta.</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/fixed-commitments')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Check size={14} /> {saving ? 'Guardando...' : 'Crear compromiso'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
