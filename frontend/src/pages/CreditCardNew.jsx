import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCardService } from '../services/creditCardService';
import {
  ArrowLeft, CreditCard, Info, AlertTriangle, Calendar,
  DollarSign, Check, Percent, ChevronRight, ChevronLeft, AlertCircle,
} from 'lucide-react';
import { CARD_COLORS, getCardGradient } from '../utils/cardColors';
import { Stepper } from '../components/ui/Stepper';
import { fmt } from '../utils/format';

const STEPS = ['Identidad', 'Financiero', 'Fechas'];
const STEP_FIELDS = [['nombre', 'entidad', 'ultimos4'], ['cupoTotal', 'tasaInteresMensual'], ['fechaCorte', 'fechaPago']];

function calcCuota(monto, cuotas, tasaPct) {
  if (!monto || cuotas < 1) return 0;
  if (cuotas === 1) return monto;
  const i = tasaPct / 100;
  const f = Math.pow(1 + i, cuotas);
  return monto * (i * f) / (f - 1);
}

function nextDatePreview(day) {
  if (!day) return null;
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth(), Number(day));
  if (d <= today) d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}

export const CreditCardNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    nombre: '', entidad: '', cupoTotal: '',
    tasaInteresMensual: '', fechaCorte: '', fechaPago: '', ultimos4: '', color: 'blue',
  });
  const [simCuotas, setSimCuotas] = useState(12);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const markTouched = (name) => setTouched(t => ({ ...t, [name]: true }));

  // Validación en vivo
  const errors = {};
  if (!formData.nombre.trim()) errors.nombre = 'Ingresa un nombre';
  if (!formData.entidad.trim()) errors.entidad = 'Ingresa la entidad';
  if (formData.ultimos4 && formData.ultimos4.length !== 4) errors.ultimos4 = 'Deben ser 4 dígitos';
  if (!(Number(formData.cupoTotal) > 0)) errors.cupoTotal = 'Debe ser mayor a 0';
  if (!(Number(formData.tasaInteresMensual) > 0)) errors.tasaInteresMensual = 'Debe ser mayor a 0';
  const corte = Number(formData.fechaCorte);
  if (!(corte >= 1 && corte <= 31)) errors.fechaCorte = 'Día entre 1 y 31';
  const pago = Number(formData.fechaPago);
  if (!(pago >= 1 && pago <= 31)) errors.fechaPago = 'Día entre 1 y 31';

  const showErr = (f) => touched[f] && errors[f];

  const handleNext = () => {
    const fields = STEP_FIELDS[step];
    setTouched(t => ({ ...t, ...Object.fromEntries(fields.map(f => [f, true])) }));
    if (fields.some(f => errors[f])) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(formData).map(k => [k, true])));
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    setError('');
    try {
      await CreditCardService.create({
        nombre: formData.nombre,
        entidad: formData.entidad,
        cupoTotal: Number(formData.cupoTotal),
        tasaInteresMensual: Number(formData.tasaInteresMensual),
        fechaCorte: Number(formData.fechaCorte),
        fechaPago: Number(formData.fechaPago),
        ...(formData.ultimos4 ? { ultimos4: formData.ultimos4 } : {}),
        color: formData.color,
      });
      navigate('/credit-cards');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la tarjeta.');
    } finally {
      setLoading(false);
    }
  };

  const tasaMensual = parseFloat(formData.tasaInteresMensual) || 0;
  const tasaEA = tasaMensual ? ((Math.pow(1 + tasaMensual / 100, 12) - 1) * 100).toFixed(2) : null;
  const isHighRate = tasaEA && parseFloat(tasaEA) > 28.5;
  const cupoNum = parseFloat(formData.cupoTotal) || 0;
  const cuotaSim = cupoNum && tasaMensual ? calcCuota(cupoNum, simCuotas, tasaMensual) : null;
  const gradient = getCardGradient(formData.color);

  // Función (no componente) para no remontar el input y perder el foco al teclear.
  const field = (name, label, hint, props = {}) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label">{label}</label>
      <input
        className={`form-input ${showErr(name) ? 'error' : ''}`}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        onBlur={() => markTouched(name)}
        {...props}
      />
      {showErr(name)
        ? <p className="form-error"><AlertCircle size={11} /> {errors[name]}</p>
        : hint && <p className="form-hint">{hint}</p>}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/credit-cards')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Nueva Tarjeta de Crédito</h1>
            <p className="page-subtitle">Registra tu tarjeta en 3 pasos para hacer seguimiento de compras en cuotas</p>
          </div>
        </div>
      </div>

      {error && <div className="info-box danger" style={{ marginBottom: '1rem' }}><Info size={14} />{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Vista previa (persistente) ── */}
        <div style={{ position: 'sticky', top: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ borderRadius: 16, background: gradient, padding: '1.5rem', minHeight: 210, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.22)', transition: 'background 0.4s ease' }}>
            <div style={{ position: 'absolute', top: '-35%', right: '-15%', width: 250, height: 250, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-45%', left: '-10%', width: 200, height: 200, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 0.2rem', fontWeight: 700, letterSpacing: '0.12em' }}>{formData.entidad?.toUpperCase() || 'ENTIDAD'}</p>
                <p style={{ color: 'white', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{formData.nombre || 'Nombre de la tarjeta'}</p>
              </div>
              <CreditCard size={24} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: '0 0 0.2rem', fontWeight: 600, letterSpacing: '0.1em' }}>CUPO TOTAL</p>
              <p className="tabular" style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{cupoNum ? fmt(cupoNum) : '—'}</p>
            </div>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.15em' }}>{formData.ultimos4 ? `•••• •••• •••• ${formData.ultimos4}` : '•••• •••• •••• ••••'}</span>
              {tasaEA && <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 500 }}>{formData.tasaInteresMensual}% M.V.</span>}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Color de la tarjeta</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CARD_COLORS.map(c => (
                <button key={c.key} type="button" title={c.label} onClick={() => setFormData(prev => ({ ...prev, color: c.key }))}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: c.gradient, border: formData.color === c.key ? '2px solid var(--text)' : '2px solid transparent', boxShadow: formData.color === c.key ? '0 0 0 2px white, 0 0 0 4px var(--text)' : '0 2px 6px rgba(0,0,0,0.2)', cursor: 'pointer', padding: 0, outline: 'none', transform: formData.color === c.key ? 'scale(1.18)' : 'scale(1)', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }} />
              ))}
            </div>
          </div>

          {tasaEA && (
            <div className={`info-box ${isHighRate ? 'warning' : 'primary'}`}>
              {isHighRate ? <AlertTriangle size={14} /> : <Percent size={14} />}
              <div>
                <strong>Tasa E.A.: {tasaEA}%</strong>
                <p style={{ margin: '2px 0 0', fontSize: 11, lineHeight: 1.5 }}>{isHighRate ? 'Supera la tasa de usura referencial (28.5% E.A.). Verifica con tu banco.' : 'Dentro del rango habitual para tarjetas en Colombia.'}</p>
              </div>
            </div>
          )}

          {cupoNum > 0 && tasaMensual > 0 && (
            <div className="card" style={{ padding: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><DollarSign size={12} /> Simulador rápido</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 0.625rem' }}>Si usas el cupo completo en:</p>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                {[3, 6, 12, 24].map(n => (
                  <button key={n} type="button" onClick={() => setSimCuotas(n)}
                    style={{ flex: 1, padding: '0.3rem 0', fontSize: 12, fontWeight: 600, border: `1.5px solid ${simCuotas === n ? 'var(--brand-600)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', background: simCuotas === n ? 'var(--brand-50)' : 'transparent', color: simCuotas === n ? 'var(--brand-700)' : 'var(--color-text-secondary)', cursor: 'pointer', transition: 'all 0.1s ease' }}>{n}c</button>
                ))}
              </div>
              {cuotaSim && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--brand-50)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Cuota aprox.</span>
                  <span className="tabular" style={{ fontWeight: 800, fontSize: 16, color: 'var(--brand-700)' }}>{fmt(cuotaSim)}/mes</span>
                </div>
              )}
            </div>
          )}

          {(formData.fechaCorte || formData.fechaPago) && (
            <div className="card" style={{ padding: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.625rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calendar size={12} /> Próximas fechas</p>
              {formData.fechaCorte && corte >= 1 && corte <= 31 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Próximo corte</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{nextDatePreview(formData.fechaCorte)}</span>
                </div>
              )}
              {formData.fechaPago && pago >= 1 && pago <= 31 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '0.3rem 0' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Próximo pago</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{nextDatePreview(formData.fechaPago)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Asistente ── */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <Stepper steps={STEPS} current={step} />
          <form onSubmit={handleSubmit}>

            {step === 0 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Identidad de la tarjeta</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>¿Cómo se llama y de qué banco es?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {field('nombre', 'Nombre / Alias *', 'Como quieres identificar esta tarjeta', { placeholder: 'Ej: Visa Gold, Principal...' })}
                  {field('entidad', 'Entidad / Banco *', null, { placeholder: 'Ej: Bancolombia, Davivienda...' })}
                </div>
                <div style={{ maxWidth: 220 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Últimos 4 dígitos <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span></label>
                    <input className={`form-input ${showErr('ultimos4') ? 'error' : ''}`} style={{ letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums' }} value={formData.ultimos4}
                      onChange={e => setFormData(prev => ({ ...prev, ultimos4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      onBlur={() => markTouched('ultimos4')} placeholder="1234" maxLength={4} />
                    {showErr('ultimos4') ? <p className="form-error"><AlertCircle size={11} /> {errors.ultimos4}</p> : <p className="form-hint">Facilita identificarla en pantalla</p>}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Datos financieros</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Cupo y tasa de interés de la tarjeta</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {field('cupoTotal', 'Cupo total (COP) *', 'Límite de crédito asignado por el banco', { type: 'number', min: '0.01', step: '0.01', placeholder: '0.00' })}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tasa mensual (%) *</label>
                    <input className={`form-input ${showErr('tasaInteresMensual') ? 'error' : ''}`} type="number" name="tasaInteresMensual" value={formData.tasaInteresMensual} onChange={handleChange} onBlur={() => markTouched('tasaInteresMensual')} min="0.0001" step="0.0001" placeholder="Ej: 1.9872" />
                    {showErr('tasaInteresMensual') ? <p className="form-error"><AlertCircle size={11} /> {errors.tasaInteresMensual}</p>
                      : tasaEA ? <p className="form-hint" style={{ color: isHighRate ? 'var(--color-warning)' : 'var(--color-success)' }}>≈ {tasaEA}% E.A. {isHighRate ? '⚠ Alta' : '✓ Normal'}</p>
                      : <p className="form-hint">Tasa de interés mensual (M.V.)</p>}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Fechas de ciclo</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Días de corte y de pago de tu tarjeta</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {field('fechaCorte', 'Día de corte * (1–31)', 'Cierre del periodo de facturación', { type: 'number', min: '1', max: '31', placeholder: 'Ej: 20' })}
                  {field('fechaPago', 'Día de pago * (1–31)', 'Fecha límite de pago mensual', { type: 'number', min: '1', max: '31', placeholder: 'Ej: 5' })}
                </div>
                <div className="info-box primary" style={{ marginTop: '1.25rem', fontSize: 12 }}>
                  <Info size={13} style={{ flexShrink: 0 }} />
                  <span>El cupo disponible se calculará automáticamente conforme registres compras en cuotas.</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              {step > 0
                ? <button type="button" className="btn btn-secondary" onClick={handleBack}><ChevronLeft size={15} /> Atrás</button>
                : <button type="button" className="btn btn-secondary" onClick={() => navigate('/credit-cards')}>Cancelar</button>}
              {step < STEPS.length - 1
                ? <button type="button" className="btn btn-primary" onClick={handleNext}>Siguiente <ChevronRight size={15} /></button>
                : <button type="submit" className="btn btn-primary" disabled={loading}><Check size={14} /> {loading ? 'Guardando...' : 'Crear tarjeta'}</button>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
