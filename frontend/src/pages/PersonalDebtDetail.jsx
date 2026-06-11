import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PersonalDebtService } from '../services/personalDebtService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { TrendingDown, Wallet, Percent, Pencil, Plus, Repeat, ArrowLeft, Trash2, AlertCircle, Check, X, History } from 'lucide-react';
import { fmt } from '../utils/format';
import Swal from 'sweetalert2';

// ── Panel de abono inline ──────────────────────────────────────────────────────

const AbonoPanel = ({ debt, onSaved, onClose }) => {
  const [monto, setMonto]     = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving]   = useState(false);

  const montoNum    = Number(monto) || 0;
  const saldoActual = parseFloat(debt.saldoPendiente);
  const montoTotal  = parseFloat(debt.montoTotal);
  const pctActual   = montoTotal > 0 ? ((montoTotal - saldoActual) / montoTotal) * 100 : 0;

  const nuevoSaldo  = Math.max(0, saldoActual - montoNum);
  const nuevoPct    = montoTotal > 0 ? ((montoTotal - nuevoSaldo) / montoTotal) * 100 : 0;
  const hasError    = touched && !(montoNum > 0 && montoNum <= saldoActual);
  const errorMsg    = montoNum <= 0 ? 'Ingresa un monto mayor a 0' : 'No puede superar el saldo pendiente';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (hasError || montoNum <= 0) return;
    setSaving(true);
    try {
      await PersonalDebtService.registerAbono(debt.id, montoNum);
      onSaved();
      Swal.fire({ icon: 'success', title: 'Abono registrado', timer: 1400, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo registrar', confirmButtonColor: 'var(--brand-600)' });
    } finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: 16, borderLeft: '4px solid var(--brand-600)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Registrar abono</h3>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
            Saldo actual: <span className="tabular" style={{ fontWeight: 700, color: 'var(--neg-600)' }}>{fmt(saldoActual)}</span>
            &nbsp;·&nbsp;{pctActual.toFixed(0)}% pagado
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} title="Cerrar">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ margin: '0 0 1rem' }}>
          <label className="form-label">Monto del abono (COP) *</label>
          <input
            className={`form-input ${hasError ? 'error' : ''}`}
            type="number" min="1" max={saldoActual} step="any"
            value={monto}
            placeholder={`Ej: ${fmt(parseFloat(debt.montoCuota))}`}
            onChange={e => setMonto(e.target.value)}
            onBlur={() => setTouched(true)}
            autoFocus
          />
          {hasError && <p className="form-error"><AlertCircle size={11} /> {errorMsg}</p>}
        </div>

        {montoNum > 0 && montoNum <= saldoActual && (
          <div style={{
            background: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
            padding: '0.875rem 1rem', marginBottom: '1rem',
            display: 'flex', gap: '2rem', flexWrap: 'wrap',
          }}>
            {[
              { label: 'Nuevo saldo',  value: fmt(nuevoSaldo),            color: nuevoSaldo <= 0 ? 'var(--pos-600)' : 'var(--text)' },
              { label: 'Nuevo avance', value: `${nuevoPct.toFixed(1)}%`, color: 'var(--pos-600)' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{label}</p>
                <p className="tabular" style={{ fontSize: 15, fontWeight: 800, color, margin: 0 }}>{value}</p>
              </div>
            ))}
            {nuevoSaldo <= 0 && (
              <div style={{ alignSelf: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pos-600)', background: 'var(--pos-50)', padding: '3px 10px', borderRadius: 12 }}>
                  ¡Deuda saldada!
                </span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Check size={14} /> {saving ? 'Registrando...' : 'Confirmar abono'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Página de detalle ─────────────────────────────────────────────────────────

export const PersonalDebtDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [debt, setDebt]       = useState(null);
  const [abonos, setAbonos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAbono, setShowAbono] = useState(false);

  const load = () => {
    PersonalDebtService.getById(id).then(setDebt).catch(console.error).finally(() => setLoading(false));
    PersonalDebtService.getAbonos(id).then(setAbonos).catch(() => {});
  };
  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar esta obligación?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--neg-600)',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar',
    });
    if (!isConfirmed) return;
    await PersonalDebtService.delete(id);
    navigate('/personal-debts');
  };

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)', margin: 24 }} />;
  if (!debt) return null;

  const isDeuda    = debt.tipo === 'deuda';
  const montoTotal = parseFloat(debt.montoTotal ?? 0);
  const saldoActual = parseFloat(debt.saldoPendiente ?? 0);
  const pagado      = montoTotal > 0 ? Math.min(100, ((montoTotal - saldoActual) / montoTotal) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={debt.nombre}
        subtitle={isDeuda ? `Deuda con ${debt.prestamista}` : 'Gasto mensual recurrente'}
        back={
          <button onClick={() => navigate('/personal-debts')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {isDeuda && debt.status === 'activo' && !showAbono && (
              <button className="btn btn-primary" onClick={() => setShowAbono(true)}>
                <Plus size={14} /> Registrar abono
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => navigate(`/personal-debts/${id}/edit`)}>
              <Pencil size={14} /> Editar
            </button>
            <button className="btn btn-secondary" onClick={handleDelete} style={{ color: 'var(--neg-600)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        }
      />

      {showAbono && isDeuda && (
        <AbonoPanel
          debt={debt}
          onClose={() => setShowAbono(false)}
          onSaved={() => { setShowAbono(false); load(); }}
        />
      )}

      {isDeuda ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
            <StatCard label="Saldo pendiente"  value={fmt(saldoActual)} delta={`de ${fmt(montoTotal)} original`} icon={TrendingDown} tone="neg" />
            <StatCard label="Avance"           value={`${pagado.toFixed(0)}%`} delta={`${fmt(montoTotal - saldoActual)} abonado`} icon={Percent} tone="pos" />
          </div>
          <SectionCard title="Detalle">
            <div className="progress-track" style={{ marginBottom: 16 }}>
              <div className="progress-fill" style={{ transform: `scaleX(${pagado / 100})` }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', marginTop: -10, marginBottom: 16 }}>
              {pagado.toFixed(1)}% completado
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'A quién',         value: debt.prestamista },
                { label: 'Monto original',  value: fmt(montoTotal) },
                { label: 'Saldo pendiente', value: fmt(saldoActual) },
                { label: 'Estado',          value: debt.status },
                ...(debt.descripcion ? [{ label: 'Descripción', value: debt.descripcion }] : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 2 }}>{label}</p>
                  <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          {abonos.length > 0 && (
            <SectionCard title="Historial de abonos" icon={History} style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {abonos.map((a, i) => {
                  const fecha = new Date(a.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
                  return (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0',
                      borderBottom: i < abonos.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: 'color-mix(in srgb, var(--pos-600) 10%, var(--surface))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={14} style={{ color: 'var(--pos-600)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="tabular" style={{ fontSize: 14, fontWeight: 700, color: 'var(--pos-600)', margin: '0 0 1px' }}>
                          &minus; {fmt(parseFloat(a.monto))}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                          Saldo: {fmt(parseFloat(a.saldoAntes))} &rarr; {fmt(parseFloat(a.saldoDespues))}
                        </p>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{fecha}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
            <StatCard label="Monto mensual"  value={fmt(debt.montoCuota)}                                delta="Mensual recurrente" icon={Wallet}  tone="warn" />
            <StatCard label="Anual estimado" value={fmt(parseFloat(String(debt.montoCuota)) * 12)}       delta="12 meses"                          icon={Repeat}  tone="neutral" />
          </div>
          <SectionCard title="Detalle">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Monto mensual', value: fmt(debt.montoCuota) },
                { label: 'Estado',        value: debt.status },
                ...(debt.descripcion ? [{ label: 'Descripción', value: debt.descripcion }] : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 2 }}>{label}</p>
                  <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};
