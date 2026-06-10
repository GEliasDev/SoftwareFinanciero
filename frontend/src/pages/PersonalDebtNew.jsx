import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Handshake, Repeat } from 'lucide-react';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

const TIPO_OPTIONS = [
  {
    value: 'deuda',
    icon:  Handshake,
    label: 'Deuda en cuotas',
    desc:  'Préstamo a pagar en pagos fijos hasta saldar',
  },
  {
    value: 'gasto',
    icon:  Repeat,
    label: 'Gasto mensual',
    desc:  'Compromiso recurrente sin fecha de fin (gasolina, comida, etc.)',
  },
];

export const PersonalDebtNew = () => {
  const navigate = useNavigate();
  const [saving, setSaving]   = useState(false);
  const [touched, setTouched] = useState({});
  const [form, setForm] = useState({
    tipo: 'deuda', nombre: '', descripcion: '', prestamista: '',
    montoTotal: '', montoCuota: '', diaPago: '1',
  });

  const isDeuda = form.tipo === 'deuda';

  const errors = {};
  if (!form.nombre.trim())                            errors.nombre      = 'Ingresa un nombre';
  if (isDeuda && !form.prestamista.trim())            errors.prestamista = 'Indica a quién le debes';
  if (isDeuda && !(Number(form.montoTotal) > 0))      errors.montoTotal  = 'Debe ser mayor a 0';
  if (!(Number(form.montoCuota) > 0))                 errors.montoCuota  = 'Debe ser mayor a 0';
  const dia = Number(form.diaPago);
  if (!(dia >= 1 && dia <= 31))                       errors.diaPago     = 'Día entre 1 y 31';

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

  const changeTipo = (tipo) => {
    setTouched({});
    setForm(f => ({ tipo, nombre: f.nombre, descripcion: f.descripcion, prestamista: '', montoTotal: '', montoCuota: f.montoCuota, diaPago: f.diaPago }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(errors).map(k => [k, true])));
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await PersonalDebtService.create({
        tipo:        form.tipo,
        nombre:      form.nombre,
        descripcion: form.descripcion || undefined,
        ...(isDeuda ? { prestamista: form.prestamista, montoTotal: Number(form.montoTotal) } : {}),
        montoCuota:  Number(form.montoCuota),
        diaPago:     Number(form.diaPago),
      });
      navigate('/personal-debts');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  const montoTotal = Number(form.montoTotal) || 0;
  const montoCuota = Number(form.montoCuota) || 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Nueva obligación"
        subtitle="Deuda en cuotas o gasto mensual recurrente"
        back={
          <button onClick={() => navigate('/personal-debts')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
        }
      />

      {/* Selector de tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.5rem' }}>
        {TIPO_OPTIONS.map(({ value, icon: Icon, label, desc }) => (
          <div
            key={value}
            onClick={() => changeTipo(value)}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && changeTipo(value)}
            style={{
              cursor: 'pointer', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)',
              border: `2px solid ${form.tipo === value ? 'var(--brand-600)' : 'var(--color-border)'}`,
              background: form.tipo === value ? 'color-mix(in srgb, var(--brand-600) 6%, var(--surface))' : 'var(--surface)',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon size={16} style={{ color: form.tipo === value ? 'var(--brand-600)' : 'var(--text-3)' }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: form.tipo === value ? 'var(--brand-600)' : 'var(--text)' }}>{label}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{desc}</p>
          </div>
        ))}
      </div>

      <div className="wizard-grid">
        {/* Preview */}
        <div>
          <div style={{
            borderRadius: 16,
            background: isDeuda
              ? 'linear-gradient(135deg, var(--warn-600, #d97706) 0%, #b45309 100%)'
              : 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-800) 100%)',
            padding: '1.5rem', color: 'white',
            boxShadow: isDeuda ? '0 16px 40px rgba(217,119,6,0.25)' : '0 16px 40px rgba(91,77,241,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              {isDeuda ? <Handshake size={18} style={{ color: 'rgba(255,255,255,0.85)' }} /> : <Repeat size={18} style={{ color: 'rgba(255,255,255,0.85)' }} />}
              <div style={{ fontWeight: 700, fontSize: 14 }}>{form.nombre || (isDeuda ? 'Nombre de la deuda' : 'Nombre del gasto')}</div>
            </div>
            {isDeuda ? (
              <>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: '0.75rem' }}>
                  {form.prestamista ? `Con: ${form.prestamista}` : 'Acreedor por definir'}
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Saldo total</div>
                  <div className="tabular" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{montoTotal ? fmt(montoTotal) : '—'}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem' }}>
                  <span>Cuota: {montoCuota ? fmt(montoCuota) : '—'}/mes</span>
                  <span>Día {form.diaPago || '—'}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Monto mensual</div>
                  <div className="tabular" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{montoCuota ? fmt(montoCuota) : '—'}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem' }}>
                  <span>Recurrente · Día {form.diaPago || '—'} de cada mes</span>
                  {montoCuota > 0 && <span>{fmt(montoCuota * 12)}/año</span>}
                </div>
              </>
            )}
          </div>

          {isDeuda && montoTotal > 0 && montoCuota > 0 && (
            <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.625rem' }}>Resumen</p>
              {[
                { label: 'Monto total',   value: fmt(montoTotal) },
                { label: 'Cuota mensual', value: fmt(montoCuota) },
                { label: 'Día de pago',   value: `Día ${form.diaPago || '—'}` },
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
            {isDeuda ? 'Datos de la deuda' : 'Datos del gasto'}
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
            {isDeuda ? '¿Con quién, cuánto debes y en cuántas cuotas?' : '¿Cuánto pagas y cuándo?'}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {field('nombre', isDeuda ? 'Nombre de la obligación *' : 'Nombre del gasto *', null, { placeholder: isDeuda ? 'Ej: Préstamo Juan' : 'Ej: Gasolina moto' })}

              {isDeuda && (
                <>
                  {field('prestamista', 'A quién le debes *', null, { placeholder: 'Ej: Juan García' })}
                  {field('descripcion', 'Descripción', 'Opcional', { placeholder: 'Notas adicionales' })}
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.125rem' }}>Montos y plazos</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 0.75rem' }}>Con estos datos se calcula el saldo y las cuotas estimadas.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {field('montoTotal', 'Monto total (COP) *', null, { type: 'number', min: '1', placeholder: '1 000 000' })}
                      {field('montoCuota', 'Cuota mensual (COP) *', null, { type: 'number', min: '1', placeholder: '200 000' })}
                    </div>
                    {field('diaPago', 'Día de pago *', 'Día del mes (1–31)', { type: 'number', min: '1', max: '31', placeholder: '5' })}
                  </div>
                </>
              )}

              {!isDeuda && (
                <>
                  {field('descripcion', 'Descripción', 'Opcional — para qué es este gasto', { placeholder: 'Ej: Aporte comida casa' })}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {field('montoCuota', 'Monto mensual (COP) *', null, { type: 'number', min: '1', placeholder: '150 000' })}
                    {field('diaPago', 'Día de pago *', 'Día del mes (1–31)', { type: 'number', min: '1', max: '31', placeholder: '5' })}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/personal-debts')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Check size={14} /> {saving ? 'Guardando...' : isDeuda ? 'Crear deuda' : 'Crear gasto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
