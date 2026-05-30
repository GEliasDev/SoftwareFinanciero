import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { BankCreditService } from '../services/bankCreditService';
import {
  ArrowLeft, Edit2, Trash2, Check, X, TrendingDown, Wallet, Percent, Receipt, Info,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { AmortizationSchedule } from '../components/bank-credits/AmortizationSchedule';
import { fmt, fmtDateLong } from '../utils/format';

const STATUS_BADGE = {
  activo:   { label: 'Activo',   bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  pagado:   { label: 'Pagado',   bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
  atrasado: { label: 'Atrasado', bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
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
    const result = await Swal.fire({
      title: 'Registrar pago de cuota',
      html: `Se registrará la siguiente cuota de <b>${credit?.nombre}</b>.<br/><span style="color:#64748b;font-size:0.85rem">Cuota: <b>${fmt(credit?.valorCuota)}</b></span>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#5B4DF1', cancelButtonColor: '#64748B',
      confirmButtonText: 'Registrar pago', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setPaying(true);
    try {
      await BankCreditService.registerPayment(id);
      await load();
      Swal.fire({ icon: 'success', title: '¡Cuota registrada!', timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Error al registrar el pago.' });
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
    const result = await Swal.fire({
      title: '¿Eliminar este crédito?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626', cancelButtonColor: '#64748B',
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await BankCreditService.delete(id);
      navigate('/bank-credits');
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el crédito.' });
    }
  };

  if (loading) return (
    <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="skeleton" style={{ height: 40, marginBottom: 16, borderRadius: 'var(--radius-md)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 92 }} />)}
      </div>
      <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-md)' }} />
    </div>
  );

  const pct = credit ? (credit.cuotasPagadas / credit.numeroCuotas) * 100 : 0;
  const st = STATUS_BADGE[credit?.status] || STATUS_BADGE.activo;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
      <PageHeader
        title={credit?.nombre}
        subtitle={credit?.entidad}
        back={
          <button onClick={() => navigate('/bank-credits')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
        }
        actions={!editing && (
          <>
            <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, alignSelf: 'center', textTransform: 'uppercase' }}>{st.label}</span>
            <button className="btn btn-secondary" onClick={() => setEditing(true)}><Edit2 size={14} /> Editar</button>
            <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar</button>
          </>
        )}
      />

      {error && <div className="auth-message error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Saldo pendiente" value={fmt(credit?.saldoPendiente)} delta={`${credit?.numeroCuotas - credit?.cuotasPagadas} cuotas restantes`} icon={TrendingDown} tone="neg" />
        <StatCard label="Cuota mensual" value={fmt(credit?.valorCuota)} delta={credit?.cuotaAdministracion > 0 ? `+ ${fmt(credit?.cuotaAdministracion)} admin` : 'sin administración'} icon={Wallet} tone="warn" />
        <StatCard label="Progreso" value={`${pct.toFixed(0)}%`} delta={`${credit?.cuotasPagadas}/${credit?.numeroCuotas} cuotas`} icon={Percent} tone="pos" />
        <StatCard label="Intereses totales" value={fmt(credit?.totalIntereses)} delta={`${credit?.tasaInteres}% ${credit?.tipoTasa === 'mensual' ? 'M.V.' : 'E.A.'}`} icon={Receipt} tone="brand" />
      </div>

      {/* Plan de pagos / amortización */}
      {!editing && <AmortizationSchedule credit={credit} onPay={handlePay} paying={paying} />}

      {/* Detalles / edición */}
      {!editing ? (
        <SectionCard title="Detalles del crédito" icon={Info}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <InfoRow label="Entidad" value={credit?.entidad} />
            <InfoRow label="Tipo de tasa" value={credit?.tipoTasa === 'mensual' ? 'Mensual (M.V.)' : 'Anual (E.A.)'} />
            <InfoRow label="Tasa de interés" value={`${credit?.tasaInteres}%`} />
            <InfoRow label="Tasa mensual" value={`${parseFloat(credit?.tasaMensual ?? 0).toFixed(4)}%`} />
            <InfoRow label="Monto original" value={fmt(credit?.montoTotal)} money />
            <InfoRow label="Total a pagar" value={fmt(credit?.totalAPagar)} money />
            <InfoRow label="Cuota administración" value={fmt(credit?.cuotaAdministracion)} money />
            <InfoRow label="Día de pago" value={`Día ${credit?.diaPago}`} />
            <InfoRow label="Fecha inicio" value={fmtDateLong(credit?.fechaInicio)} />
            <InfoRow label="Fecha fin est." value={fmtDateLong(credit?.fechaFin)} />
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Editar crédito" icon={Edit2}>
          <div className="info-box primary" style={{ marginBottom: '1rem', fontSize: 12 }}>
            <Info size={14} />
            <span>Solo puedes editar nombre, entidad, cuota de administración y día de pago. Los campos financieros no son modificables.</span>
          </div>
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
        </SectionCard>
      )}
    </div>
  );
};

const InfoRow = ({ label, value, money }) => (
  <div>
    <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</p>
    <p className={money ? 'tabular' : ''} style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5 }}>{value}</p>
  </div>
);
