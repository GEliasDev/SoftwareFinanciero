import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCardService } from '../services/creditCardService';
import {
  CreditCard, Info, AlertTriangle, Check, Percent, ChevronRight, ChevronLeft, AlertCircle,
} from 'lucide-react';
import { getCardGradient } from '../utils/cardColors';
import { Stepper } from '../components/ui/Stepper';
import { FormHeader, FormSection } from '../components/ui/FormLayout';
import { CardColorPicker } from '../components/credit-cards/CardColorPicker';
import { DayOfMonthPicker } from '../components/ui/DayOfMonthPicker';
import { MoneyInput } from '../components/ui/MoneyInput';
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

export const CreditCardNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    nombre: '', entidad: '', cupoTotal: '',
    tasaInteresMensual: '', fechaCorte: '', fechaPago: '', ultimos4: '',
    comisionAvance: '', cuotaManejo: '', pagoMinimo: '', color: 'blue',
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
        comisionAvance: Number(formData.comisionAvance) || 0,
        cuotaManejo: Number(formData.cuotaManejo) || 0,
        ...(formData.pagoMinimo ? { pagoMinimo: Number(formData.pagoMinimo) } : {}),
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
  const isHighRate = tasaEA && parseFloat(tasaEA) > TASA_USURA_EA;
  const cupoNum = parseFloat(formData.cupoTotal) || 0;
  const cuotaSim = cupoNum && tasaMensual ? calcCuota(cupoNum, simCuotas, tasaMensual) : null;
  const gradient = getCardGradient(formData.color);

  // Función (no componente) para no remontar el input y perder el foco al teclear.
  const field = (name, label, hint, props = {}) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" htmlFor={name}>{label}</label>
      {props.type === 'money'
        ? <MoneyInput id={name} name={name} value={formData[name]} onChange={v => setFormData(prev => ({ ...prev, [name]: v }))} onBlur={() => markTouched(name)} error={showErr(name)} placeholder={props.placeholder} disabled={props.disabled} />
        : <input
          id={name} className={`form-input ${showErr(name) ? 'error' : ''}`}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          onBlur={() => markTouched(name)}
          {...props}
        />}
      {showErr(name)
        ? <p className="form-error"><AlertCircle size={11} /> {errors[name]}</p>
        : hint && <p className="form-hint">{hint}</p>}
    </div>
  );

  const goStep = (i) => { if (i < step) setStep(i); };

  return (
    <div className="animate-fade-in form-page">
      <FormHeader
        crumbs={[{ to: '/credit-cards', label: 'Tarjetas' }, { label: 'Nueva tarjeta' }]}
        title="Nueva tarjeta de crédito"
        subtitle="Regístrala en 3 pasos para hacer seguimiento de tus compras en cuotas."
        onBack={() => (step > 0 ? handleBack() : navigate('/credit-cards'))}
      />

      {error && <div className="notice warn" role="alert"><Info size={16} /> {error}</div>}

      <form onSubmit={handleSubmit} className="form-layout" noValidate>
        <div className="form-main">
          <Stepper steps={STEPS} current={step} onStepClick={goStep} />

          {step > 0 && (
            <div className="card step-summary">
              <span className="text-secondary">Identidad</span>
              <div><span>Nombre / alias</span><b>{formData.nombre}</b></div>
              <div><span>Entidad / banco</span><b>{formData.entidad}</b></div>
              {formData.ultimos4 && <div><span>Últimos 4 dígitos</span><b className="n">{formData.ultimos4}</b></div>}
              <button type="button" className="btn-text link-sm" onClick={() => setStep(0)}>Editar</button>
            </div>
          )}

          {step === 0 && (
            <FormSection title="Identidad de la tarjeta" desc="¿Cómo se llama y de qué banco es?">
              <div className="form-row-2">
                {field('nombre', 'Nombre / alias', 'Como quieres identificar esta tarjeta', { placeholder: 'Ej: Visa Gold, Principal…' })}
                {field('entidad', 'Entidad / banco', null, { placeholder: 'Ej: Bancolombia, Davivienda…' })}
              </div>
              <div className="form-group" style={{ maxWidth: 240, marginTop: 16 }}>
                <label className="form-label" htmlFor="ultimos4">Últimos 4 dígitos <span className="text-muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
                <input id="ultimos4" className={`form-input n ${showErr('ultimos4') ? 'error' : ''}`} style={{ letterSpacing: '0.2em' }} value={formData.ultimos4} inputMode="numeric"
                  onChange={e => setFormData(prev => ({ ...prev, ultimos4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  onBlur={() => markTouched('ultimos4')} placeholder="1234" maxLength={4} />
                {showErr('ultimos4') ? <p className="form-error"><AlertCircle size={12} /> {errors.ultimos4}</p> : <p className="form-hint">Sirve para reconocer las compras que llegan por Gmail.</p>}
              </div>
            </FormSection>
          )}

          {step === 1 && (
            <>
              <FormSection title="Cupo y tasa" desc="Los datos con los que se calculan tus cuotas e intereses.">
                <div className="form-row-2">
                  {field('cupoTotal', 'Cupo total', 'Límite de crédito asignado por el banco.', { type: 'money', placeholder: '0' })}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="tasaInteresMensual">Tasa de interés mensual</label>
                    <span className="suffix-field" data-suffix="% M.V.">
                      <input id="tasaInteresMensual" className={`form-input n ${showErr('tasaInteresMensual') ? 'error' : ''}`} type="number" name="tasaInteresMensual" value={formData.tasaInteresMensual} onChange={handleChange} onBlur={() => markTouched('tasaInteresMensual')} min="0.0001" step="0.0001" placeholder="Ej: 1,89" inputMode="decimal" />
                    </span>
                    {showErr('tasaInteresMensual') ? <p className="form-error"><AlertCircle size={12} /> {errors.tasaInteresMensual}</p>
                      : tasaEA ? <p className={`form-hint ${isHighRate ? 'text-warning' : 'text-success'}`}>{isHighRate ? '' : '✓ '}Equivale a {String(tasaEA).replace('.', ',')} % E.A. · {isHighRate ? 'tasa alta' : 'tasa normal'}</p>
                      : <p className="form-hint">Tasa mensual vencida (M.V.) del extracto.</p>}
                  </div>
                </div>
              </FormSection>
              <FormSection title="Cargos y pago mínimo" desc="Opcionales. Déjalos en 0 si tu tarjeta no los cobra.">
                <div className="form-row-2">
                  {field('comisionAvance', 'Comisión por avance', 'Se cobra cada vez que sacas un avance.', { type: 'money', placeholder: '0' })}
                  {field('cuotaManejo', 'Cuota de manejo', 'Cargo fijo que se agrega en cada corte.', { type: 'money', placeholder: '0' })}
                </div>
                <div style={{ maxWidth: 'calc(50% - 8px)', minWidth: 240, marginTop: 16 }}>
                  {field('pagoMinimo', 'Pago mínimo mensual (opcional)', 'Lo mínimo que exige el banco para no caer en mora.', { type: 'money', placeholder: '0' })}
                </div>
              </FormSection>
            </>
          )}

          {step === 2 && (
            <FormSection title="Fechas del ciclo" desc="Días de corte y de pago de tu tarjeta.">
              <DayOfMonthPicker label="Día de corte" required nombreEvento="corte" value={formData.fechaCorte}
                onChange={d => { setFormData(p => ({ ...p, fechaCorte: String(d) })); markTouched('fechaCorte'); }}
                error={showErr('fechaCorte') ? errors.fechaCorte : null} hint="Cierre del periodo de facturación." />
              <div style={{ marginTop: 20 }}>
                <DayOfMonthPicker label="Día de pago" required nombreEvento="pago" value={formData.fechaPago}
                  onChange={d => { setFormData(p => ({ ...p, fechaPago: String(d) })); markTouched('fechaPago'); }}
                  error={showErr('fechaPago') ? errors.fechaPago : null} hint="Fecha límite de pago de cada mes." />
              </div>
              {(formData.fechaCorte || formData.fechaPago) && (
                <div className="notice info" style={{ margin: '20px 0 0' }}>
                  <Info size={16} />
                  <span>
                    {corte >= 1 && corte <= 31 && <>Próximo corte: <b>{nextDatePreview(formData.fechaCorte)}</b>. </>}
                    {pago >= 1 && pago <= 31 && <>Próximo pago: <b>{nextDatePreview(formData.fechaPago)}</b>.</>}
                  </span>
                </div>
              )}
            </FormSection>
          )}

          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-ghost desktop-flex" onClick={() => navigate('/credit-cards')}>Cancelar</button>
            <div className="row" style={{ gap: 8, flex: 1, justifyContent: 'flex-end' }}>
              {step > 0 && <button type="button" className="btn btn-secondary" onClick={handleBack}><ChevronLeft size={16} /> Atrás</button>}
              {step < STEPS.length - 1
                ? <button type="button" className="btn btn-primary" onClick={handleNext}>Siguiente: {STEPS[step + 1].toLowerCase()} <ChevronRight size={16} /></button>
                : <button type="submit" className="btn btn-primary" disabled={loading}><Check size={16} /> {loading ? 'Guardando…' : 'Crear tarjeta'}</button>}
            </div>
          </div>
        </div>

        <aside className="form-aside">
          <div className="card-preview" style={{ background: gradient }}>
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <span className="card-mini-bank">{formData.entidad?.toUpperCase() || 'ENTIDAD'}</span>
                <b style={{ display: 'block', fontSize: 17, marginTop: 2 }}>{formData.nombre || 'Nombre de la tarjeta'}</b>
              </div>
              <CreditCard size={22} style={{ opacity: 0.6 }} />
            </div>
            <div>
              <span className="card-mini-label" style={{ display: 'block' }}>Cupo total</span>
              <span className="card-mini-amount n" style={{ fontSize: 28 }}>{cupoNum ? fmt(cupoNum) : '—'}</span>
            </div>
            <div className="row-between" style={{ fontSize: 13, opacity: 0.85 }}>
              <span className="n" style={{ letterSpacing: '0.15em' }}>{formData.ultimos4 ? `•••• •••• •••• ${formData.ultimos4}` : '•••• •••• •••• ••••'}</span>
              {tasaEA && <span className="n">{Number(formData.tasaInteresMensual).toLocaleString('es-CO', { maximumFractionDigits: 4 })} % M.V.</span>}
            </div>
          </div>

          <section className="card">
            <p className="form-label" style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Color de la tarjeta</p>
            <CardColorPicker value={formData.color} onChange={c => setFormData(prev => ({ ...prev, color: c }))} />
          </section>

          {tasaEA && (
            <div className={`notice ${isHighRate ? 'warn' : 'ok'}`} style={{ margin: 0, alignItems: 'flex-start' }}>
              {isHighRate ? <AlertTriangle size={16} /> : <Percent size={16} />}
              <div>
                <b>Tasa E.A.: {String(tasaEA).replace('.', ',')} %</b>
                <p style={{ margin: '2px 0 0', fontSize: 13 }}>{isHighRate ? `Supera la tasa de usura de referencia (${TASA_USURA_EA} % E.A.). Verifica con tu banco.` : `Dentro del rango habitual para tarjetas en Colombia (usura de referencia ${TASA_USURA_EA} % E.A.).`}</p>
              </div>
            </div>
          )}

          {cupoNum > 0 && tasaMensual > 0 && (
            <section className="card">
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Simulador rápido</p>
              <p className="text-sm text-secondary" style={{ margin: '2px 0 12px' }}>Si usas el cupo completo en:</p>
              <div className="segmented" style={{ width: '100%' }} role="group" aria-label="Cuotas a simular">
                {[3, 6, 12, 24].map(n => (
                  <button key={n} type="button" style={{ flex: 1 }} aria-pressed={simCuotas === n} onClick={() => setSimCuotas(n)}>{n}</button>
                ))}
              </div>
              {cuotaSim && (
                <div className="row-between" style={{ marginTop: 16, alignItems: 'baseline' }}>
                  <span className="text-secondary text-sm">Cuota aprox.</span>
                  <span><b className="n" style={{ fontSize: 22 }}>{fmt(cuotaSim)}</b> <span className="text-sm text-secondary">/mes</span></span>
                </div>
              )}
            </section>
          )}
        </aside>
      </form>
    </div>
  );
};
