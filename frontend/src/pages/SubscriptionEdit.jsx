import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { SubscriptionService } from '../services/subscriptionService';
import { CreditCardService } from '../services/creditCardService';
import {
  ArrowLeft, Repeat, ChevronRight, ChevronLeft, Check, AlertCircle, CreditCard, Lock,
} from 'lucide-react';
import { Stepper } from '../components/ui/Stepper';
import { DayOfMonthPicker } from '../components/ui/DayOfMonthPicker';
import { fmt, fmtDateLong } from '../utils/format';

const STEPS = ['Servicio', 'Cobro'];
const STEP_FIELDS = [['nombre'], ['diaCobro']];

const MONEDA_LABEL = { COP: 'COP — Peso colombiano', USD: 'USD — Dólar', EUR: 'EUR — Euro' };
const FRECUENCIA_LABEL = { mensual: 'Mensual', anual: 'Anual' };

export const SubscriptionEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState({});
  const [cards, setCards] = useState([]);
  // Registro completo: monto, moneda, frecuencia y fechaInicio no son
  // editables (subscriptionUpdateSchema) — se muestran en solo-lectura y
  // alimentan la vista previa igual que en el alta.
  const [sub, setSub] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', descripcion: '', diaCobro: '', fechaFin: '', creditCardId: '', status: 'activa',
  });

  useEffect(() => {
    SubscriptionService.getById(id)
      .then(s => {
        setSub(s);
        setFormData({
          nombre:       s.nombre,
          descripcion:  s.descripcion || '',
          diaCobro:     String(s.diaCobro),
          fechaFin:     s.fechaFin?.slice(0, 10) || '',
          creditCardId: s.creditCardId || '',
          status:       s.status,
        });
      })
      .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la suscripción.' }))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    CreditCardService.getAll()
      .then(data => setCards(data.filter(c => c.status === 'activa')))
      .catch(() => {});
  }, []);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const markTouched = (name) => setTouched(t => ({ ...t, [name]: true }));

  const errors = {};
  if (!formData.nombre.trim()) errors.nombre = 'Ingresa un nombre';
  const dia = Number(formData.diaCobro);
  if (!(dia >= 1 && dia <= 31)) errors.diaCobro = 'Día entre 1 y 31';

  const showErr = (f) => touched[f] && errors[f];

  const handleNext = () => {
    const fields = STEP_FIELDS[step];
    setTouched(t => ({ ...t, ...Object.fromEntries(fields.map(f => [f, true])) }));
    if (fields.some(f => errors[f])) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(formData).map(k => [k, true])));
    if (Object.keys(errors).length > 0) {
      const firstBad = STEP_FIELDS.findIndex(fs => fs.some(f => errors[f]));
      if (firstBad >= 0) setStep(firstBad);
      return;
    }
    setSaving(true);
    try {
      await SubscriptionService.update(id, {
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        diaCobro: Number(formData.diaCobro),
        fechaFin: formData.fechaFin || undefined,
        status: formData.status,
        creditCardId: formData.creditCardId ? Number(formData.creditCardId) : null,
      });
      navigate(`/subscriptions/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Error al actualizar la suscripción.' });
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, hint, props = {}) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" htmlFor={name}>{label}</label>
      <input id={name} className={`form-input ${showErr(name) ? 'error' : ''}`} name={name} value={formData[name]} onChange={handleChange} onBlur={() => markTouched(name)} {...props} />
      {showErr(name) ? <p className="form-error"><AlertCircle size={11} /> {errors[name]}</p> : hint && <p className="form-hint">{hint}</p>}
    </div>
  );

  // Campo bloqueado: mismo aspecto que los editables, pero deshabilitado.
  const lockedField = (label, value, hint) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" htmlFor={name}>{label}</label>
      <input className="form-input" value={value} disabled />
      <p className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Lock size={10} /> {hint}
      </p>
    </div>
  );

  if (loading) return (
    <div className="animate-fade-in">
      <div className="wizard-grid">
        {[200, 340].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-md)' }} />)}
      </div>
    </div>
  );

  const monto   = parseFloat(sub?.monto ?? 0) || 0;
  const moneda  = sub?.moneda ?? 'COP';
  const mensual = sub?.frecuencia === 'anual' ? monto / 12 : monto;
  const anual   = sub?.frecuencia === 'anual' ? monto : monto * 12;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate(`/subscriptions/${id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Editar suscripción</h1>
            <p className="page-subtitle">{sub?.nombre} — toca un paso para saltar a él</p>
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
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{sub?.frecuencia === 'anual' ? 'Cobro anual' : 'Cobro mensual'}{formData.diaCobro ? ` · día ${formData.diaCobro}` : ''}</div>
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Costo mensual equiv.</div>
              <div className="tabular" style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{mensual ? fmt(mensual, moneda) : '—'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.8)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem' }}>
              <span>Al año</span>
              <span className="tabular" style={{ fontWeight: 700 }}>{anual ? fmt(anual, moneda) : '—'}</span>
            </div>
            {formData.creditCardId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.85)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem', marginTop: '0.6rem' }}>
                <CreditCard size={13} />
                <span>Cobro automático activado</span>
              </div>
            )}
          </div>
        </div>

        {/* Asistente navegable */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <Stepper steps={STEPS} current={step} onStepClick={setStep} />
          <form onSubmit={handleSubmit}>
            {step === 0 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>El servicio</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1rem' }}>Nombre y descripción. El monto y la frecuencia quedan fijos.</p>
                <div className="info-box primary" style={{ marginBottom: '1.25rem', fontSize: 12 }}>
                  <Lock size={13} style={{ flexShrink: 0 }} />
                  <span>El monto, la moneda y la frecuencia no se modifican para no descuadrar el histórico de cobros. Si cambió el precio, crea una suscripción nueva y cancela esta.</span>
                </div>
                {field('nombre', 'Nombre *', 'Ej: Netflix, Spotify, AWS...', { placeholder: 'Ej: Netflix' })}
                <div style={{ marginTop: '0.75rem' }}>
                  {field('descripcion', 'Descripción (opcional)', null, { placeholder: 'Detalle adicional' })}
                </div>
                <div className="form-row-2" style={{ marginTop: '0.75rem' }}>
                  {lockedField('Monto', monto ? fmt(monto, moneda) : '—', 'Valor por cobro — fijo')}
                  {lockedField('Moneda', MONEDA_LABEL[moneda] ?? moneda, 'Fija desde la creación')}
                </div>
                <div className="form-row-2" style={{ marginTop: '0.75rem' }}>
                  {lockedField('Frecuencia', FRECUENCIA_LABEL[sub?.frecuencia] ?? '—', 'Fija desde la creación')}
                  {lockedField('Fecha de inicio', sub?.fechaInicio ? fmtDateLong(sub.fechaInicio) : '—', 'Define el ciclo de cobro')}
                </div>
              </div>
            )}
            {step === 1 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>El cobro</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Cuándo te cobran, hasta cuándo y con qué tarjeta</p>
                <DayOfMonthPicker
                  label="Día de cobro"
                  required
                  nombreEvento="cobro"
                  value={formData.diaCobro}
                  onChange={d => { setFormData(p => ({ ...p, diaCobro: String(d) })); markTouched('diaCobro'); }}
                  error={showErr('diaCobro') ? errors.diaCobro : null}
                />
                <div style={{ marginTop: '0.75rem', maxWidth: 260 }}>
                  {field('fechaFin', 'Fecha de fin (opcional)', 'Si tiene fecha de terminación', { type: 'date' })}
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Cobro automático con tarjeta</label>
                    <select className="form-input" name="creditCardId" value={formData.creditCardId} onChange={handleChange}>
                      <option value="">Manual — solo llevar el registro</option>
                      {cards.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} · {c.entidad}</option>
                      ))}
                    </select>
                    <p className="form-hint">
                      {formData.creditCardId
                        ? 'Cada ciclo se generará el cargo solo en esta tarjeta, el día de cobro indicado.'
                        : 'Sin tarjeta, la suscripción solo se usa para calcular tu dinero libre — el pago lo registras aparte.'}
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', maxWidth: 260 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Estado</label>
                    <select className="form-input" name="status" value={formData.status} onChange={handleChange}>
                      <option value="activa">Activa</option>
                      <option value="pausada">Pausada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                    <p className="form-hint">Pausada o cancelada deja de contar en tu dinero libre.</p>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              {step > 0
                ? <button type="button" className="btn btn-secondary" onClick={() => setStep(s => s - 1)}><ChevronLeft size={15} /> Atrás</button>
                : <button type="button" className="btn btn-secondary" onClick={() => navigate(`/subscriptions/${id}`)}>Cancelar</button>}
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
