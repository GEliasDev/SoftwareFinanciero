import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGoBack } from '../hooks/useGoBack';
import Swal from '../utils/alerts';
import { CreditCardService } from '../services/creditCardService';
import {
  CreditCard, Check, AlertTriangle, Percent, ChevronRight, ChevronLeft, AlertCircle, Info,
} from 'lucide-react';
import { getCardGradient } from '../utils/cardColors';
import { FormHeader, FormSection } from '../components/ui/FormLayout';
import { CardColorPicker } from '../components/credit-cards/CardColorPicker';
import { Stepper } from '../components/ui/Stepper';
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

export const CreditCardEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack(`/credit-cards/${id}`);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState({});
  const [simCuotas, setSimCuotas] = useState(12);
  const [data, setData] = useState({
    nombre: '', entidad: '', cupoTotal: '', tasaInteresMensual: '',
    fechaCorte: '', fechaPago: '', status: 'activa', ultimos4: '', ultimos4Fisica: '',
    comisionAvance: '', cuotaManejo: '', pagoMinimo: '', color: 'blue',
  });

  useEffect(() => {
    CreditCardService.getById(id)
      .then(card => setData({
        nombre: card.nombre, entidad: card.entidad, cupoTotal: card.cupoTotal,
        tasaInteresMensual: card.tasaInteresMensual, fechaCorte: card.fechaCorte, fechaPago: card.fechaPago,
        status: card.status, ultimos4: card.ultimos4 ?? '', ultimos4Fisica: card.ultimos4Fisica ?? '',
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
  if (data.ultimos4Fisica && String(data.ultimos4Fisica).length !== 4) errors.ultimos4Fisica = 'Deben ser 4 dígitos';
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
        status: data.status, ultimos4: data.ultimos4 || null, ultimos4Fisica: data.ultimos4Fisica || null, color: data.color,
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
      {props.type === 'money'
        ? <MoneyInput id={name} name={name} value={data[name]} onChange={v => setData(prev => ({ ...prev, [name]: v }))} onBlur={() => markTouched(name)} error={showErr(name)} placeholder={props.placeholder} disabled={props.disabled} />
        : <input id={name} className={`form-input ${showErr(name) ? 'error' : ''}`} name={name} value={data[name]} onChange={handleChange} onBlur={() => markTouched(name)} {...props} />}
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
    <div aria-busy="true">
      <div className="skeleton" style={{ height: 56, width: 320, marginBottom: 20 }} />
      <div className="form-layout">
        {[380, 300].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-lg)' }} />)}
      </div>
    </div>
  );

  const lastFour = (name, label, hint) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" htmlFor={name}>{label} <span className="text-muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
      <input id={name} className={`form-input n ${showErr(name) ? 'error' : ''}`} style={{ letterSpacing: '0.2em' }} value={data[name]} inputMode="numeric"
        onChange={e => setData(prev => ({ ...prev, [name]: e.target.value.replace(/\D/g, '').slice(0, 4) }))} onBlur={() => markTouched(name)} placeholder="1234" maxLength={4} />
      {showErr(name) ? <p className="form-error"><AlertCircle size={12} /> {errors[name]}</p> : <p className="form-hint">{hint}</p>}
    </div>
  );

  return (
    <div className="animate-fade-in form-page">
      <FormHeader
        crumbs={[{ to: '/credit-cards', label: 'Tarjetas' }, { to: `/credit-cards/${id}`, label: data.nombre || 'Tarjeta' }, { label: 'Editar' }]}
        title="Editar tarjeta"
        subtitle={`${data.nombre} · ${data.entidad} — toca un paso para saltar a él`}
        onBack={goBack}
      />

      <form onSubmit={handleSubmit} className="form-layout" noValidate>
        <div className="form-main">
          <Stepper steps={STEPS} current={step} onStepClick={setStep} />

          {step === 0 && (
            <FormSection title="Identidad de la tarjeta" desc="Nombre, banco, estado y números para reconocerla.">
              <div className="form-row-2">
                {field('nombre', 'Nombre / alias', 'Como quieres identificar esta tarjeta', { placeholder: 'Ej: Visa Gold, Principal…' })}
                {field('entidad', 'Entidad / banco', null, { placeholder: 'Ej: Bancolombia, Davivienda…' })}
              </div>
              <div className="form-row-2" style={{ marginTop: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="status">Estado</label>
                  <select id="status" className="form-input" name="status" value={data.status} onChange={handleChange}>
                    <option value="activa">Activa</option>
                    <option value="bloqueada">Bloqueada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                {lastFour('ultimos4', 'Últimos 4 dígitos', 'Sirve para reconocer las compras que llegan por Gmail.')}
              </div>
              <div className="form-row-2" style={{ marginTop: 16 }}>
                {lastFour('ultimos4Fisica', 'Últimos 4 del plástico físico', 'Si tiene número digital y físico, pon aquí el otro.')}
              </div>
            </FormSection>
          )}

          {step === 1 && (
            <>
              <FormSection title="Cupo y tasa" desc="Los datos con los que se calculan tus cuotas e intereses.">
                <div className="form-row-2">
                  {field('cupoTotal', 'Cupo total', 'El cupo disponible se ajusta solo.', { type: 'money', placeholder: '0' })}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="tasaInteresMensual">Tasa de interés mensual</label>
                    <span className="suffix-field" data-suffix="% M.V.">
                      <input id="tasaInteresMensual" className={`form-input n ${showErr('tasaInteresMensual') ? 'error' : ''}`} type="number" name="tasaInteresMensual" value={data.tasaInteresMensual} onChange={handleChange} onBlur={() => markTouched('tasaInteresMensual')} min="0.0001" step="0.0001" placeholder="Ej: 1,89" inputMode="decimal" />
                    </span>
                    {showErr('tasaInteresMensual') ? <p className="form-error"><AlertCircle size={12} /> {errors.tasaInteresMensual}</p>
                      : tasaEA ? <p className={`form-hint ${isHighRate ? 'text-warning' : 'text-success'}`}>{isHighRate ? '' : '✓ '}Equivale a {String(tasaEA).replace('.', ',')} % E.A. · {isHighRate ? 'tasa alta' : 'tasa normal'}</p> : null}
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
              <DayOfMonthPicker label="Día de corte" required nombreEvento="corte" value={data.fechaCorte}
                onChange={d => { setData(p => ({ ...p, fechaCorte: String(d) })); markTouched('fechaCorte'); }}
                error={showErr('fechaCorte') ? errors.fechaCorte : null} hint="Cierre del periodo de facturación." />
              <div style={{ marginTop: 20 }}>
                <DayOfMonthPicker label="Día de pago" required nombreEvento="pago" value={data.fechaPago}
                  onChange={d => { setData(p => ({ ...p, fechaPago: String(d) })); markTouched('fechaPago'); }}
                  error={showErr('fechaPago') ? errors.fechaPago : null} hint="Fecha límite de pago de cada mes." />
              </div>
              {(data.fechaCorte || data.fechaPago) && (
                <div className="notice info" style={{ margin: '20px 0 0' }}>
                  <Info size={16} />
                  <span>
                    {corte >= 1 && corte <= 31 && <>Próximo corte: <b>{nextDatePreview(data.fechaCorte)}</b>. </>}
                    {pago >= 1 && pago <= 31 && <>Próximo pago: <b>{nextDatePreview(data.fechaPago)}</b>.</>}
                  </span>
                </div>
              )}
            </FormSection>
          )}

          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-ghost desktop-flex" onClick={goBack}>Cancelar</button>
            <div className="row" style={{ gap: 8, flex: 1, justifyContent: 'flex-end' }}>
              {step > 0 && <button type="button" className="btn btn-secondary" onClick={() => setStep(s => s - 1)}><ChevronLeft size={16} /> Atrás</button>}
              {step < STEPS.length - 1 && <button type="button" className="btn btn-secondary" onClick={handleNext}>Siguiente <ChevronRight size={16} /></button>}
              <button type="submit" className="btn btn-primary" disabled={saving}><Check size={16} /> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>

        <aside className="form-aside">
          <div className="card-preview" style={{ background: gradient }}>
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <span className="card-mini-bank">{data.entidad?.toUpperCase() || 'ENTIDAD'}</span>
                <b style={{ display: 'block', fontSize: 17, marginTop: 2 }}>{data.nombre || 'Nombre de la tarjeta'}</b>
              </div>
              <CreditCard size={22} style={{ opacity: 0.6 }} />
            </div>
            <div>
              <span className="card-mini-label" style={{ display: 'block' }}>Cupo total</span>
              <span className="card-mini-amount n" style={{ fontSize: 28 }}>{cupoNum ? fmt(cupoNum) : '—'}</span>
            </div>
            <div className="row-between" style={{ fontSize: 13, opacity: 0.85 }}>
              <span className="n" style={{ letterSpacing: '0.15em' }}>{data.ultimos4 ? `•••• •••• •••• ${data.ultimos4}` : '•••• •••• •••• ••••'}</span>
              {tasaEA && <span className="n">{Number(data.tasaInteresMensual).toLocaleString('es-CO', { maximumFractionDigits: 4 })} % M.V.</span>}
            </div>
          </div>

          <section className="card">
            <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>Color de la tarjeta</p>
            <CardColorPicker value={data.color} onChange={c => setData(prev => ({ ...prev, color: c }))} />
          </section>

          {tasaEA && (
            <div className={`notice ${isHighRate ? 'warn' : 'ok'}`} style={{ margin: 0, alignItems: 'flex-start' }}>
              {isHighRate ? <AlertTriangle size={16} /> : <Percent size={16} />}
              <div>
                <b>Tasa E.A.: {String(tasaEA).replace('.', ',')} %</b>
                <p style={{ margin: '2px 0 0', fontSize: 13 }}>{isHighRate ? `Supera la tasa de usura de referencia (${TASA_USURA_EA} % E.A.).` : 'Dentro del rango habitual en Colombia.'}</p>
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
