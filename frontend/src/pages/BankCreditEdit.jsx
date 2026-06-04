import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Info, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { BankCreditService } from '../services/bankCreditService';
import { Stepper } from '../components/ui/Stepper';

const STEPS = ['Identidad', 'Ajustes'];
const STEP_FIELDS = [['nombre', 'entidad', 'tipoCredito'], ['cuotaAdministracion', 'seguro', 'diaPago']];

export const BankCreditEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState({});
  const [data, setData] = useState({ nombre: '', entidad: '', tipoCredito: 'otro', numeroReferencia: '', cuotaAdministracion: 0, seguro: 0, diaPago: '' });

  useEffect(() => {
    BankCreditService.getById(id)
      .then(c => setData({
        nombre: c.nombre,
        entidad: c.entidad,
        tipoCredito: c.tipoCredito ?? 'otro',
        numeroReferencia: c.numeroReferencia ?? '',
        cuotaAdministracion: c.cuotaAdministracion ?? 0,
        seguro: c.seguro ?? 0,
        diaPago: c.diaPago,
      }))
      .catch(() => setError('No se pudo cargar el crédito.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => setData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const markTouched = (name) => setTouched(t => ({ ...t, [name]: true }));

  const errors = {};
  if (!String(data.nombre).trim()) errors.nombre = 'Ingresa un nombre';
  if (!String(data.entidad).trim()) errors.entidad = 'Ingresa la entidad';
  if (data.cuotaAdministracion && Number(data.cuotaAdministracion) < 0) errors.cuotaAdministracion = 'No puede ser negativa';
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
      <label className="form-label">{label}</label>
      <input className={`form-input ${showErr(name) ? 'error' : ''}`} name={name} value={data[name]} onChange={handleChange} onBlur={() => markTouched(name)} {...props} />
      {showErr(name) ? <p className="form-error"><AlertCircle size={11} /> {errors[name]}</p> : hint && <p className="form-hint">{hint}</p>}
    </div>
  );

  if (loading) return <div className="animate-fade-in"><div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-md)' }} /></div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 820 }}>
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

      <div className="card" style={{ padding: '1.75rem' }}>
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
        <div className="info-box primary" style={{ marginBottom: '1.25rem', fontSize: 12 }}>
          <Info size={14} />
          <span>Solo puedes editar nombre, entidad, cuota de administración y día de pago. Los campos financieros no son modificables.</span>
        </div>
        <form onSubmit={handleSubmit}>
          {step === 0 && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Identidad</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Nombre, entidad y tipo del crédito</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {field('nombre', 'Nombre *', null, { placeholder: 'Ej: Crédito Addi' })}
                {field('entidad', 'Entidad *', null, { placeholder: 'Ej: Addi, Sistecrédito, Bancolombia' })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                {field('numeroReferencia', 'N.° referencia / obligación', null, { placeholder: 'Ej: OBL-2025-00123' })}
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>Ajustes</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>Cargos adicionales y día de pago</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                {field('cuotaAdministracion', 'Cuota administración', null, { type: 'number', min: '0', step: '0.01' })}
                {field('seguro', 'Seguro / aval mensual', null, { type: 'number', min: '0', step: '0.01' })}
                {field('diaPago', 'Día de pago * (1–31)', null, { type: 'number', min: '1', max: '31' })}
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
  );
};
