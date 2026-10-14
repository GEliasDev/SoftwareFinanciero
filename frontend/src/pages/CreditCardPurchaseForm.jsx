import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CreditCardService } from '../services/creditCardService';
import { ArrowLeft, Check, DollarSign, ChevronRight, Lock, ShoppingBag } from 'lucide-react';
import { getCardGradient } from '../utils/cardColors';
import { fmt, localISODate } from '../utils/format';
import { CATEGORIES } from '../utils/creditCard';
import { MoneyInput } from '../components/ui/MoneyInput';

function calcCuota(monto, cuotas, tasaPct) {
  if (!monto || !cuotas || cuotas < 1) return 0;
  if (cuotas === 1) return monto;
  const i = tasaPct / 100;
  const f = Math.pow(1 + i, cuotas);
  return monto * (i * f) / (f - 1);
}

// Componente único de alta y edición (patrón `IncomeForm`): la edición vive en
// su propia ruta `/<card>/purchases/:purchaseId/edit`, nunca inline en el detalle.
export const CreditCardPurchaseForm = () => {
  const { id, purchaseId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(purchaseId);

  const [card, setCard]         = useState(null);
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [touched, setTouched]   = useState({});
  const [form, setForm] = useState({
    descripcion: '',
    montoTotal: '',
    numeroCuotas: '1',
    fechaCompra: localISODate(),
    categoria: 'otros',
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cardData = await CreditCardService.getById(id);
        if (!alive) return;
        setCard(cardData);
        if (isEdit) {
          const p = await CreditCardService.getPurchaseById(id, purchaseId);
          if (!alive) return;
          setPurchase(p);
          setForm({
            descripcion: p.descripcion ?? '',
            montoTotal: String(p.montoTotal ?? ''),
            numeroCuotas: String(p.numeroCuotas ?? 1),
            fechaCompra: p.fechaCompra ?? localISODate(),
            categoria: p.categoria || 'otros',
          });
        }
      } catch {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la compra.', confirmButtonColor: '#047857' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, purchaseId, isEdit]);

  // Los campos de dinero solo se editan si la compra no tiene pagos y es normal
  // (el backend lo vuelve a validar; aquí solo se refleja la UI espejo).
  const moneyLocked = isEdit && (purchase?.tipo !== 'compra' || Number(purchase?.cuotasPagadas) > 0);
  const lockReason  = purchase?.tipo !== 'compra'
    ? 'No editable en avances'
    : 'La compra ya tiene pagos registrados';

  const tasaMensual  = card ? parseFloat(card.tasaInteresMensual) : 0;
  // Tope de monto para esta compra: en edición el cupo ya trae descontado el
  // capital actual, así que se le suma para permitir bajar/subir respecto a él.
  const cupoTope     = card ? parseFloat(card.cupoDisponible) + (isEdit ? parseFloat(purchase?.montoTotal ?? 0) : 0) : 0;
  const cuotaPreview = form.montoTotal && form.numeroCuotas && !moneyLocked
    ? calcCuota(Number(form.montoTotal), Number(form.numeroCuotas), tasaMensual)
    : parseFloat(purchase?.valorCuotaMensual ?? 0);
  const totalPreview     = moneyLocked ? parseFloat(purchase?.totalAPagar ?? 0) : cuotaPreview * Number(form.numeroCuotas || 1);
  const interesesPreview = moneyLocked
    ? parseFloat(purchase?.totalIntereses ?? 0)
    : totalPreview - Number(form.montoTotal || 0);
  const selectedCat  = CATEGORIES.find(c => c.value === form.categoria) ?? CATEGORIES[CATEGORIES.length - 1];
  const excedeCupo   = !moneyLocked && form.montoTotal && Number(form.montoTotal) > cupoTope;

  const set   = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const mark  = (f) => setTouched(t => ({ ...t, [f]: true }));
  const setMonto = (v) => setForm(f => ({ ...f, montoTotal: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!card) return;
    setTouched({ descripcion: true, montoTotal: true, numeroCuotas: true });
    if (!form.descripcion.trim()) return;
    if (!moneyLocked && !(Number(form.montoTotal) > 0)) return;
    if (excedeCupo) {
      Swal.fire({ icon: 'warning', title: 'Cupo insuficiente', text: `Cupo disponible: ${fmt(cupoTope)}`, confirmButtonColor: '#047857' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        descripcion: form.descripcion.trim(),
        categoria: form.categoria,
      };
      if (!moneyLocked) {
        payload.montoTotal    = Number(form.montoTotal);
        payload.numeroCuotas  = Number(form.numeroCuotas);
        payload.fechaCompra   = form.fechaCompra;
      }
      if (isEdit) {
        await CreditCardService.updatePurchase(id, purchaseId, payload);
        Swal.fire({ icon: 'success', title: 'Compra actualizada', timer: 1500, showConfirmButton: false });
        navigate(`/credit-cards/${id}/purchases/${purchaseId}`);
      } else {
        await CreditCardService.createPurchase(id, payload);
        Swal.fire({ icon: 'success', title: '¡Compra registrada!', timer: 1500, showConfirmButton: false });
        navigate(`/credit-cards/${id}`);
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar la compra.', confirmButtonColor: '#047857' });
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => navigate(isEdit ? `/credit-cards/${id}/purchases/${purchaseId}` : `/credit-cards/${id}`);

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: 56, borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
      <div className="wizard-grid">
        <div className="skeleton" style={{ height: 380, borderRadius: 'var(--radius-md)' }} />
        <div className="skeleton" style={{ height: 380, borderRadius: 'var(--radius-md)' }} />
      </div>
    </div>
  );

  const lockedField = (name, label, value) => (
    <div className="form-group">
      <label className="form-label" htmlFor={name}>{label}</label>
      <input id={name} className="form-input" value={value} disabled />
      <p className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Lock size={11} /> {lockReason}
      </p>
    </div>
  );

  return (
    <div className="animate-fade-in">

      {/* Breadcrumb + Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: '0.625rem' }}>
          <button onClick={() => navigate('/credit-cards')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, padding: 0 }}>Tarjetas</button>
          <ChevronRight size={12} />
          <button onClick={() => navigate(`/credit-cards/${id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, padding: 0 }}>{card?.nombre ?? '—'}</button>
          {isEdit && (
            <>
              <ChevronRight size={12} />
              <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, padding: 0 }}>{purchase?.descripcion ?? 'Compra'}</button>
            </>
          )}
          <ChevronRight size={12} />
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{isEdit ? 'Editar compra' : 'Nueva compra'}</span>
        </div>
        <div className="page-header" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={goBack} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isEdit && <ShoppingBag size={20} style={{ color: 'var(--color-primary)' }} />}
                {isEdit ? 'Editar Compra' : 'Nueva Compra'}
              </h1>
              {card && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                  {card.nombre} · {card.entidad} · Cupo disponible: <strong>{fmt(card.cupoDisponible)}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="wizard-grid">

        {/* Left: Preview panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Mini card */}
          {card && (
            <div style={{
              borderRadius: 'var(--radius-md)', background: getCardGradient(card.color),
              padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            }}>
              <div style={{ position: 'absolute', top: '-30%', right: '-15%', width: 130, height: 130, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: '0 0 0.15rem', fontWeight: 600, letterSpacing: '0.1em' }}>{card.entidad.toUpperCase()}</p>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 0.875rem' }}>{card.nombre}</p>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 0.2rem', letterSpacing: '0.08em', fontWeight: 600 }}>CUPO DISPONIBLE</p>
                <p style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{fmt(card.cupoDisponible)}</p>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '0.625rem 0 0' }}>
                {card.tasaInteresMensual}% M.V. · Corte día {card.fechaCorte}
              </p>
            </div>
          )}

          {/* Cuota preview card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <DollarSign size={14} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-secondary)' }}>Vista previa</span>
            </div>

            {cuotaPreview > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 600, margin: '0 0 0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cuota mensual</p>
                  <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0, letterSpacing: '-0.02em' }}>{fmt(cuotaPreview)}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>
                    {form.numeroCuotas} cuota{Number(form.numeroCuotas) !== 1 ? 's' : ''}
                  </p>
                </div>
                {[
                  { label: 'Total a pagar', value: fmt(totalPreview), color: 'var(--neg-600)' },
                  { label: 'Intereses',     value: fmt(Math.max(0, interesesPreview)), color: 'var(--color-warning)' },
                  { label: 'Monto neto',    value: fmt(Number(form.montoTotal || 0)), color: 'var(--color-text-secondary)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.275rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.625rem', background: `${selectedCat.color}12`, borderRadius: 'var(--radius-sm)', border: `1px solid ${selectedCat.color}30` }}>
                  <selectedCat.Icon size={13} style={{ color: selectedCat.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: selectedCat.color }}>{selectedCat.label}</span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.25rem 0' }}>
                Completa el formulario para ver la simulación.
              </p>
            )}
          </div>
        </div>

        {/* Right: Form */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="purchase-descripcion">Descripción *</label>
              <input
                id="purchase-descripcion"
                className={`form-input ${touched.descripcion && !form.descripcion.trim() ? 'error' : ''}`}
                value={form.descripcion}
                onChange={set('descripcion')}
                onBlur={() => mark('descripcion')}
                placeholder="Ej: Supermercado, Amazon, Farmacia…"
              />
              {touched.descripcion && !form.descripcion.trim() && (
                <p className="form-error">Ingresa una descripción</p>
              )}
            </div>

            <div className="form-row-2" style={{ gap: '1rem' }}>
              {moneyLocked ? (
                <>
                  {lockedField('purchase-monto', 'Monto *', fmt(purchase?.montoTotal))}
                  {lockedField('purchase-cuotas', 'Cuotas *', `${purchase?.numeroCuotas} cuota${Number(purchase?.numeroCuotas) !== 1 ? 's' : ''}`)}
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="purchase-monto">Monto *</label>
                    <MoneyInput
                      id="purchase-monto"
                      value={form.montoTotal}
                      onChange={setMonto}
                      onBlur={() => mark('montoTotal')}
                      error={excedeCupo}
                      placeholder="0"
                      aria-invalid={excedeCupo}
                    />
                    {excedeCupo && <p className="form-error">Supera el cupo disponible</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="purchase-cuotas">Cuotas *</label>
                    <input
                      id="purchase-cuotas"
                      className="form-input"
                      type="number"
                      value={form.numeroCuotas}
                      onChange={set('numeroCuotas')}
                      min="1"
                      max="36"
                      step="1"
                      placeholder="1"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="form-row-2" style={{ gap: '1rem' }}>
              {moneyLocked ? (
                lockedField('purchase-fecha', 'Fecha de compra *', purchase?.fechaCompra)
              ) : (
                <div className="form-group">
                  <label className="form-label" htmlFor="purchase-fecha">Fecha de compra *</label>
                  <input
                    id="purchase-fecha"
                    className="form-input"
                    type="date"
                    value={form.fechaCompra}
                    onChange={set('fechaCompra')}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="purchase-categoria">Categoría</label>
                <select id="purchase-categoria" className="form-input" value={form.categoria} onChange={set('categoria')}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {moneyLocked && (
              <div className="info-box warning" style={{ marginBottom: '1.25rem', fontSize: 12 }}>
                <Lock size={13} /> <span>{lockReason}. Solo puedes cambiar la descripción y la categoría.</span>
              </div>
            )}

            {!moneyLocked && cuotaPreview > 0 && (
              <div className="info-box primary" style={{ marginBottom: '1.25rem', fontSize: 12 }}>
                <DollarSign size={13} />
                Cuota aprox.: <strong>{fmt(cuotaPreview)}</strong>/mes con {card?.tasaInteresMensual}% M.V.
                · Total: <strong>{fmt(totalPreview)}</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={goBack}>
                <ArrowLeft size={14} /> Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                <Check size={14} /> {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar compra'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
