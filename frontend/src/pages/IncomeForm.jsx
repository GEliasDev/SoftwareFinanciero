import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Wallet, Repeat, Zap } from 'lucide-react';
import { IncomeService } from '../services/incomeService';
import { PageHeader } from '../components/ui/PageHeader';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

const TIPO_OPTIONS = [
  {
    value: 'fijo',
    icon:  Wallet,
    label: 'Mensual',
    desc:  'Ingreso que llega todos los meses: salario, honorarios fijos, arriendo que recibes. Siempre cuenta en tu Dinero Libre.',
  },
  {
    value: 'extra',
    icon:  Zap,
    label: 'Extra',
    desc:  'Ingreso que no se repite: bono, trabajo puntual, venta. Cuenta en tu Dinero Libre solo este mes y desaparece solo el próximo.',
  },
];

export const IncomeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({});
  const [form, setForm] = useState({ nombre: '', monto: '', diaCobro: '', tipo: 'fijo', status: 'activo' });

  useEffect(() => {
    if (!isEdit) return;
    IncomeService.getById(id).then(inc =>
      setForm({
        nombre:   inc.nombre,
        monto:    String(inc.monto),
        diaCobro: String(inc.diaCobro),
        tipo:     inc.tipo || 'fijo',
        status:   inc.status,
      })
    );
  }, [id, isEdit]);

  const errors = {};
  if (!form.nombre.trim())        errors.nombre   = 'Ingresa un nombre';
  if (!(Number(form.monto) > 0))  errors.monto    = 'Debe ser mayor a 0';
  const dia = Number(form.diaCobro);
  if (!(dia >= 1 && dia <= 31))   errors.diaCobro = 'Día entre 1 y 31';

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
    setTouched(Object.fromEntries(Object.keys(form).map(k => [k, true])));
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre, monto: Number(form.monto),
        tipo: form.tipo, diaCobro: Number(form.diaCobro), status: form.status,
      };
      if (isEdit) { await IncomeService.update(id, payload); }
      else        { await IncomeService.create(payload); }
      navigate('/income');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  const preview = {
    nombre:   form.nombre   || (form.tipo === 'extra' ? 'Ingreso extra' : 'Nombre del ingreso'),
    monto:    Number(form.monto) || 0,
    diaCobro: form.diaCobro || '—',
  };

  const accentColor = form.tipo === 'extra' ? 'var(--warn-600)' : 'var(--pos-600)';
  const accentDark  = form.tipo === 'extra' ? '#b45309' : 'var(--pos-700)';
  const shadowColor = form.tipo === 'extra' ? 'rgba(217,119,6,0.25)' : 'rgba(5,150,105,0.25)';
  const TipoIcon    = form.tipo === 'extra' ? Zap : Wallet;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={isEdit ? 'Editar ingreso' : 'Nuevo ingreso'}
        subtitle={isEdit ? 'Modifica los datos de este ingreso' : 'Registra una fuente de dinero'}
        back={
          <button onClick={() => navigate('/income')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
        }
      />

      {/* Selector de tipo — solo en creación */}
      {!isEdit && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.5rem' }}>
          {TIPO_OPTIONS.map(({ value, icon: Icon, label, desc }) => (
            <div
              key={value}
              onClick={() => setForm(f => ({ ...f, tipo: value }))}
              role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setForm(f => ({ ...f, tipo: value }))}
              style={{
                cursor: 'pointer', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)',
                border: `2px solid ${form.tipo === value ? accentColor : 'var(--color-border)'}`,
                background: form.tipo === value ? `color-mix(in srgb, ${accentColor} 6%, var(--surface))` : 'var(--surface)',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icon size={16} style={{ color: form.tipo === value ? accentColor : 'var(--text-3)' }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: form.tipo === value ? accentColor : 'var(--text)' }}>{label}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      )}

      <div className="wizard-grid">
        {/* Preview */}
        <div>
          <div style={{
            borderRadius: 16,
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%)`,
            padding: '1.5rem',
            color: 'white',
            boxShadow: `0 16px 40px ${shadowColor}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <TipoIcon size={18} style={{ color: 'rgba(255,255,255,0.85)' }} />
              <div style={{ fontWeight: 700, fontSize: 14 }}>{preview.nombre}</div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                {form.tipo === 'extra' ? 'Monto del ingreso' : 'Monto mensual'}
              </div>
              <div className="tabular" style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {preview.monto ? fmt(preview.monto) : '—'}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem' }}>
              {form.tipo === 'extra'
                ? <span>Solo cuenta este mes · El próximo mes ya no aparece en Dinero Libre</span>
                : <span>Llega el día {preview.diaCobro} de cada mes · Siempre cuenta</span>
              }
            </div>
          </div>

          {form.tipo === 'fijo' && preview.monto > 0 && (
            <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.625rem' }}>
                Proyección anual
              </p>
              {[
                { label: 'Mensual', value: fmt(preview.monto) },
                { label: 'Anual',   value: fmt(preview.monto * 12) },
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
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>
            {isEdit ? 'Datos del ingreso' : form.tipo === 'extra' ? 'Datos del ingreso extra' : 'Datos del ingreso mensual'}
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
            {form.tipo === 'extra'
              ? '¿Cuánto recibiste? Solo contará en el Dinero Libre de este mes.'
              : isEdit ? '¿Qué quieres cambiar?' : '¿Cómo se llama, cuánto llega y qué día?'
            }
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {field('nombre', 'Nombre *', null, {
                placeholder: form.tipo === 'extra' ? 'Ej: Proyecto freelance, Regalo' : 'Ej: Salario Bancolombia',
              })}
              <div className="form-row-2">
                {field('monto', form.tipo === 'extra' ? 'Monto (COP) *' : 'Monto mensual (COP) *', null, { type: 'number', min: '1', placeholder: '500 000' })}
                {field('diaCobro', form.tipo === 'extra' ? 'Día en que lo recibiste *' : 'Día en que llega *', 'Día del mes (1–31)', { type: 'number', min: '1', max: '31', placeholder: '15' })}
              </div>
              {isEdit && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/income')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Check size={14} /> {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : form.tipo === 'extra' ? 'Registrar ingreso extra' : 'Crear fuente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
