import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Target } from 'lucide-react';
import { SavingsGoalService } from '../services/savingsGoalService';
import { PageHeader } from '../components/ui/PageHeader';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

export const SavingsNew = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({});
  const [form, setForm] = useState({ nombre: '', emoji: '', montoMeta: '', aporteMensual: '', fechaMeta: '', montoAcumulado: '0' });

  const errors = {};
  if (!form.nombre.trim())                   errors.nombre    = 'Ingresa un nombre';
  if (!(Number(form.montoMeta) > 0))         errors.montoMeta = 'Debe ser mayor a 0';

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

  const montoMeta     = Number(form.montoMeta)     || 0;
  const aporte        = Number(form.aporteMensual) || 0;
  const acumulado     = Number(form.montoAcumulado) || 0;
  const restante      = Math.max(0, montoMeta - acumulado);
  const mesesEst      = aporte > 0 ? Math.ceil(restante / aporte) : null;
  const progreso      = montoMeta > 0 ? Math.min(100, Math.round((acumulado / montoMeta) * 100)) : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Nueva meta de ahorro"
        subtitle="Define cuánto quieres ahorrar y en cuánto tiempo"
        back={
          <button onClick={() => navigate('/savings')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
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
            padding: '1.5rem',
            color: 'white',
            boxShadow: '0 16px 40px rgba(91,77,241,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              {form.emoji
                ? <span style={{ fontSize: 20 }}>{form.emoji}</span>
                : <Target size={18} style={{ color: 'rgba(255,255,255,0.85)' }} />}
              <div style={{ fontWeight: 700, fontSize: 14 }}>{form.nombre || 'Nombre de la meta'}</div>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                Objetivo
              </div>
              <div className="tabular" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {montoMeta ? fmt(montoMeta) : '—'}
              </div>
            </div>
            {montoMeta > 0 && (
              <>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 4, margin: '0.5rem 0' }}>
                  <div style={{ background: 'white', borderRadius: 4, height: '100%', width: `${progreso}%`, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>
                  {fmt(acumulado)} ahorrado · {progreso}%
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem' }}>
              <span>{aporte ? `Aporte: ${fmt(aporte)}/mes` : 'Sin aporte definido'}</span>
              {mesesEst && <span>~{mesesEst} mes{mesesEst !== 1 ? 'es' : ''}</span>}
            </div>
          </div>

          {montoMeta > 0 && aporte > 0 && (
            <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.625rem' }}>
                Proyección
              </p>
              {[
                { label: 'Objetivo',        value: fmt(montoMeta) },
                { label: 'Ya ahorrado',     value: fmt(acumulado) },
                { label: 'Por ahorrar',     value: fmt(restante) },
                { label: 'Tiempo est.',     value: mesesEst ? `${mesesEst} meses` : '—' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--text-3)' }}>{r.label}</span>
                  <span className="tabular" style={{ fontWeight: 600, color: 'var(--text)' }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Datos de la meta</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>¿Qué estás ahorrando y cuánto necesitas?</p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Emoji</label>
                  <input
                    className="form-input"
                    value={form.emoji}
                    onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                    placeholder="🎯"
                    style={{ textAlign: 'center', fontSize: 20 }}
                    maxLength={2}
                  />
                </div>
                {field('nombre', 'Nombre de la meta *', null, { placeholder: 'Ej: Fondo de emergencia' })}
              </div>

              {field('montoMeta', 'Monto objetivo (COP) *', null, { type: 'number', min: '1', placeholder: '5 000 000' })}

              <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.125rem' }}>Progreso inicial y plazo</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 0.75rem' }}>Opcional — se usa para estimar cuándo llegas a tu meta.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {field('aporteMensual', 'Aporte mensual planeado', 'Cuánto aportarás cada mes', { type: 'number', min: '0', placeholder: '0' })}
                  {field('montoAcumulado', 'Ya tengo ahorrado', '0 si empiezas desde cero', { type: 'number', min: '0', placeholder: '0' })}
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  {field('fechaMeta', 'Fecha objetivo', 'Opcional — fecha límite para alcanzar la meta', { type: 'date' })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/savings')}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Check size={14} /> {saving ? 'Guardando...' : 'Crear meta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
