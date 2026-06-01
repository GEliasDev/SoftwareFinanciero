import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CreditCardService } from '../services/creditCardService';
import { ArrowLeft, Banknote, Check, DollarSign, ChevronRight } from 'lucide-react';
import { getCardGradient } from '../utils/cardColors';

const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n ?? 0);

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

  const [card, setCard]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({
    descripcion: 'Avance en efectivo',
    montoTotal: '',
    numeroCuotas: '1',
    fechaCompra: new Date().toISOString().slice(0, 10),
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
  const totalConCupo = Number(form.montoTotal || 0) + comision;

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!card) return;
    if (totalConCupo > parseFloat(card.cupoDisponible)) {
      Swal.fire({ icon: 'warning', title: 'Cupo insuficiente', text: `Avance + comisión (${fmt(totalConCupo)}) supera el cupo disponible (${fmt(card.cupoDisponible)}).` });
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
      navigate(`/credit-cards/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo registrar el avance.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="skeleton" style={{ height: 56, borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: 360, borderRadius: 'var(--radius-md)' }} />
        <div className="skeleton" style={{ height: 360, borderRadius: 'var(--radius-md)' }} />
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: '0.625rem' }}>
          <button onClick={() => navigate('/credit-cards')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, padding: 0 }}>Tarjetas</button>
          <ChevronRight size={12} />
          <button onClick={() => navigate(`/credit-cards/${id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, padding: 0 }}>{card?.nombre ?? '—'}</button>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Registrar avance</span>
        </div>
        <div className="page-header" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => navigate(`/credit-cards/${id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>Registrar Avance</h1>
              {card && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                  {card.nombre} · Cupo disponible: <strong>{fmt(card.cupoDisponible)}</strong>
                  {comision > 0 && <> · Comisión: <strong>{fmt(comision)}</strong></>}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {card && (
            <div style={{ borderRadius: 'var(--radius-md)', background: getCardGradient(card.color), padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
              <div style={{ position: 'absolute', top: '-30%', right: '-15%', width: 130, height: 130, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: '0 0 0.15rem', fontWeight: 600, letterSpacing: '0.1em' }}>{card.entidad.toUpperCase()}</p>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 0.875rem' }}>{card.nombre}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 0.2rem', letterSpacing: '0.08em', fontWeight: 600 }}>CUPO DISPONIBLE</p>
              <p style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{fmt(card.cupoDisponible)}</p>
            </div>
          )}

          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <Banknote size={14} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-secondary)' }}>Vista previa</span>
            </div>
            {cuotaPreview > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 600, margin: '0 0 0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cuota mensual del avance</p>
                  <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0, letterSpacing: '-0.02em' }}>{fmt(cuotaPreview)}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>{form.numeroCuotas} cuota{Number(form.numeroCuotas) !== 1 ? 's' : ''}</p>
                </div>
                {[
                  { label: 'Total del avance', value: fmt(totalPreview), color: '#dc2626' },
                  { label: 'Comisión (este corte)', value: comision > 0 ? fmt(comision) : '—', color: 'var(--color-warning)' },
                  { label: 'Ocupa cupo', value: fmt(totalConCupo), color: 'var(--color-text-secondary)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.275rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.25rem 0' }}>
                Ingresa el monto para ver la simulación.
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Descripción *</label>
              <input className="form-input" value={form.descripcion} onChange={set('descripcion')} required placeholder="Ej: Avance en cajero" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Monto del avance *</label>
                <input className="form-input" type="number" value={form.montoTotal} onChange={set('montoTotal')} required min="0.01" step="0.01" placeholder="0.00" />
                {card && totalConCupo > parseFloat(card.cupoDisponible) && (
                  <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Avance + comisión supera el cupo</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Cuotas *</label>
                <input className="form-input" type="number" value={form.numeroCuotas} onChange={set('numeroCuotas')} required min="1" step="1" placeholder="1" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha del avance *</label>
              <input className="form-input" type="date" value={form.fechaCompra} onChange={set('fechaCompra')} required />
            </div>

            {comision > 0 && (
              <div className="info-box primary" style={{ marginBottom: '1.25rem', fontSize: 12 }}>
                <DollarSign size={13} />
                Se cobrará una comisión fija de <strong>{fmt(comision)}</strong> en el corte vigente, además de las cuotas del avance.
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate(`/credit-cards/${id}`)}>
                <ArrowLeft size={14} /> Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                <Check size={14} /> {saving ? 'Registrando…' : 'Registrar avance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
