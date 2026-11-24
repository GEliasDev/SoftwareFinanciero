import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from '../utils/alerts';
import { CreditCardService } from '../services/creditCardService';
import { Check, Lock, Calculator } from 'lucide-react';
import { FormHeader, FormSection, ChoiceChips, CardMini, FormActions } from '../components/ui/FormLayout';
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
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la compra.' });
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
  const setCuotas = (v) => setForm(f => ({ ...f, numeroCuotas: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!card) return;
    setTouched({ descripcion: true, montoTotal: true, numeroCuotas: true });
    if (!form.descripcion.trim()) return;
    if (!moneyLocked && !(Number(form.montoTotal) > 0)) return;
    if (excedeCupo) {
      Swal.fire({ icon: 'warning', title: 'Cupo insuficiente', text: `Cupo disponible: ${fmt(cupoTope)}` });
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
        navigate(`/credit-cards/${id}/purchases`);
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar la compra.' });
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => navigate(isEdit ? `/credit-cards/${id}/purchases/${purchaseId}` : `/credit-cards/${id}/purchases`);

  if (loading) return (
    <div aria-busy="true">
      <div className="skeleton" style={{ height: 56, width: 320, marginBottom: 20 }} />
      <div className="form-layout">
        <div className="skeleton" style={{ height: 420, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />
      </div>
    </div>
  );

  const lockedField = (name, label, value) => (
    <div className="form-group">
      <label className="form-label" htmlFor={name}>{label}</label>
      <input id={name} className="form-input" value={value} disabled />
      <p className="form-hint row" style={{ gap: 4 }}><Lock size={12} /> {lockReason}</p>
    </div>
  );
  const nCuotas = Number(form.numeroCuotas) || 1;

  return (
    <div className="animate-fade-in form-page">
      <FormHeader
        crumbs={[
          { to: '/credit-cards', label: 'Tarjetas' },
          { to: `/credit-cards/${id}`, label: card?.nombre ?? '—' },
          ...(isEdit ? [{ to: `/credit-cards/${id}/purchases/${purchaseId}`, label: purchase?.descripcion ?? 'Compra' }] : []),
          { label: isEdit ? 'Editar compra' : 'Nueva compra' },
        ]}
        title={isEdit ? 'Editar compra' : 'Nueva compra'}
        subtitle={card && <>{card.nombre} · {card.entidad} · Cupo disponible <b className="n" style={{ color: 'var(--text)' }}>{fmt(card.cupoDisponible)}</b></>}
        onBack={goBack}
      />

      <form onSubmit={handleSubmit} className="form-layout" noValidate>
        <div className="form-main">
          <FormSection title="Qué compraste" desc="Así la vas a reconocer en el extracto y en tus reportes.">
            <div className="form-group">
              <label className="form-label" htmlFor="purchase-descripcion">Descripción</label>
              <input
                id="purchase-descripcion"
                className={`form-input ${touched.descripcion && !form.descripcion.trim() ? 'error' : ''}`}
                value={form.descripcion}
                onChange={set('descripcion')}
                onBlur={() => mark('descripcion')}
                placeholder="Ej: Supermercado, Amazon, Farmacia…"
                aria-invalid={touched.descripcion && !form.descripcion.trim()}
              />
              {touched.descripcion && !form.descripcion.trim() && <p className="form-error">Ingresa una descripción</p>}
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="purchase-categoria">Categoría</label>
                <select id="purchase-categoria" className="form-input" value={form.categoria} onChange={set('categoria')}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              {moneyLocked ? lockedField('purchase-fecha', 'Fecha de compra', purchase?.fechaCompra) : (
                <div className="form-group">
                  <label className="form-label" htmlFor="purchase-fecha">Fecha de compra</label>
                  <input id="purchase-fecha" className="form-input" type="date" value={form.fechaCompra} onChange={set('fechaCompra')} />
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="Valor y cuotas" desc="El valor neto de la compra; los intereses se calculan con la tasa de la tarjeta.">
            {moneyLocked ? (
              <>
                <div className="form-row-2">
                  {lockedField('purchase-monto', 'Monto', fmt(purchase?.montoTotal))}
                  {lockedField('purchase-cuotas', 'Cuotas', `${purchase?.numeroCuotas} cuota${Number(purchase?.numeroCuotas) !== 1 ? 's' : ''}`)}
                </div>
                <div className="notice warn" style={{ margin: 0 }}><Lock size={16} /> <span>{lockReason}. Solo puedes cambiar la descripción y la categoría.</span></div>
              </>
            ) : (
              <>
                <div className="form-group" style={{ maxWidth: 360 }}>
                  <label className="form-label" htmlFor="purchase-monto">Monto</label>
                  <MoneyInput id="purchase-monto" value={form.montoTotal} onChange={setMonto} onBlur={() => mark('montoTotal')}
                    error={excedeCupo || (touched.montoTotal && !(Number(form.montoTotal) > 0))} placeholder="0" aria-invalid={excedeCupo} />
                  {excedeCupo
                    ? <p className="form-error">Supera el cupo disponible ({fmt(cupoTope)})</p>
                    : touched.montoTotal && !(Number(form.montoTotal) > 0)
                      ? <p className="form-error">Ingresa el valor de la compra</p>
                      : <p className="form-hint">Hasta {fmt(cupoTope)} (cupo disponible).</p>}
                </div>
                <div className="form-group">
                  <span className="form-label" id="purchase-cuotas-l">Cuotas</span>
                  <ChoiceChips label="Cuotas" options={[1, 3, 6, 12, 24, 36]} value={form.numeroCuotas} onChange={setCuotas} other min={1} max={36}
                    suffix={cuotaPreview > 0 ? `${nCuotas} cuota${nCuotas !== 1 ? 's' : ''} de ${fmt(cuotaPreview)}` : null} />
                  <p className="form-hint">Entre 1 y 36. A 1 cuota no genera intereses.</p>
                </div>
                {cuotaPreview > 0 && (
                  <div className="notice info" style={{ margin: 0 }}>
                    <Calculator size={16} />
                    <span>Cuota aprox. <b className="n">{fmt(cuotaPreview)}/mes</b> con {Number(card?.tasaInteresMensual).toLocaleString('es-CO', { maximumFractionDigits: 4 })} % M.V. · Total <b className="n">{fmt(totalPreview)}</b></span>
                  </div>
                )}
              </>
            )}
          </FormSection>

          <FormActions>
            <button type="button" className="btn btn-secondary" onClick={goBack}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Check size={16} /> {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar compra'}
            </button>
          </FormActions>
        </div>

        <aside className="form-aside">
          <CardMini card={card} dark />
          <section className="card">
            <p className="text-secondary" style={{ margin: 0, fontSize: 14 }}>Cuota mensual</p>
            {cuotaPreview > 0 ? (
              <>
                <p className="amount-lg" style={{ margin: '8px 0 2px', fontSize: 34 }}>{fmt(cuotaPreview)}</p>
                <p className="text-sm text-secondary n" style={{ margin: '0 0 12px' }}>{nCuotas} cuota{nCuotas !== 1 ? 's' : ''} mensual{nCuotas !== 1 ? 'es' : ''}</p>
                <div className="row-list" style={{ borderTop: '1px solid var(--divider)' }}>
                  <div className="kv"><span>Monto neto</span><span>{fmt(Number(form.montoTotal || purchase?.montoTotal || 0))}</span></div>
                  <div className="kv"><span>Intereses</span><span className="text-warning">{fmt(Math.max(0, interesesPreview))}</span></div>
                </div>
                <div className="row-between cc-debt-total"><b>Total a pagar</b><b className="n" style={{ fontSize: 20 }}>{fmt(totalPreview)}</b></div>
                <span className="badge badge-neutral" style={{ marginTop: 12 }}><selectedCat.Icon size={13} /> {selectedCat.label}</span>
              </>
            ) : (
              <p className="text-sm text-muted" style={{ margin: '12px 0 0' }}>Escribe el monto y elige las cuotas para ver la simulación.</p>
            )}
          </section>
        </aside>
      </form>
    </div>
  );
};
