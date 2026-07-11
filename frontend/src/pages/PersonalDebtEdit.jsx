import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Info } from 'lucide-react';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { CATEGORIES } from '../utils/creditCard';
import Swal from 'sweetalert2';

export const PersonalDebtEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving]     = useState(false);
  const [touched, setTouched]   = useState({});
  const [debtName, setDebtName] = useState('');
  const [form, setForm] = useState({
    tipo: 'deuda', nombre: '', descripcion: '', prestamista: '', montoCuota: '', status: 'activo', categoria: 'otros',
  });

  useEffect(() => {
    PersonalDebtService.getById(id).then(d => {
      setDebtName(d.nombre);
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

  const isDeuda = form.tipo === 'deuda';

  const errors = {};
  if (!form.nombre.trim())                           errors.nombre      = 'Ingresa un nombre';
  if (isDeuda && !form.prestamista.trim())           errors.prestamista = 'Indica a quién le debes';
  if (!isDeuda && !(Number(form.montoCuota) > 0))   errors.montoCuota  = 'Debe ser mayor a 0';

  const showErr = (f) => touched[f] && errors[f];
  const mark    = (f) => setTouched(t => ({ ...t, [f]: true }));

  const field = (name, label, hint, props = {}) => (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label">{label}</label>
      <input
        className={`form-input ${showErr(name) ? 'error' : ''}`}
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
        ...(isDeuda  ? { prestamista: form.prestamista } : { montoCuota: Number(form.montoCuota), categoria: form.categoria }),
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
    <div className="animate-fade-in" style={{ maxWidth: 820 }}>
      <PageHeader
        title="Editar obligación"
        subtitle={debtName || 'Cargando...'}
        back={
          <button onClick={() => navigate(`/personal-debts/${id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
        }
      />

      {isDeuda && (
        <div className="info-box primary" style={{ marginBottom: '1.25rem' }}>
          <Info size={14} />
          <span>El monto total no se modifica aquí — registra abonos desde el detalle para actualizar el saldo.</span>
        </div>
      )}

      <div className="card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>
          {isDeuda ? 'Datos de la deuda' : 'Datos del gasto'}
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
          {isDeuda ? 'Nombre y acreedor' : 'Nombre y monto mensual'}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {field('nombre', 'Nombre *', null, { placeholder: isDeuda ? 'Ej: Préstamo Juan' : 'Ej: Gasolina moto' })}
            {isDeuda && field('prestamista', 'A quién le debes *', null, { placeholder: 'Ej: Juan García' })}
            {field('descripcion', 'Descripción', 'Opcional', { placeholder: 'Notas adicionales' })}

            {!isDeuda && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Categoría</label>
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
            )}

            <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.75rem' }}>Estado</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isDeuda ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                {!isDeuda && field('montoCuota', 'Monto mensual (COP) *', null, { type: 'number', min: '1' })}
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
  );
};
