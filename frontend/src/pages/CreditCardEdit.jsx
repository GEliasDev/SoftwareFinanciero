import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CreditCardService } from '../services/creditCardService';
import {
  ArrowLeft, CreditCard, Check, AlertTriangle, Calendar,
  DollarSign, Percent, TrendingDown,
} from 'lucide-react';
import { CARD_COLORS, getCardGradient } from '../utils/cardColors';

const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n ?? 0);

function calcCuota(monto, cuotas, tasaPct) {
  if (!monto || cuotas < 1) return 0;
  if (cuotas === 1) return monto;
  const i = tasaPct / 100;
  const f = Math.pow(1 + i, cuotas);
  return monto * (i * f) / (f - 1);
}

function nextDatePreview(day) {
  if (!day) return null;
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth(), Number(day));
  if (d <= today) d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}

export const CreditCardEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [simCuotas, setSimCuotas] = useState(12);
  const [editData, setEditData] = useState({
    nombre: '', entidad: '', cupoTotal: '',
    tasaInteresMensual: '', fechaCorte: '', fechaPago: '',
    status: 'activa', ultimos4: '', color: 'blue',
  });

  useEffect(() => {
    CreditCardService.getById(id)
      .then(card => setEditData({
        nombre: card.nombre,
        entidad: card.entidad,
        cupoTotal: card.cupoTotal,
        tasaInteresMensual: card.tasaInteresMensual,
        fechaCorte: card.fechaCorte,
        fechaPago: card.fechaPago,
        status: card.status,
        ultimos4: card.ultimos4 ?? '',
        color: card.color ?? 'blue',
      }))
      .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la tarjeta.' }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await CreditCardService.update(id, {
        nombre: editData.nombre,
        entidad: editData.entidad,
        cupoTotal: Number(editData.cupoTotal),
        tasaInteresMensual: Number(editData.tasaInteresMensual),
        fechaCorte: Number(editData.fechaCorte),
        fechaPago: Number(editData.fechaPago),
        status: editData.status,
        ultimos4: editData.ultimos4 || null,
        color: editData.color,
      });
      Swal.fire({ icon: 'success', title: '¡Actualizado!', timer: 1500, showConfirmButton: false });
      navigate(`/credit-cards/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo actualizar la tarjeta.' });
    } finally {
      setSaving(false);
    }
  };

  const tasaMensual = parseFloat(editData.tasaInteresMensual) || 0;
  const tasaEA = tasaMensual
    ? ((Math.pow(1 + tasaMensual / 100, 12) - 1) * 100).toFixed(2)
    : null;
  const isHighRate = tasaEA && parseFloat(tasaEA) > 28.5;
  const cupoNum = parseFloat(editData.cupoTotal) || 0;
  const cuotaSim = cupoNum && tasaMensual ? calcCuota(cupoNum, simCuotas, tasaMensual) : null;
  const gradient = getCardGradient(editData.color);

  const statusBadgeStyle = {
    background: editData.status === 'activa' ? 'var(--color-success-bg)' : editData.status === 'bloqueada' ? 'var(--color-warning-bg)' : 'var(--color-bg)',
    color: editData.status === 'activa' ? 'var(--color-success)' : editData.status === 'bloqueada' ? 'var(--color-warning)' : 'var(--color-text-secondary)',
    fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, textTransform: 'uppercase',
  };

  if (loading) return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem' }}>
        {[200, 340].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: 980, margin: '0 auto' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate(`/credit-cards/${id}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Editar tarjeta</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              {editData.nombre} · {editData.entidad}
            </p>
          </div>
        </div>
        <span style={statusBadgeStyle}>{editData.status}</span>
      </div>

      {/* ── 2-column layout ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Left: Visual panel ──────────────────────────────────── */}
        <div style={{ position: 'sticky', top: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Live card preview */}
          <div style={{
            borderRadius: 16, background: gradient,
            padding: '1.5rem', minHeight: 210,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
            transition: 'background 0.4s ease',
          }}>
            <div style={{ position: 'absolute', top: '-35%', right: '-15%', width: 250, height: 250, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-45%', left: '-10%', width: 200, height: 200, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 0.2rem', fontWeight: 700, letterSpacing: '0.12em' }}>
                  {editData.entidad?.toUpperCase() || 'ENTIDAD'}
                </p>
                <p style={{ color: 'white', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                  {editData.nombre || 'Nombre de la tarjeta'}
                </p>
              </div>
              <CreditCard size={24} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: '0 0 0.2rem', fontWeight: 600, letterSpacing: '0.1em' }}>CUPO TOTAL</p>
              <p style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                {cupoNum ? fmt(cupoNum) : '—'}
              </p>
            </div>

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.15em' }}>
                {editData.ultimos4 ? `•••• •••• •••• ${editData.ultimos4}` : '•••• •••• •••• ••••'}
              </span>
              {tasaEA && (
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 500 }}>
                  {editData.tasaInteresMensual}% M.V. · {tasaEA}% E.A.
                </span>
              )}
            </div>
          </div>

          {/* Color picker */}
          <div className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Color de la tarjeta
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CARD_COLORS.map(c => (
                <button
                  key={c.key} type="button" title={c.label}
                  onClick={() => setEditData(prev => ({ ...prev, color: c.key }))}
                  style={{
                    width: 30, height: 30, borderRadius: '50%', background: c.gradient,
                    border: editData.color === c.key ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                    boxShadow: editData.color === c.key
                      ? '0 0 0 2px white, 0 0 0 4px var(--color-text-primary)'
                      : '0 2px 6px rgba(0,0,0,0.2)',
                    cursor: 'pointer', padding: 0, outline: 'none',
                    transform: editData.color === c.key ? 'scale(1.18)' : 'scale(1)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Rate info */}
          {tasaEA && (
            <div className={`info-box ${isHighRate ? 'warning' : 'primary'}`}>
              {isHighRate ? <AlertTriangle size={14} /> : <Percent size={14} />}
              <div>
                <strong>Tasa E.A.: {tasaEA}%</strong>
                <p style={{ margin: '2px 0 0', fontSize: 11, lineHeight: 1.5 }}>
                  {isHighRate
                    ? 'Supera la tasa de usura referencial (28.5% E.A.). Verifica con tu banco.'
                    : 'Dentro del rango habitual para tarjetas en Colombia.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Quick simulator */}
          {cupoNum > 0 && tasaMensual > 0 && (
            <div className="card" style={{ padding: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <DollarSign size={12} /> Simulador rápido
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 0.625rem' }}>Si usas el cupo completo en:</p>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                {[3, 6, 12, 24].map(n => (
                  <button
                    key={n} type="button" onClick={() => setSimCuotas(n)}
                    style={{
                      flex: 1, padding: '0.3rem 0', fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${simCuotas === n ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-xs)',
                      background: simCuotas === n ? 'var(--color-primary-light)' : 'transparent',
                      color: simCuotas === n ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      cursor: 'pointer', transition: 'all 0.1s ease',
                    }}
                  >{n}c</button>
                ))}
              </div>
              {cuotaSim && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Cuota aprox.</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-primary)' }}>{fmt(cuotaSim)}/mes</span>
                </div>
              )}
            </div>
          )}

          {/* Dates preview */}
          {(editData.fechaCorte || editData.fechaPago) && (
            <div className="card" style={{ padding: '1rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.625rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={12} /> Próximas fechas
              </p>
              {editData.fechaCorte && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Próximo corte</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{nextDatePreview(editData.fechaCorte)}</span>
                </div>
              )}
              {editData.fechaPago && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '0.3rem 0' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Próximo pago</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{nextDatePreview(editData.fechaPago)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Form panel ───────────────────────────────────── */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleSubmit}>

            {/* Section 1 */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.625rem', borderBottom: '2px solid var(--color-primary-light)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: 'var(--color-primary)', borderRadius: '50%', color: 'white', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>1</span>
                Identidad de la tarjeta
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nombre / Alias *</label>
                  <input className="form-input" name="nombre" value={editData.nombre}
                    onChange={handleChange} required placeholder="Ej: Visa Gold" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Entidad / Banco *</label>
                  <input className="form-input" name="entidad" value={editData.entidad}
                    onChange={handleChange} required placeholder="Ej: Bancolombia" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Estado</label>
                  <select className="form-input" name="status" value={editData.status} onChange={handleChange}>
                    <option value="activa">Activa</option>
                    <option value="bloqueada">Bloqueada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Últimos 4 dígitos <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span></label>
                  <input
                    className="form-input"
                    style={{ letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums' }}
                    value={editData.ultimos4}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setEditData(prev => ({ ...prev, ultimos4: v }));
                    }}
                    placeholder="1234" maxLength={4}
                  />
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.625rem', borderBottom: '2px solid var(--color-primary-light)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: 'var(--color-primary)', borderRadius: '50%', color: 'white', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>2</span>
                Datos financieros
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Cupo total (COP) *</label>
                  <input className="form-input" type="number" name="cupoTotal" value={editData.cupoTotal}
                    onChange={handleChange} required min="0.01" step="0.01" placeholder="0" />
                  <p className="form-hint">El cupo disponible se ajusta automáticamente</p>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Tasa mensual (%) *</label>
                  <input className="form-input" type="number" name="tasaInteresMensual" value={editData.tasaInteresMensual}
                    onChange={handleChange} required min="0.0001" step="0.0001" placeholder="Ej: 1.9872" />
                  {tasaEA && (
                    <p className="form-hint" style={{ color: isHighRate ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      ≈ {tasaEA}% E.A. {isHighRate ? '⚠ Alta' : '✓ Normal'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.625rem', borderBottom: '2px solid var(--color-primary-light)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: 'var(--color-primary)', borderRadius: '50%', color: 'white', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>3</span>
                Fechas de ciclo
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Día de corte * <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(1–31)</span></label>
                  <input className="form-input" type="number" name="fechaCorte" value={editData.fechaCorte}
                    onChange={handleChange} required min="1" max="31" placeholder="Ej: 20" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Día de pago * <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(1–31)</span></label>
                  <input className="form-input" type="number" name="fechaPago" value={editData.fechaPago}
                    onChange={handleChange} required min="1" max="31" placeholder="Ej: 5" />
                </div>
              </div>
            </div>

            {tasaEA && parseFloat(tasaEA) > 28.5 && (
              <div className="info-box warning" style={{ marginBottom: '1rem', fontSize: 12 }}>
                <TrendingDown size={13} />
                Tasa E.A. de <strong>{tasaEA}%</strong> — supera la tasa de usura referencial (28.5% E.A.). Verifica con tu banco.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.625rem', borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(`/credit-cards/${id}`)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Check size={14} /> {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
