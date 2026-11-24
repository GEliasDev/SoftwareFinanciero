import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from '../utils/alerts';
import { CreditCardService } from '../services/creditCardService';
import { Check, Info, AlertCircle } from 'lucide-react';
import { FormHeader, FormSection, ChoiceChips, CardMini, FormActions } from '../components/ui/FormLayout';
import { fmt, localISODate } from '../utils/format';
import { MoneyInput } from '../components/ui/MoneyInput';

function calcCuota(monto, cuotas, tasaPct) {
  if (!monto || !cuotas || cuotas < 1) return 0;
  if (cuotas === 1) return monto;
  const i = tasaPct / 100;
  const f = Math.pow(1 + i, cuotas);
  return monto * (i * f) / (f - 1);
}

export const CreditCardAdvanceNew = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [card, setCard]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [touched, setTouched]   = useState({});
  const [form, setForm] = useState({
    descripcion: 'Avance en efectivo',
    montoTotal: '',
    numeroCuotas: '1',
    fechaCompra: localISODate(),
  });

  useEffect(() => {
    CreditCardService.getById(id)
      .then(setCard)
      .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la tarjeta.' }))
      .finally(() => setLoading(false));
  }, [id]);

  const tasaMensual  = card ? parseFloat(card.tasaInteresMensual) : 0;
  const comision     = card ? parseFloat(card.comisionAvance ?? 0) : 0;
  const cuotaPreview = form.montoTotal && form.numeroCuotas
    ? calcCuota(Number(form.montoTotal), Number(form.numeroCuotas), tasaMensual)
    : 0;
  const totalPreview = cuotaPreview * Number(form.numeroCuotas || 1);
  const montoAvance  = Number(form.montoTotal || 0);

  const errs = {};
  if (!form.descripcion.trim())           errs.descripcion  = 'Ingresa una descripción';
  if (!(Number(form.montoTotal) > 0))     errs.montoTotal   = 'El monto debe ser mayor a 0';
  if (!(Number(form.numeroCuotas) >= 1))  errs.numeroCuotas = 'Mínimo 1 cuota';
  if (!form.fechaCompra)                  errs.fechaCompra  = 'Selecciona una fecha';

  const blur = k => setTouched(t => ({ ...t, [k]: true }));
  const showErr = k => touched[k] && errs[k];
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setMonto = (v) => setForm(f => ({ ...f, montoTotal: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ descripcion: true, montoTotal: true, numeroCuotas: true, fechaCompra: true });
    if (Object.keys(errs).length) return;
    if (!card) return;
    if (montoAvance > parseFloat(card.cupoDisponible)) {
      Swal.fire({ icon: 'warning', title: 'Cupo insuficiente', text: `El avance (${fmt(montoAvance)}) supera el cupo disponible (${fmt(card.cupoDisponible)}).` });
      return;
    }
    setSaving(true);
    try {
      await CreditCardService.createAdvance(id, {
        descripcion: form.descripcion,
        montoTotal: Number(form.montoTotal),
        numeroCuotas: Number(form.numeroCuotas),
        fechaCompra: form.fechaCompra,
      });
      Swal.fire({ icon: 'success', title: '¡Avance registrado!', timer: 1500, showConfirmButton: false });
      navigate(`/credit-cards/${id}/purchases`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo registrar el avance.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div aria-busy="true">
      <div className="skeleton" style={{ height: 56, width: 320, marginBottom: 20 }} />
      <div className="form-layout">
        <div className="skeleton" style={{ height: 380, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
      </div>
    </div>
  );

  const goBack = () => navigate(`/credit-cards/${id}/purchases`);
  const nCuotas = Number(form.numeroCuotas) || 1;
  const superaCupo = card && montoAvance > parseFloat(card.cupoDisponible);

  return (
    <div className="animate-fade-in form-page">
      <FormHeader
        crumbs={[{ to: '/credit-cards', label: 'Tarjetas' }, { to: `/credit-cards/${id}`, label: card?.nombre ?? '—' }, { label: 'Avance en efectivo' }]}
        title="Avance en efectivo"
        subtitle={card && <>{card.nombre} · Cupo disponible <b className="n" style={{ color: 'var(--text)' }}>{fmt(card.cupoDisponible)}</b>{comision > 0 && <> · Comisión <b className="n" style={{ color: 'var(--text)' }}>{fmt(comision)}</b></>}</>}
        onBack={goBack}
      />

      <form onSubmit={handleSubmit} noValidate className="form-layout">
        <div className="form-main">
          <FormSection title="Datos del avance" desc="El retiro en efectivo con la tarjeta; se difiere a cuotas como una compra.">
            <div className="form-group">
              <label className="form-label" htmlFor="adv-desc">Descripción</label>
              <input id="adv-desc" className={`form-input ${showErr('descripcion') ? 'error' : ''}`} value={form.descripcion}
                onChange={set('descripcion')} onBlur={() => blur('descripcion')} placeholder="Ej: Avance en cajero"
                aria-invalid={!!showErr('descripcion')} aria-describedby={showErr('descripcion') ? 'adv-desc-err' : undefined} />
              {showErr('descripcion') && <p className="form-error" id="adv-desc-err"><AlertCircle size={12} /> {errs.descripcion}</p>}
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="adv-monto">Monto del avance</label>
                <MoneyInput id="adv-monto" value={form.montoTotal} onChange={setMonto} onBlur={() => blur('montoTotal')}
                  error={!!showErr('montoTotal') || superaCupo} placeholder="0"
                  aria-invalid={!!showErr('montoTotal')} aria-describedby={showErr('montoTotal') ? 'adv-monto-err' : undefined} />
                {showErr('montoTotal') ? <p className="form-error" id="adv-monto-err"><AlertCircle size={12} /> {errs.montoTotal}</p>
                  : superaCupo ? <p className="form-error"><AlertCircle size={12} /> El avance supera el cupo disponible</p>
                  : card && <p className="form-hint">Hasta {fmt(card.cupoDisponible)} (cupo disponible).</p>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="adv-fecha">Fecha del avance</label>
                <input id="adv-fecha" className={`form-input ${showErr('fechaCompra') ? 'error' : ''}`} type="date" value={form.fechaCompra}
                  onChange={set('fechaCompra')} onBlur={() => blur('fechaCompra')} aria-invalid={!!showErr('fechaCompra')} />
                {showErr('fechaCompra') && <p className="form-error"><AlertCircle size={12} /> {errs.fechaCompra}</p>}
              </div>
            </div>
            <div className="form-group">
              <span className="form-label">Cuotas</span>
              <ChoiceChips label="Cuotas" options={[1, 3, 6, 12, 24, 36]} value={form.numeroCuotas} onChange={v => setForm(f => ({ ...f, numeroCuotas: v }))} other min={1} max={36}
                suffix={cuotaPreview > 0 ? `${nCuotas} cuota${nCuotas !== 1 ? 's' : ''} de ${fmt(cuotaPreview)}` : null} />
              {showErr('numeroCuotas') && <p className="form-error"><AlertCircle size={12} /> {errs.numeroCuotas}</p>}
            </div>
            {comision > 0 && (
              <div className="notice info" style={{ margin: 0 }}>
                <Info size={16} />
                <span>Se cobra una comisión fija de <b className="n">{fmt(comision)}</b> en el corte vigente. Se paga con la primera cuota del avance y no ocupa cupo.</span>
              </div>
            )}
          </FormSection>

          <FormActions>
            <button type="button" className="btn btn-secondary" onClick={goBack}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}><Check size={16} /> {saving ? 'Registrando…' : 'Registrar avance'}</button>
          </FormActions>
        </div>

        <aside className="form-aside">
          <CardMini card={card} />
          <section className="card">
            <p className="text-secondary" style={{ margin: 0, fontSize: 14 }}>Cuota mensual del avance</p>
            {cuotaPreview > 0 ? (
              <>
                <p className="amount-lg" style={{ margin: '8px 0 2px', fontSize: 34 }}>{fmt(cuotaPreview)}</p>
                <p className="text-sm text-secondary n" style={{ margin: '0 0 12px' }}>{nCuotas} cuota{nCuotas !== 1 ? 's' : ''}</p>
                <div className="row-list" style={{ borderTop: '1px solid var(--divider)' }}>
                  <div className="kv"><span>Ocupa cupo</span><span>{fmt(montoAvance)}</span></div>
                  <div className="kv"><span>Comisión (este corte)</span><span className="text-warning">{comision > 0 ? fmt(comision) : '—'}</span></div>
                </div>
                <div className="row-between cc-debt-total"><b>Total del avance</b><b className="n" style={{ fontSize: 20 }}>{fmt(totalPreview)}</b></div>
              </>
            ) : (
              <p className="text-sm text-muted" style={{ margin: '12px 0 0' }}>Ingresa el monto para ver la simulación.</p>
            )}
          </section>
        </aside>
      </form>
    </div>
  );
};
