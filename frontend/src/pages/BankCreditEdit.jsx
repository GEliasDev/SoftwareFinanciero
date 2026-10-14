import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Info, Landmark, ChevronRight, ChevronLeft, Check, AlertCircle, Wallet, Lock,
} from 'lucide-react';
import { BankCreditService } from '../services/bankCreditService';
import { Stepper } from '../components/ui/Stepper';
import { DayOfMonthPicker } from '../components/ui/DayOfMonthPicker';
import { MoneyInput } from '../components/ui/MoneyInput';
import { fmt, fmtDateLong } from '../utils/format';

const STEPS = ['Identidad', 'Financiero', 'Fechas'];
const STEP_FIELDS = [['nombre', 'entidad', 'tipoCredito'], ['cuotaAdministracion', 'seguro'], ['diaPago']];

export const BankCreditEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState({});
  // Registro completo: los términos financieros no son editables
  // (bankCreditUpdateSchema), pero se muestran en solo-lectura y alimentan
  // la vista previa igual que en el alta.
  const [credit, setCredit] = useState(null);
  const [data, setData] = useState({
    nombre: '', entidad: '', tipoCredito: 'otro', numeroReferencia: '',
    cuotaAdministracion: 0, seguro: 0, diaPago: '',
  });

  useEffect(() => {
    BankCreditService.getById(id)
      .then(c => {
        setCredit(c);
        setData({
          nombre: c.nombre,
          entidad: c.entidad,
          tipoCredito: c.tipoCredito ?? 'otro',
          numeroReferencia: c.numeroReferencia ?? '',
          cuotaAdministracion: c.cuotaAdministracion ?? 0,
          seguro: c.seguro ?? 0,
          diaPago: c.diaPago,
        });
      })
      .catch(() => setError('No se pudo cargar el crédito.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => setData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const markTouched = (name) => setTouched(t => ({ ...t, [name]: true }));

  const errors = {};
  if (!String(data.nombre).trim()) errors.nombre = 'Ingresa un nombre';
  if (!String(data.entidad).trim()) errors.entidad = 'Ingresa la entidad';
  if (data.cuotaAdministracion && Number(data.cuotaAdministracion) < 0) errors.cuotaAdministracion = 'No puede ser negativa';
  if (data.seguro && Number(data.seguro) < 0) errors.seguro = 'No puede ser negativo';
  const dia = Number(data.diaPago); if (!(dia >= 1 && dia <= 31)) errors.diaPago = 'Día entre 1 y 31';

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
      await BankCreditService.update(id, {
        nombre: data.nombre,
        entidad: data.entidad,
        tipoCredito: data.tipoCredito,
        numeroReferencia: data.numeroReferencia || undefined,
        cuotaAdministracion: Number(data.cuotaAdministracion),
        seguro: Number(data.seguro),
        diaPago: Number(data.diaPago),
      });
      navigate(`/bank-credits/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar.');
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

  // Vista previa: la cuota base la calcula el servidor; administración y seguro
  // sí son editables, así que el total mensual se actualiza en vivo.
  const admin      = Number(data.cuotaAdministracion) || 0;
  const seguro     = Number(data.seguro) || 0;
  const cuotaBase  = parseFloat(credit?.valorCuota ?? 0) || 0;
  const cuotas     = Number(credit?.numeroCuotas) || 0;
  // tasaMensual se persiste como FRACCIÓN (0.0162 = 1,62% M.V.) — ver CLAUDE.md.
  const tasaMenPct = (parseFloat(credit?.tasaMensual ?? 0) || 0) * 100;
  const cuotaMensual  = cuotaBase + admin + seguro;
  const totalAPagar   = cuotaMensual * cuotas;
  const totalIntereses = parseFloat(credit?.totalIntereses ?? 0) || 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate(`/bank-credits/${id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Editar crédito</h1>
            <p className="page-subtitle">{data.nombre} — toca un paso para saltar a él</p>
          </div>
        </div>
      </div>

      {error && <div className="info-box danger" style={{ marginBottom: '1rem' }}><Info size={14} />{error}</div>}

      <div className="wizard-grid">
        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ borderRadius: 16, background: 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-800) 100%)', padding: '1.5rem', color: 'white', boxShadow: '0 16px 40px rgba(91,77,241,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <Landmark size={18} style={{ color: 'rgba(255,255,255,0.85)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{data.nombre || 'Nombre del crédito'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{data.entidad || 'Entidad'}</div>
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Cuota mensual</div>
              <div className="tabular" style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{cuotaMensual ? fmt(cuotaMensual) : '—'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem' }}>
              <span>{cuotas ? `${credit?.cuotasPagadas ?? 0}/${cuotas} cuotas` : '— cuotas'}</span>
              <span>{tasaMenPct ? `${tasaMenPct.toFixed(2)}% M.V.` : ''}</span>
            </div>
          </div>

          {cuotaMensual > 0 && (
            <div className="card" style={{ padding: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.625rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Wallet size={12} /> Proyección</p>
              {[
                { label: 'Total a pagar', value: fmt(totalAPagar), color: 'var(--text)' },
                { label: 'Total intereses', value: fmt(totalIntereses), color: 'var(--neg-600)' },
                ...(admin > 0 || seguro > 0 ? [{ label: 'Cuota base', value: fmt(cuotaBase), color: 'var(--text-2)' }] : []),
                { label: 'Saldo pendiente', value: fmt(parseFloat(credit?.saldoPendiente ?? 0)), color: 'var(--text-2)' },
                ...(credit?.fechaFin ? [{ label: 'Fin estimado', value: fmtDateLong(credit.fechaFin), color: 'var(--text-2)' }] : []),
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{r.label}</span>
                  <span className="tabular" style={{ fontWeight: 600, color: r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Asistente navegable */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <Stepper steps={STEPS} current={step} onStepClick={setStep} />
          <form onSubmit={handleSubmit}>
            {step === 0 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Identidad del crédito</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>¿Cómo se llama, de qué entidad y qué tipo?</p>
                <div className="form-row-2" style={{ marginBottom: '0.75rem' }}>
                  {field('nombre', 'Nombre / Alias *', 'Como quieres identificar este crédito', { placeholder: 'Ej: Crédito Addi Electrodomésticos' })}
                  {field('entidad', 'Entidad *', null, { placeholder: 'Ej: Addi, Sistecrédito, Bancolombia…' })}
                </div>
                <div className="form-row-2">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tipo de crédito</label>
                    <select className="form-input" name="tipoCredito" value={data.tipoCredito} onChange={handleChange}>
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
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1rem' }}>Monto, cuotas y tasa quedan fijos; sí puedes ajustar los cargos mensuales.</p>
                <div className="info-box primary" style={{ marginBottom: '1.25rem', fontSize: 12 }}>
                  <Info size={13} style={{ flexShrink: 0 }} />
                  <span>Los términos del crédito no se modifican para no invalidar el plan de pagos ya calculado. Si están mal, elimina el crédito y créalo de nuevo.</span>
                </div>
                <div className="form-row-2" style={{ marginBottom: '0.75rem' }}>
                  {lockedField('Monto total (COP)', fmt(parseFloat(credit?.montoTotal ?? 0)), 'Capital solicitado — fijo')}
                  {lockedField('Número de cuotas', credit?.numeroCuotas ?? '', 'Plazo pactado — fijo')}
                </div>
                <div className="form-row-2" style={{ marginBottom: '0.75rem' }}>
                  {lockedField('Tasa de interés (%)', credit?.tasaInteres ?? '', `Ingresada como ${credit?.tipoTasa === 'anual' ? 'anual (E.A.)' : 'mensual (M.V.)'} — fija`)}
                  {lockedField('Cuotas ya pagadas', credit?.cuotasPagadas ?? 0, 'Se actualiza al registrar pagos')}
                </div>
                <div className="form-row-2">
                  {field('cuotaAdministracion', 'Cuota administración', 'Cargo fijo mensual de administración', { type: 'money', placeholder: '0' })}
                  {field('seguro', 'Seguro / aval mensual', 'Seguro de vida o aval (Addi, Sistecrédito…)', { type: 'money', placeholder: '0' })}
                </div>
              </div>
            )}
            {step === 2 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Fechas</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Día de pago e inicio del crédito</p>
                <DayOfMonthPicker
                  label="Día de pago"
                  required
                  nombreEvento="pago"
                  value={data.diaPago}
                  onChange={d => { setData(p => ({ ...p, diaPago: String(d) })); markTouched('diaPago'); }}
                  error={showErr('diaPago') ? errors.diaPago : null}
                />
                <div style={{ marginTop: '0.75rem', maxWidth: 260 }}>
                  {lockedField('Fecha de inicio', credit?.fechaInicio ? fmtDateLong(credit.fechaInicio) : '—', 'Define el plan de pagos — fija')}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              {step > 0
                ? <button type="button" className="btn btn-secondary" onClick={() => setStep(s => s - 1)}><ChevronLeft size={15} /> Atrás</button>
                : <button type="button" className="btn btn-secondary" onClick={() => navigate(`/bank-credits/${id}`)}>Cancelar</button>}
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
