import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BankCreditService } from '../services/bankCreditService';
import { ArrowLeft, Landmark, Edit2, Trash2, Check, X, DollarSign } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (str) => {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_BADGE = {
  activo: { label: 'Activo', cls: 'badge badge-success' },
  pagado: { label: 'Pagado', cls: 'badge badge-primary' },
  atrasado: { label: 'Atrasado', cls: 'badge badge-danger' },
};

export const BankCreditDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editData, setEditData] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await BankCreditService.getById(id);
      setCredit(data);
      setEditData({
        nombre: data.nombre,
        entidad: data.entidad,
        cuotaAdministracion: data.cuotaAdministracion ?? 0,
        diaPago: data.diaPago,
      });
    } catch {
      setError('No se pudo cargar el crédito.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handlePay = async () => {
    if (!window.confirm('¿Registrar el pago de la siguiente cuota?')) return;
    setPaying(true);
    try {
      await BankCreditService.registerPayment(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar el pago.');
    } finally {
      setPaying(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await BankCreditService.update(id, {
        nombre: editData.nombre,
        entidad: editData.entidad,
        cuotaAdministracion: Number(editData.cuotaAdministracion),
        diaPago: Number(editData.diaPago),
      });
      await load();
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este crédito bancario? Esta acción no se puede deshacer.')) return;
    try {
      await BankCreditService.delete(id);
      navigate('/bank-credits');
    } catch {
      setError('No se pudo eliminar el crédito.');
    }
  };

  if (loading) return <div className="animate-fade-in" style={{ maxWidth: 680, margin: '0 auto' }}><p>Cargando...</p></div>;

  const progress = credit ? (credit.cuotasPagadas / credit.numeroCuotas) * 100 : 0;
  const statusInfo = STATUS_BADGE[credit?.status] || STATUS_BADGE.activo;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate('/bank-credits')} className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2" style={{ flex: 1 }}>
          <Landmark size={20} style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-2xl m-0" style={{ flex: 1 }}>{credit?.nombre}</h1>
          <span className={statusInfo.cls}>{statusInfo.label}</span>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setEditing(true)}><Edit2 size={14} /> Editar</button>
            <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar</button>
          </div>
        )}
      </div>

      {error && <div className="auth-message error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Progress card */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Cuotas pagadas</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {credit?.cuotasPagadas} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>/ {credit?.numeroCuotas}</span>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Saldo pendiente</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger)' }}>{fmt(credit?.saldoPendiente)}</p>
          </div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
          {progress.toFixed(1)}% completado
        </p>
        {credit?.status === 'activo' && (
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handlePay} disabled={paying} style={{ width: '100%' }}>
              <DollarSign size={14} /> {paying ? 'Registrando...' : `Pagar cuota — ${fmt(credit?.valorCuota)}`}
            </button>
          </div>
        )}
      </div>

      {/* Details */}
      {!editing ? (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <InfoRow label="Entidad" value={credit?.entidad} />
            <InfoRow label="Tipo de tasa" value={credit?.tipoTasa === 'mensual' ? 'Mensual' : 'Anual E.A.'} />
            <InfoRow label="Tasa de interés" value={`${credit?.tasaInteres}%`} />
            <InfoRow label="Tasa mensual" value={`${credit?.tasaMensual?.toFixed(4)}%`} />
            <InfoRow label="Monto original" value={fmt(credit?.montoTotal)} />
            <InfoRow label="Valor cuota" value={fmt(credit?.valorCuota)} />
            <InfoRow label="Cuota administración" value={fmt(credit?.cuotaAdministracion)} />
            <InfoRow label="Total intereses" value={fmt(credit?.totalIntereses)} />
            <InfoRow label="Total a pagar" value={fmt(credit?.totalAPagar)} />
            <InfoRow label="Día de pago" value={`Día ${credit?.diaPago}`} />
            <InfoRow label="Fecha inicio" value={fmtDate(credit?.fechaInicio)} />
            <InfoRow label="Fecha fin est." value={fmtDate(credit?.fechaFin)} />
          </div>
        </div>
      ) : (
        <div className="card">
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Solo puedes editar nombre, entidad, cuota de administración y día de pago. Los campos financieros no son modificables.
          </p>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" name="nombre" value={editData.nombre} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Entidad *</label>
                <input className="form-input" name="entidad" value={editData.entidad} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Cuota de Administración</label>
                <input className="form-input" type="number" name="cuotaAdministracion" value={editData.cuotaAdministracion} onChange={handleEditChange} min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Día de Pago * (1-31)</label>
                <input className="form-input" type="number" name="diaPago" value={editData.diaPago} onChange={handleEditChange} required min="1" max="31" />
              </div>
            </div>
            <div className="flex justify-end gap-2" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}><X size={14} /> Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}><Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div>
    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    <p style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</p>
  </div>
);
