import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CreditCardService } from '../services/creditCardService';
import {
  ArrowLeft, CreditCard, Check, AlertTriangle, Percent,
  ChevronRight, ChevronLeft, AlertCircle, Calendar, DollarSign,
} from 'lucide-react';
import { CARD_COLORS, getCardGradient, darkenHex } from '../utils/cardColors';
import { Stepper } from '../components/ui/Stepper';
import { DayOfMonthPicker } from '../components/ui/DayOfMonthPicker';
import { fmt } from '../utils/format';
import { TASA_USURA_EA } from '../utils/creditCard';

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

export const CreditCardEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState({});
  const [simCuotas, setSimCuotas] = useState(12);
  const [data, setData] = useState({
    nombre: '', entidad: '', cupoTotal: '', tasaInteresMensual: '',
    fechaCorte: '', fechaPago: '', status: 'activa', ultimos4: '',
    comisionAvance: '', cuotaManejo: '', pagoMinimo: '', color: 'blue',
  });

  useEffect(() => {
    CreditCardService.getById(id)
      .then(card => setData({
        nombre: card.nombre, entidad: card.entidad, cupoTotal: card.cupoTotal,
        tasaInteresMensual: card.tasaInteresMensual, fechaCorte: card.fechaCorte, fechaPago: card.fechaPago,
        status: card.status, ultimos4: card.ultimos4 ?? '',
        comisionAvance: card.comisionAvance ?? '', cuotaManejo: card.cuotaManejo ?? '',
        pagoMinimo: card.pagoMinimo ?? '', color: card.color ?? 'blue',
      }))
      .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la tarjeta.' }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => setData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const markTouched = (name) => setTouched(t => ({ ...t, [name]: true }));

  const errors = {};
  if (!String(data.nombre).trim()) errors.nombre = 'Ingresa un nombre';
  if (!String(data.entidad).trim()) errors.entidad = 'Ingresa la entidad';
  if (data.ultimos4 && String(data.ultimos4).length !== 4) errors.ultimos4 = 'Deben ser 4 dígitos';
  if (!(Number(data.cupoTotal) > 0)) errors.cupoTotal = 'Debe ser mayor a 0';
  if (!(Number(data.tasaInteresMensual) > 0)) errors.tasaInteresMensual = 'Debe ser mayor a 0';
  const corte = Number(data.fechaCorte); if (!(corte >= 1 && corte <= 31)) errors.fechaCorte = 'Día entre 1 y 31';
  const pago = Number(data.fechaPago); if (!(pago >= 1 && pago <= 31)) errors.fechaPago = 'Día entre 1 y 31';

  const showErr = (f) => touched[f] && errors[f];

  const handleNext = () => {
    const fields = STEP_FIELDS[step];
    setTouched(t => ({ ...t, ...Object.fromEntries(fields.map(f => [f, true])) }));
    if (fields.some(f => errors[f])) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(data).map(k => [k, true])));
    if (Object.keys(errors).length > 0) {
      const firstBad = STEP_FIELDS.findIndex(fs => fs.some(f => errors[f]));
      if (firstBad >= 0) setStep(firstBad);
      return;
    }
    setSaving(true);
    try {
      await CreditCardService.update(id, {
        nombre: data.nombre, entidad: data.entidad,
        cupoTotal: Number(data.cupoTotal), tasaInteresMensual: Number(data.tasaInteresMensual),
        fechaCorte: Number(data.fechaCorte), fechaPago: Number(data.fechaPago),
        comisionAvance: Number(data.comisionAvance) || 0,
        cuotaManejo: Number(data.cuotaManejo) || 0,
        pagoMinimo: data.pagoMinimo ? Number(data.pagoMinimo) : null,
        status: data.status, ultimos4: data.ultimos4 || null, color: data.color,
      });
      Swal.fire({ icon: 'success', title: '¡Actualizado!', timer: 1500, showConfirmButton: false });
      navigate(`/credit-cards/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo actualizar la tarjeta.' });
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, hint, props = {}) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" htmlFor={name}>{label}</label>
      <input id={name} className={`form-input ${showErr(name) ? 'error' : ''}`} name={name} value={data[name]} onChange={handleChange} onBlur={() => markTouched(name)} {...props} />
      {showErr(name) ? <p className="form-error"><AlertCircle size={11} /> {errors[name]}</p> : hint && <p className="form-hint">{hint}</p>}
    </div>
  );

  const tasaMensual = parseFloat(data.tasaInteresMensual) || 0;
  const tasaEA = tasaMensual ? ((Math.pow(1 + tasaMensual / 100, 12) - 1) * 100).toFixed(2) : null;
  const isHighRate = tasaEA && parseFloat(tasaEA) > TASA_USURA_EA;
  const cupoNum = parseFloat(data.cupoTotal) || 0;
  const cuotaSim = cupoNum && tasaMensual ? calcCuota(cupoNum, simCuotas, tasaMensual) : null;
  const gradient = getCardGradient(data.color);

  if (loading) return (
    <div className="animate-fade-in">
      <div className="wizard-grid">
        {[200, 340].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-md)' }} />)}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate(`/credit-cards/${id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Editar tarjeta</h1>
            <p className="page-subtitle">{data.nombre} · {data.entidad} — toca un paso para saltar a él</p>
          </div>
        </div>
      </div>

      <div className="wizard-grid">
        {/* Preview + color */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ borderRadius: 16, background: gradient, padding: '1.5rem', minHeight: 210, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.22)', transition: 'background 0.4s ease' }}>
            <div style={{ position: 'absolute', top: '-35%', right: '-15%', width: 250, height: 250, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 0.2rem', fontWeight: 700, letterSpacing: '0.12em' }}>{data.entidad?.toUpperCase() || 'ENTIDAD'}</p>
                <p style={{ color: 'white', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{data.nombre || 'Nombre de la tarjeta'}</p>
              </div>
              <CreditCard size={24} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: '0 0 0.2rem', fontWeight: 600, letterSpacing: '0.1em' }}>CUPO TOTAL</p>
              <p className="tabular" style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{cupoNum ? fmt(cupoNum) : '—'}</p>
            </div>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.15em' }}>{data.ultimos4 ? `•••• •••• •••• ${data.ultimos4}` : '•••• •••• •••• ••••'}</span>
              {tasaEA && <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 500 }}>{data.tasaInteresMensual}% M.V.</span>}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Color de la tarjeta</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {CARD_COLORS.map(c => (
                <button key={c.key} type="button" className="color-swatch" title={c.label} aria-label={`Color ${c.label}`} onClick={() => setData(prev => ({ ...prev, color: c.key }))}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: c.gradient, border: data.color === c.key ? '2px solid var(--text)' : '2px solid transparent', boxShadow: data.color === c.key ? '0 0 0 2px white, 0 0 0 4px var(--text)' : '0 2px 6px rgba(0,0,0,0.2)', cursor: 'pointer', padding: 0, outline: 'none', transform: data.color === c.key ? 'scale(1.18)' : 'scale(1)', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }} />
              ))}
              <div style={{ width: 1, height: 22, background: 'var(--color-border)', margin: '0 2px' }} />
              {/* Picker de color libre */}
              <div title="Color personalizado" style={{ position: 'relative', width: 30, height: 30, flexShrink: 0 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: data.color.startsWith('#')
                    ? `linear-gradient(135deg, ${data.color} 0%, ${darkenHex(data.color, 0.25)} 100%)`
                    : 'conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ef4444)',
                  border: data.color.startsWith('#') ? '2px solid var(--text)' : '2px solid var(--color-border)',
                  boxShadow: data.color.startsWith('#') ? '0 0 0 2px white, 0 0 0 4px var(--text)' : '0 2px 6px rgba(0,0,0,0.15)',
                  transform: data.color.startsWith('#') ? 'scale(1.18)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                }} />
                <input type="color"
                  style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none' }}
                  value={data.color.startsWith('#') ? data.color : '#5B4DF1'}
                  onChange={e => setData(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
            </div>
            {data.color.startsWith('#') && (
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: data.color, border: '1px solid var(--color-border)' }} />
                {data.color}
                <button type="button" onClick={() => setData(prev => ({ ...prev, color: 'blue' }))}
                  style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                  usar preset
                </button>
              </p>
            )}
          </div>

          {tasaEA && (
            <div className={`info-box ${isHighRate ? 'warning' : 'primary'}`}>
              {isHighRate ? <AlertTriangle size={14} /> : <Percent size={14} />}
              <div>
                <strong>Tasa E.A.: {tasaEA}%</strong>
                <p style={{ margin: '2px 0 0', fontSize: 11, lineHeight: 1.5 }}>{isHighRate ? `Supera la tasa de usura referencial (${TASA_USURA_EA}% E.A.).` : 'Dentro del rango habitual en Colombia.'}</p>
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

          {(data.fechaCorte || data.fechaPago) && (
            <div className="card" style={{ padding: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.625rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calendar size={12} /> Próximas fechas</p>
              {data.fechaCorte && corte >= 1 && corte <= 31 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Próximo corte</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{nextDatePreview(data.fechaCorte)}</span>
                </div>
              )}
              {data.fechaPago && pago >= 1 && pago <= 31 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '0.3rem 0' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Próximo pago</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{nextDatePreview(data.fechaPago)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Asistente navegable */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <Stepper steps={STEPS} current={step} onStepClick={setStep} />
          <form onSubmit={handleSubmit}>
            {step === 0 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Identidad de la tarjeta</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Nombre, banco y estado</p>
                <div className="form-row-2" style={{ marginBottom: '0.75rem' }}>
                  {field('nombre', 'Nombre / Alias *', 'Como quieres identificar esta tarjeta', { placeholder: 'Ej: Visa Gold, Principal...' })}
                  {field('entidad', 'Entidad / Banco *', null, { placeholder: 'Ej: Bancolombia, Davivienda...' })}
                </div>
                <div className="form-row-2">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Estado</label>
                    <select className="form-input" name="status" value={data.status} onChange={handleChange}>
                      <option value="activa">Activa</option>
                      <option value="bloqueada">Bloqueada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Últimos 4 dígitos (opcional)</label>
                    <input className={`form-input ${showErr('ultimos4') ? 'error' : ''}`} style={{ letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums' }} value={data.ultimos4}
                      onChange={e => setData(prev => ({ ...prev, ultimos4: e.target.value.replace(/\D/g, '').slice(0, 4) }))} onBlur={() => markTouched('ultimos4')} placeholder="1234" maxLength={4} />
                    {showErr('ultimos4') ? <p className="form-error"><AlertCircle size={11} /> {errors.ultimos4}</p> : <p className="form-hint">Facilita identificarla en pantalla</p>}
                  </div>
                </div>
              </div>
            )}
            {step === 1 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Datos financieros</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Cupo y tasa</p>
                <div className="form-row-2">
                  {field('cupoTotal', 'Cupo total (COP) *', 'El cupo disponible se ajusta solo', { type: 'number', min: '0.01', step: '0.01', placeholder: '0' })}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tasa mensual (%) *</label>
                    <input className={`form-input ${showErr('tasaInteresMensual') ? 'error' : ''}`} type="number" name="tasaInteresMensual" value={data.tasaInteresMensual} onChange={handleChange} onBlur={() => markTouched('tasaInteresMensual')} min="0.0001" step="0.0001" placeholder="Ej: 1.9872" />
                    {showErr('tasaInteresMensual') ? <p className="form-error"><AlertCircle size={11} /> {errors.tasaInteresMensual}</p>
                      : tasaEA ? <p className="form-hint" style={{ color: isHighRate ? 'var(--color-warning)' : 'var(--color-success)' }}>≈ {tasaEA}% E.A. {isHighRate ? '⚠ Alta' : '✓ Normal'}</p> : null}
                  </div>
                </div>
                <div className="form-row-2" style={{ marginTop: '0.75rem' }}>
                  {field('comisionAvance', 'Comisión por avance (COP)', 'Déjalo en 0 si la tarjeta no cobra avances', { type: 'number', min: '0', step: '0.01', placeholder: 'Ej: 9900' })}
                  {field('cuotaManejo', 'Cuota de manejo (COP)', 'Cargo fijo que se agrega en cada corte. 0 si no aplica', { type: 'number', min: '0', step: '0.01', placeholder: 'Ej: 30000' })}
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  {field('pagoMinimo', 'Pago mínimo mensual (COP)', 'Mínimo que exige el banco para no caer en mora. Opcional.', { type: 'number', min: '0', step: '0.01', placeholder: 'Ej: 150000' })}
                </div>
              </div>
            )}
            {step === 2 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Fechas de ciclo</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Días de corte y de pago</p>
                <DayOfMonthPicker
                  label="Día de corte"
                  required
                  nombreEvento="corte"
                  value={data.fechaCorte}
                  onChange={d => { setData(p => ({ ...p, fechaCorte: String(d) })); markTouched('fechaCorte'); }}
                  error={showErr('fechaCorte') ? errors.fechaCorte : null}
                  hint="Cierre del periodo de facturación"
                />
                <div style={{ marginTop: '1rem' }}>
                  <DayOfMonthPicker
                    label="Día de pago"
                    required
                    nombreEvento="pago"
                    value={data.fechaPago}
                    onChange={d => { setData(p => ({ ...p, fechaPago: String(d) })); markTouched('fechaPago'); }}
                    error={showErr('fechaPago') ? errors.fechaPago : null}
                    hint="Fecha límite de pago mensual"
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              {step > 0
                ? <button type="button" className="btn btn-secondary" onClick={() => setStep(s => s - 1)}><ChevronLeft size={15} /> Atrás</button>
                : <button type="button" className="btn btn-secondary" onClick={() => navigate(`/credit-cards/${id}`)}>Cancelar</button>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {step < STEPS.length - 1 && <button type="button" className="btn btn-secondary" onClick={handleNext}>Siguiente <ChevronRight size={15} /></button>}
                <button type="submit" className="btn btn-primary" disabled={saving}><Check size={14} /> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
