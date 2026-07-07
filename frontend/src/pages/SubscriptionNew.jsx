import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { SubscriptionService } from '../services/subscriptionService';
import {
  ArrowLeft, Repeat, ChevronRight, ChevronLeft, Check, AlertCircle,
} from 'lucide-react';
import { Stepper } from '../components/ui/Stepper';
import { fmt } from '../utils/format';

const STEPS = ['Servicio', 'Cobro'];
const STEP_FIELDS = [['nombre', 'monto'], ['diaCobro', 'fechaInicio']];

export const SubscriptionNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    nombre: '', descripcion: '', monto: '', moneda: 'COP', frecuencia: 'mensual',
    diaCobro: '', fechaInicio: '', fechaFin: '',
  });

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const markTouched = (name) => setTouched(t => ({ ...t, [name]: true }));

  const errors = {};
  if (!formData.nombre.trim()) errors.nombre = 'Ingresa un nombre';
  if (!(Number(formData.monto) > 0)) errors.monto = 'Debe ser mayor a 0';
  const dia = Number(formData.diaCobro);
  if (!(dia >= 1 && dia <= 31)) errors.diaCobro = 'Día entre 1 y 31';
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
    try {
      await SubscriptionService.create({
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        monto: Number(formData.monto),
        moneda: formData.moneda,
        frecuencia: formData.frecuencia,
        diaCobro: Number(formData.diaCobro),
        fechaInicio: formData.fechaInicio,
        fechaFin: formData.fechaFin || undefined,
      });
      navigate('/subscriptions');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Error al crear la suscripción.' });
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

  const monto = Number(formData.monto) || 0;
  const mensual = formData.frecuencia === 'anual' ? monto / 12 : monto;
  const anual = formData.frecuencia === 'anual' ? monto : monto * 12;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/subscriptions')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Nueva Suscripción</h1>
            <p className="page-subtitle">Registra tu servicio recurrente y mira cuánto te cuesta al año</p>
          </div>
        </div>
      </div>

      <div className="wizard-grid">
        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ borderRadius: 16, background: 'linear-gradient(135deg, var(--pos-600) 0%, var(--pos-700) 100%)', padding: '1.5rem', color: 'white', boxShadow: '0 16px 40px rgba(5,150,105,0.28)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <Repeat size={18} style={{ color: 'rgba(255,255,255,0.85)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{formData.nombre || 'Nombre del servicio'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{formData.frecuencia === 'anual' ? 'Cobro anual' : 'Cobro mensual'}{formData.diaCobro ? ` · día ${formData.diaCobro}` : ''}</div>
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Costo mensual equiv.</div>
              <div className="tabular" style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{mensual ? fmt(mensual, formData.moneda) : '—'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.8)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem' }}>
              <span>Al año</span>
              <span className="tabular" style={{ fontWeight: 700 }}>{anual ? fmt(anual, formData.moneda) : '—'}</span>
            </div>
          </div>
        </div>

        {/* Asistente */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <Stepper steps={STEPS} current={step} />
          <form onSubmit={handleSubmit}>
            {step === 0 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>El servicio</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>¿Qué servicio es y cuánto cuesta?</p>
                {field('nombre', 'Nombre *', 'Ej: Netflix, Spotify, AWS...', { placeholder: 'Ej: Netflix' })}
                <div style={{ marginTop: '0.75rem' }}>
                  {field('descripcion', 'Descripción (opcional)', null, { placeholder: 'Detalle adicional' })}
                </div>
                <div className="form-row-2" style={{ marginTop: '0.75rem' }}>
                  {field('monto', 'Monto *', null, { type: 'number', min: '0.01', step: '0.01', placeholder: '0.00' })}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Moneda *</label>
                    <select className="form-input" name="moneda" value={formData.moneda} onChange={handleChange}>
                      <option value="COP">COP — Peso colombiano</option>
                      <option value="USD">USD — Dólar</option>
                      <option value="EUR">EUR — Euro</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', maxWidth: 260 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Frecuencia *</label>
                    <select className="form-input" name="frecuencia" value={formData.frecuencia} onChange={handleChange}>
                      <option value="mensual">Mensual</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            {step === 1 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>El cobro</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Cuándo y desde cuándo te cobran</p>
                <div className="form-row-2">
                  {field('diaCobro', 'Día de cobro * (1–31)', 'Día del mes en que se cobra', { type: 'number', min: '1', max: '31', placeholder: 'Ej: 15' })}
                  {field('fechaInicio', 'Fecha de inicio *', 'Desde cuándo está activa', { type: 'date' })}
                </div>
                <div style={{ marginTop: '0.75rem', maxWidth: 260 }}>
                  {field('fechaFin', 'Fecha de fin (opcional)', 'Si tiene fecha de terminación', { type: 'date' })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              {step > 0
                ? <button type="button" className="btn btn-secondary" onClick={handleBack}><ChevronLeft size={15} /> Atrás</button>
                : <button type="button" className="btn btn-secondary" onClick={() => navigate('/subscriptions')}>Cancelar</button>}
              {step < STEPS.length - 1
                ? <button type="button" className="btn btn-primary" onClick={handleNext}>Siguiente <ChevronRight size={15} /></button>
                : <button type="submit" className="btn btn-primary" disabled={loading}><Check size={14} /> {loading ? 'Guardando...' : 'Crear suscripción'}</button>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
