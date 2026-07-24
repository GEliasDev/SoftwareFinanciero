import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Target, Lock } from 'lucide-react';
import { SavingsGoalService } from '../services/savingsGoalService';
import { PageHeader } from '../components/ui/PageHeader';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

export const SavingsEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({});
  const [goalName, setGoalName] = useState('');
  // montoAcumulado no es editable (cambia con los aportes) — se guarda solo
  // para mostrarlo en solo-lectura y alimentar la vista previa.
  const [acumulado, setAcumulado] = useState(0);
  const [form, setForm] = useState({ nombre: '', emoji: '', montoMeta: '', aporteMensual: '', fechaMeta: '', status: 'activo' });

  useEffect(() => {
    SavingsGoalService.getById(id).then(g => {
      setGoalName(g.nombre);
      setAcumulado(Number(g.montoAcumulado) || 0);
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
      <label className="form-label" htmlFor={name}>{label}</label>
      <input
        id={name} className={`form-input ${showErr(name) ? 'error' : ''}`}
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

  const montoMeta = Number(form.montoMeta)     || 0;
  const aporte    = Number(form.aporteMensual) || 0;
  const restante  = Math.max(0, montoMeta - acumulado);
  const mesesEst  = aporte > 0 ? Math.ceil(restante / aporte) : null;
  const progreso  = montoMeta > 0 ? Math.min(100, Math.round((acumulado / montoMeta) * 100)) : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Editar meta de ahorro"
        subtitle={goalName || 'Modifica los parámetros de tu meta'}
        back={
          <button onClick={() => navigate(`/savings/${id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
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
                { label: 'Objetivo',    value: fmt(montoMeta) },
                { label: 'Ya ahorrado', value: fmt(acumulado) },
                { label: 'Por ahorrar', value: fmt(restante) },
                { label: 'Tiempo est.', value: mesesEst ? `${mesesEst} meses` : '—' },
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
              <div className="emoji-row">
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
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.125rem' }}>Progreso, plazo y estado</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 0.75rem' }}>Se usa para estimar cuándo llegas a tu meta.</p>
                <div className="form-row-2">
                  {field('aporteMensual', 'Aporte mensual planeado', 'Cuánto aportarás cada mes', { type: 'number', min: '0', placeholder: '0' })}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Ya tengo ahorrado</label>
                    <input className="form-input" value={acumulado} disabled />
                    <p className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={10} /> Se actualiza con los aportes, no aquí
                    </p>
                  </div>
                </div>
                <div className="form-row-2" style={{ marginTop: '0.75rem' }}>
                  {field('fechaMeta', 'Fecha objetivo', 'Opcional — fecha límite para alcanzar la meta', { type: 'date' })}
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
    </div>
  );
};
