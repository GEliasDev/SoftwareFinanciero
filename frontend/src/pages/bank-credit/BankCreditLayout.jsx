import { useState, useEffect } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import Swal from 'sweetalert2';
import { ArrowLeft, Edit2, Trash2, LayoutGrid, CalendarClock, BarChart2, RotateCcw } from 'lucide-react';
import { BankCreditService } from '../../services/bankCreditService';
import { TabNav } from '../../components/ui/TabNav';
import { fmt } from '../../utils/format';

const STATUS_BADGE = {
  activo:    { label: 'Activo',    bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  pagado:    { label: 'Pagado',    bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
  en_mora:   { label: 'En mora',   bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
  cancelado: { label: 'Cancelado', bg: 'var(--surface-2)', color: 'var(--text-3)' },
};

export const BankCreditLayout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCredit(await BankCreditService.getById(id));
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el crédito.' });
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
      confirmButtonColor: '#047857', cancelButtonColor: '#64748B',
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

  const handleUndo = async () => {
    const result = await Swal.fire({
      title: 'Deshacer último pago',
      html: `Se revertirá la cuota ${credit?.cuotasPagadas} de <b>${credit?.nombre}</b>.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#047857', cancelButtonColor: '#64748B',
      confirmButtonText: 'Sí, deshacer', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setUndoing(true);
    try {
      await BankCreditService.undoPayment(id);
      await load();
      Swal.fire({ icon: 'success', title: 'Pago revertido', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo revertir el pago.' });
    } finally {
      setUndoing(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: '¿Eliminar este crédito?', text: 'Esta acción no se puede deshacer.',
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
    <div className="animate-fade-in">
      <div className="skeleton" style={{ height: 44, marginBottom: 16, borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ height: 40, marginBottom: 16, borderRadius: 'var(--radius-md)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 92 }} />)}
      </div>
    </div>
  );

  const base = `/bank-credits/${id}`;
  const st = STATUS_BADGE[credit?.status] || STATUS_BADGE.activo;
  const tabs = [
    { to: '', label: 'Resumen', icon: LayoutGrid, end: true },
    { to: 'schedule', label: 'Plan de pagos', icon: CalendarClock },
    { to: 'analysis', label: 'Análisis', icon: BarChart2 },
  ];

  return (
    <div className="animate-fade-in detail-layout">
      <div className="page-header" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/bank-credits')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>{credit?.nombre}</h1>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>{credit?.entidad}</p>
          </div>
        </div>
        {/* flexWrap: en 375px caben máx. 2 botones por fila; sin wrap "Eliminar" quedaba cortado */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, textTransform: 'uppercase' }}>{st.label}</span>
          {credit?.cuotasPagadas > 0 && credit?.status !== 'pagado' && (
            <button className="btn btn-secondary" onClick={handleUndo} disabled={undoing} title="Deshacer último pago">
              <RotateCcw size={14} /> {undoing ? '…' : 'Deshacer pago'}
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate(`${base}/edit`)}><Edit2 size={14} /> Editar</button>
          <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar</button>
        </div>
      </div>

      <TabNav tabs={tabs} base={base} />
      <Outlet context={{ credit, reload: load, handlePay, paying, handleUndo, undoing }} />
    </div>
  );
};
