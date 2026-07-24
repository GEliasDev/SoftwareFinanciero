import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Handshake, Repeat, Lock } from 'lucide-react';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { fmt } from '../utils/format';
import { CATEGORIES } from '../utils/creditCard';
import Swal from 'sweetalert2';

// Mismo par de opciones que en el alta: en edición se muestran igual pero
// bloqueadas — el backend no permite cambiar el tipo (personalDebtUpdateSchema).
const TIPO_OPTIONS = [
  {
    value: 'deuda',
    icon:  Handshake,
    label: 'Deuda personal',
    desc:  'Préstamo informal — abonás lo que podás hasta saldar',
  },
  {
    value: 'gasto',
    icon:  Repeat,
    label: 'Gasto mensual',
    desc:  'Compromiso recurrente sin fecha de fin (gasolina, comida, etc.)',
  },
];

export const PersonalDebtEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving]     = useState(false);
  const [touched, setTouched]   = useState({});
  const [debtName, setDebtName] = useState('');
  // montoTotal no es editable (cambia con los abonos) — solo para mostrarlo.
  const [montoTotal, setMontoTotal] = useState(0);
  const [form, setForm] = useState({
    tipo: 'deuda', nombre: '', descripcion: '', prestamista: '', montoCuota: '', status: 'activo', categoria: 'otros',
  });

  useEffect(() => {
    PersonalDebtService.getById(id).then(d => {
      setDebtName(d.nombre);
      setMontoTotal(Number(d.montoTotal) || 0);
      setForm({
        tipo:        d.tipo || 'deuda',
        nombre:      d.nombre,
        descripcion: d.descripcion || '',
        prestamista: d.prestamista || '',
        montoCuota:  d.montoCuota != null ? String(d.montoCuota) : '',
        status:      d.status,
        categoria:   d.categoria || 'otros',
      });
    });
  }, [id]);

  const isDeuda    = form.tipo === 'deuda';
  const montoCuota = Number(form.montoCuota) || 0;

  const errors = {};
  if (!form.nombre.trim())                 errors.nombre      = 'Ingresa un nombre';
  if (isDeuda && !form.prestamista.trim()) errors.prestamista = 'Indica a quién le debes';
  if (!isDeuda && !(montoCuota > 0))       errors.montoCuota  = 'Debe ser mayor a 0';

  const showErr = (f) => touched[f] && errors[f];
  const mark    = (f) => setTouched(t => ({ ...t, [f]: true }));

  const field = (name, label, hint, props = {}) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" htmlFor={name}>{label}</label>
      <input
        id={name} className={`form-input ${showErr(name) ? 'error' : ''}`}
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(errors).map(k => [k, true])));
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await PersonalDebtService.update(id, {
        nombre:      form.nombre,
        descripcion: form.descripcion || undefined,
        ...(isDeuda  ? { prestamista: form.prestamista } : { montoCuota, categoria: form.categoria }),
        status:      form.status,
      });
      navigate(`/personal-debts/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  const statusOptions = isDeuda
    ? [{ value: 'activo', label: 'Activo' }, { value: 'pagado', label: 'Pagado' }]
    : [{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Editar obligación"
        subtitle={debtName || 'Cargando...'}
        back={
          <button onClick={() => navigate(`/personal-debts/${id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
        }
      />

      {/* Selector de tipo — mismo bloque que el alta, pero bloqueado */}
      <div className="form-row-2" style={{ marginBottom: '1.5rem' }}>
        {TIPO_OPTIONS.map(({ value, icon: Icon, label, desc }) => {
          const active = form.tipo === value;
          return (
            <div
              key={value}
              aria-disabled="true"
              title="El tipo no se puede cambiar después de crear la obligación"
              style={{
                padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', cursor: 'not-allowed',
                border: `2px solid ${active ? 'var(--brand-600)' : 'var(--color-border)'}`,
                background: active ? 'color-mix(in srgb, var(--brand-600) 6%, var(--surface))' : 'var(--color-bg)',
                opacity: active ? 1 : 0.55,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icon size={16} style={{ color: active ? 'var(--brand-600)' : 'var(--text-3)' }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: active ? 'var(--brand-600)' : 'var(--text)' }}>{label}</span>
                {active && <Lock size={11} style={{ color: 'var(--text-3)', marginLeft: 'auto' }} />}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{desc}</p>
            </div>
          );
        })}
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
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Monto total</div>
                  <div className="tabular" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{montoTotal ? fmt(montoTotal) : '—'}</div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem', marginTop: '0.75rem' }}>
                  Abonás cuando podás · saldo siempre visible
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Monto mensual</div>
                  <div className="tabular" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{montoCuota ? fmt(montoCuota) : '—'}</div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '0.6rem', marginTop: '0.75rem' }}>
                  {montoCuota > 0 ? `${fmt(montoCuota * 12)}/año` : 'Recurrente · todos los meses'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Formulario */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>
            {isDeuda ? 'Datos de la deuda' : 'Datos del gasto'}
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
            {isDeuda ? '¿Con quién y cuánto debes?' : '¿Cuánto pagas cada mes?'}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {field('nombre', isDeuda ? 'Nombre de la obligación *' : 'Nombre del gasto *', null,
                { placeholder: isDeuda ? 'Ej: Préstamo Juan' : 'Ej: Gasolina moto' })}

              {isDeuda && (
                <>
                  {field('prestamista', 'A quién le debes *', null, { placeholder: 'Ej: Juan García' })}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Monto total (COP)</label>
                    <input className="form-input" value={montoTotal} disabled />
                    <p className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={10} /> Registra abonos desde el detalle para actualizar el saldo
                    </p>
                  </div>
                  {field('descripcion', 'Descripción', 'Opcional', { placeholder: 'Notas adicionales' })}
                </>
              )}

              {!isDeuda && (
                <>
                  {field('montoCuota', 'Monto mensual (COP) *', null, { type: 'number', min: '1', placeholder: '150 000' })}
                  {field('descripcion', 'Descripción', 'Opcional — para qué es este gasto', { placeholder: 'Ej: Aporte comida casa' })}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Categoría</label>
                    {/* Misma taxonomía que Tarjetas: así este gasto se suma
                        junto con las compras en Presupuesto del mes en curso. */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {CATEGORIES.map(c => (
                        <button key={c.value} type="button"
                          onClick={() => setForm(f => ({ ...f, categoria: c.value }))}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: 12, fontWeight: form.categoria === c.value ? 700 : 500,
                            padding: '5px 11px', borderRadius: 20, cursor: 'pointer', border: '1px solid',
                            borderColor: form.categoria === c.value ? c.color : 'var(--color-border)',
                            background: form.categoria === c.value ? `${c.color}18` : 'var(--surface-2)',
                            color: form.categoria === c.value ? c.color : 'var(--text-2)',
                            transition: 'all 0.12s ease',
                          }}>
                          <c.Icon size={12} /> {c.label}
                        </button>
                      ))}
                    </div>
                    <p className="form-hint">Para que Presupuesto lo cuente en la categoría correcta.</p>
                  </div>
                </>
              )}

              <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.75rem' }}>Estado</h3>
                <div style={{ maxWidth: 260 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Estado</label>
                    <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '1.25rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(`/personal-debts/${id}`)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Check size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
