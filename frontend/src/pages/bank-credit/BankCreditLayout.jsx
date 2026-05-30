import { useState, useEffect } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import Swal from 'sweetalert2';
import { ArrowLeft, Edit2, Trash2, LayoutGrid, CalendarClock } from 'lucide-react';
import { BankCreditService } from '../../services/bankCreditService';
import { TabNav } from '../../components/ui/TabNav';
import { fmt } from '../../utils/format';

const STATUS_BADGE = {
  activo:   { label: 'Activo',   bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  pagado:   { label: 'Pagado',   bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
  atrasado: { label: 'Atrasado', bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
};

export const BankCreditLayout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

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
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/bank-credits')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>{credit?.nombre}</h1>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>{credit?.entidad}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, textTransform: 'uppercase' }}>{st.label}</span>
          <button className="btn btn-secondary" onClick={() => navigate(`${base}/edit`)}><Edit2 size={14} /> Editar</button>
          <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar</button>
        </div>
      </div>

      <TabNav tabs={tabs} base={base} />
      <Outlet context={{ credit, reload: load, handlePay, paying }} />
    </div>
  );
};
