import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BankCreditService } from '../services/bankCreditService';
import {
  ArrowLeft, Info, Landmark, ChevronRight, ChevronLeft, Check, AlertCircle, Wallet,
} from 'lucide-react';
import { Stepper } from '../components/ui/Stepper';
import { fmt, fmtDateLong } from '../utils/format';

const STEPS = ['Identidad', 'Financiero', 'Fechas'];
const STEP_FIELDS = [['nombre', 'entidad', 'tipoCredito'], ['montoTotal', 'numeroCuotas', 'tasaInteres', 'cuotaAdministracion', 'seguro', 'cuotasPagadas'], ['diaPago', 'fechaInicio']];

const calcCuota = (monto, cuotas, tasaMensualPct) => {
  if (!monto || cuotas < 1) return 0;
  if (!tasaMensualPct) return monto / cuotas;
  const i = tasaMensualPct / 100;
  const f = Math.pow(1 + i, cuotas);
  return monto * (i * f) / (f - 1);
};

export const BankCreditNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    nombre: '', entidad: '', tipoCredito: 'otro', numeroReferencia: '',
    montoTotal: '', numeroCuotas: '', tasaInteres: '', tipoTasa: 'mensual',
    cuotaAdministracion: '', seguro: '', cuotasPagadas: '0', diaPago: '', fechaInicio: '',
  });

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const markTouched = (name) => setTouched(t => ({ ...t, [name]: true }));

  const errors = {};
  if (!formData.nombre.trim()) errors.nombre = 'Ingresa un nombre';
  if (!formData.entidad.trim()) errors.entidad = 'Ingresa la entidad';
  if (!(Number(formData.montoTotal) > 0)) errors.montoTotal = 'Debe ser mayor a 0';
  if (!(Number(formData.numeroCuotas) >= 1)) errors.numeroCuotas = 'Mínimo 1 cuota';
  if (!(Number(formData.tasaInteres) > 0)) errors.tasaInteres = 'Debe ser mayor a 0';
  if (formData.cuotaAdministracion && Number(formData.cuotaAdministracion) < 0) errors.cuotaAdministracion = 'No puede ser negativa';
  const cuotasPag = Number(formData.cuotasPagadas) || 0;
  if (cuotasPag < 0) errors.cuotasPagadas = 'No puede ser negativo';
  if (Number(formData.numeroCuotas) > 0 && cuotasPag >= Number(formData.numeroCuotas)) errors.cuotasPagadas = 'Debe ser menor al total de cuotas';
  const dia = Number(formData.diaPago);
  if (!(dia >= 1 && dia <= 31)) errors.diaPago = 'Día entre 1 y 31';
  if (!formData.fechaInicio) errors.fechaInicio = 'Selecciona una fecha';

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
      await BankCreditService.create({
        nombre: formData.nombre,
        entidad: formData.entidad,
        tipoCredito: formData.tipoCredito,
        numeroReferencia: formData.numeroReferencia || undefined,
        montoTotal: Number(formData.montoTotal),
        numeroCuotas: Number(formData.numeroCuotas),
        tasaInteres: Number(formData.tasaInteres),
        tipoTasa: formData.tipoTasa,
        cuotaAdministracion: formData.cuotaAdministracion ? Number(formData.cuotaAdministracion) : 0,
        seguro: formData.seguro ? Number(formData.seguro) : 0,
        cuotasPagadas: Number(formData.cuotasPagadas) || 0,
        diaPago: Number(formData.diaPago),
        fechaInicio: formData.fechaInicio,
      });
      navigate('/bank-credits');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear el crédito.');
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, hint, props = {}) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label">{label}</label>
      <input className={`form-input ${showErr(name) ? 'error' : ''}`} name={name} value={formData[name]} onChange={handleChange} onBlur={() => markTouched(name)} {...props} />
      {showErr(name) ? <p className="form-error"><AlertCircle size={11} /> {errors[name]}</p> : hint && <p className="form-hint">{hint}</p>}
    </div>
  );

  // Vista previa: cuota estimada por amortización francesa.
  const monto = Number(formData.montoTotal) || 0;
  const cuotas = Number(formData.numeroCuotas) || 0;
  const tasa = Number(formData.tasaInteres) || 0;
  const admin = Number(formData.cuotaAdministracion) || 0;
  const seguro = Number(formData.seguro) || 0;
  const tasaMensual = tasa ? (formData.tipoTasa === 'anual' ? (Math.pow(1 + tasa / 100, 1 / 12) - 1) * 100 : tasa) : 0;
  const cuotaBase = monto && cuotas ? calcCuota(monto, cuotas, tasaMensual) : 0;
  const cuotaMensual = cuotaBase + admin + seguro;
  const totalAPagar = cuotaMensual * cuotas;
  const totalIntereses = cuotaBase * cuotas - monto;
  const fechaFin = formData.fechaInicio && cuotas
    ? (() => { const d = new Date(formData.fechaInicio); d.setMonth(d.getMonth() + cuotas); return d.toISOString().slice(0, 10); })()
    : null;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/bank-credits')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Nuevo Crédito Bancario</h1>
            <p className="page-subtitle">Registra tu crédito en 3 pasos y mira la cuota estimada en vivo</p>
          </div>
        </div>
      </div>

      {error && <div className="info-box danger" style={{ marginBottom: '1rem' }}><Info size={14} />{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Preview */}
        <div style={{ position: 'sticky', top: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ borderRadius: 16, background: 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-800) 100%)', padding: '1.5rem', color: 'white', boxShadow: '0 16px 40px rgba(91,77,241,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <Landmark size={18} style={{ color: 'rgba(255,255,255,0.85)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{formData.nombre || 'Nombre del crédito'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{formData.entidad || 'Entidad'}</div>
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Cuota mensual estimada</div>
              <div className="tabular" style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{cuotaMensual ? fmt(cuotaMensual) : '—'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem' }}>
              <span>{cuotas ? `${cuotas} cuotas` : '— cuotas'}</span>
              <span>{tasaMensual ? `${tasaMensual.toFixed(2)}% M.V.` : ''}</span>
            </div>
          </div>

          {cuotaMensual > 0 && (
            <div className="card" style={{ padding: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.625rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Wallet size={12} /> Proyección</p>
              {[
                { label: 'Total a pagar', value: fmt(totalAPagar), color: 'var(--text)' },
                { label: 'Total intereses', value: fmt(totalIntereses), color: 'var(--neg-600)' },
                ...(admin > 0 ? [{ label: 'Cuota base', value: fmt(cuotaBase), color: 'var(--text-2)' }] : []),
                ...(fechaFin ? [{ label: 'Fin estimado', value: fmtDateLong(fechaFin), color: 'var(--text-2)' }] : []),
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{r.label}</span>
                  <span className="tabular" style={{ fontWeight: 600, color: r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Asistente */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <Stepper steps={STEPS} current={step} />
          <form onSubmit={handleSubmit}>
            {step === 0 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Identidad del crédito</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>¿Cómo se llama, de qué entidad y qué tipo?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {field('nombre', 'Nombre / Alias *', 'Como quieres identificar este crédito', { placeholder: 'Ej: Crédito Addi Electrodomésticos' })}
                  {field('entidad', 'Entidad *', null, { placeholder: 'Ej: Addi, Sistecrédito, Bancolombia…' })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tipo de crédito</label>
                    <select className="form-input" name="tipoCredito" value={formData.tipoCredito} onChange={handleChange}>
                      <option value="libre_inversion">Libre inversión</option>
                      <option value="consumo">Consumo</option>
                      <option value="libranza">Libranza</option>
                      <option value="vehiculo">Vehículo</option>
                      <option value="hipotecario">Hipotecario</option>
                      <option value="fintech">Fintech (Addi / Sistecrédito…)</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  {field('numeroReferencia', 'N.° referencia / obligación', 'Opcional — número que te da la entidad', { placeholder: 'Ej: OBL-2025-00123' })}
                </div>
              </div>
            )}
            {step === 1 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Datos financieros</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Monto, cuotas y tasa. Verás la cuota estimada a la izquierda.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {field('montoTotal', 'Monto total (COP) *', 'Capital solicitado', { type: 'number', min: '0.01', step: '0.01', placeholder: '0.00' })}
                  {field('numeroCuotas', 'Número de cuotas *', null, { type: 'number', min: '1', step: '1', placeholder: 'Ej: 36' })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {field('tasaInteres', 'Tasa de interés (%) *', null, { type: 'number', min: '0.01', step: '0.01', placeholder: 'Ej: 1.8' })}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tipo de tasa *</label>
                    <select className="form-input" name="tipoTasa" value={formData.tipoTasa} onChange={handleChange}>
                      <option value="mensual">Mensual (M.V.)</option>
                      <option value="anual">Anual (E.A.)</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {field('cuotaAdministracion', 'Cuota administración', 'Cargo fijo mensual de administración', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
                  {field('seguro', 'Seguro / aval mensual', 'Seguro de vida o aval (Addi, Sistecrédito…)', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
                </div>
                {field('cuotasPagadas', 'Cuotas ya pagadas', 'Si registras un crédito en curso, indica cuántas cuotas ya pagaste', { type: 'number', min: '0', step: '1', placeholder: '0' })}
              </div>
            )}
            {step === 2 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Fechas</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Día de pago e inicio del crédito</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {field('diaPago', 'Día de pago * (1–31)', 'Día del mes en que pagas la cuota', { type: 'number', min: '1', max: '31', placeholder: 'Ej: 5' })}
                  {field('fechaInicio', 'Fecha de inicio *', 'Cuándo arrancó el crédito', { type: 'date' })}
                </div>
                <div className="info-box primary" style={{ marginTop: '1.25rem', fontSize: 12 }}>
                  <Info size={13} style={{ flexShrink: 0 }} />
                  <span>El valor exacto de cuota, intereses y saldo se calcula en el servidor al crear el crédito.</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              {step > 0
                ? <button type="button" className="btn btn-secondary" onClick={handleBack}><ChevronLeft size={15} /> Atrás</button>
                : <button type="button" className="btn btn-secondary" onClick={() => navigate('/bank-credits')}>Cancelar</button>}
              {step < STEPS.length - 1
                ? <button type="button" className="btn btn-primary" onClick={handleNext}>Siguiente <ChevronRight size={15} /></button>
                : <button type="submit" className="btn btn-primary" disabled={loading}><Check size={14} /> {loading ? 'Guardando...' : 'Crear crédito'}</button>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
