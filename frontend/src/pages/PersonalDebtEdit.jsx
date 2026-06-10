import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Info } from 'lucide-react';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import Swal from 'sweetalert2';

export const PersonalDebtEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving]   = useState(false);
  const [touched, setTouched] = useState({});
  const [tipo, setTipo]       = useState('deuda');
  const [debtName, setDebtName] = useState('');
  const [form, setForm] = useState({ nombre: '', descripcion: '', prestamista: '', montoCuota: '', diaPago: '', status: 'activo' });

  useEffect(() => {
    PersonalDebtService.getById(id).then(d => {
      setTipo(d.tipo || 'deuda');
      setDebtName(d.nombre);
      setForm({
        nombre:      d.nombre,
        descripcion: d.descripcion || '',
        prestamista: d.prestamista || '',
        montoCuota:  String(d.montoCuota),
        diaPago:     String(d.diaPago),
        status:      d.status,
      });
    });
  }, [id]);

  const isDeuda = tipo === 'deuda';

  const errors = {};
  if (!form.nombre.trim())                    errors.nombre      = 'Ingresa un nombre';
  if (isDeuda && !form.prestamista.trim())    errors.prestamista = 'Indica a quién le debes';
  if (!(Number(form.montoCuota) > 0))         errors.montoCuota  = 'Debe ser mayor a 0';
  const dia = Number(form.diaPago);
  if (!(dia >= 1 && dia <= 31))               errors.diaPago     = 'Día entre 1 y 31';

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
        ...(isDeuda ? { prestamista: form.prestamista } : {}),
        montoCuota:  Number(form.montoCuota),
        diaPago:     Number(form.diaPago),
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
          <span>El monto total y las cuotas pagadas no se modifican aquí — usa <strong>Registrar abono</strong> desde el detalle.</span>
        </div>
      )}

      <div className="card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>
          {isDeuda ? 'Datos de la deuda' : 'Datos del gasto'}
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 1.25rem' }}>
          {isDeuda ? 'Nombre, acreedor y cuota mensual' : 'Nombre, monto y día de pago'}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {field('nombre', 'Nombre *', null, { placeholder: isDeuda ? 'Ej: Préstamo Juan' : 'Ej: Gasolina moto' })}
            {isDeuda && field('prestamista', 'A quién le debes *', null, { placeholder: 'Ej: Juan García' })}
            {field('descripcion', 'Descripción', 'Opcional', { placeholder: 'Notas adicionales' })}

            <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 0.75rem' }}>Pago y estado</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                {field('montoCuota', isDeuda ? 'Cuota mensual (COP) *' : 'Monto mensual (COP) *', null, { type: 'number', min: '1' })}
                {field('diaPago', 'Día de pago *', '1–31', { type: 'number', min: '1', max: '31' })}
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
