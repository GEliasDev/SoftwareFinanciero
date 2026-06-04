import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import Swal from 'sweetalert2';
import { ArrowLeft, Edit2, Trash2, LayoutGrid, FileText, ShoppingBag, PieChart } from 'lucide-react';
import { CreditCardService } from '../../services/creditCardService';
import { TabNav } from '../../components/ui/TabNav';
import { fmt, nextOccurrence, daysUntil } from '../../utils/format';
import { CATEGORIES, buildSchedule } from '../../utils/creditCard';

export const TASA_USURA_EA = 28.5;

export const CreditCardLayout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard]           = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [cardData, purchasesData] = await Promise.all([
        CreditCardService.getById(id),
        CreditCardService.getPurchases(id),
      ]);
      setCard(cardData);
      setPurchases(purchasesData);
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la tarjeta.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const activePurchases = useMemo(() => purchases.filter(p => p.status === 'activa'), [purchases]);

  // Corte cuyo pago está vigente: el corte más antiguo CERRADO (pasado) que tenga cuotas pendientes.
  // No exigimos el pago del corte vigente (isCurrent) hasta que este cierre físicamente.
  const payableSlot = useMemo(() => {
    if (!card) return null;
    const schedule = buildSchedule(purchases, card);
    const oldestUnpaidPast = schedule.find(s => s.isPast && s.lines.some(l => !l.wasPaid));
    return oldestUnpaidPast ?? null;
  }, [purchases, card]);

  // Solo las compras con una cuota PENDIENTE en ese corte (no todas las activas).
  const payableLines = useMemo(
    () => (payableSlot ? payableSlot.lines.filter(l => !l.wasPaid) : []),
    [payableSlot]
  );
  const payableTotal = useMemo(
    () => payableLines.reduce((s, l) => s + l.valorCuota, 0),
    [payableLines]
  );
  
  // Obligación original facturada en el ciclo vigente (para KPIs y comparaciones)
  const monthlyObligation = useMemo(() => {
    if (!card) return 0;
    const schedule = buildSchedule(purchases, card);
    const current = schedule.find(s => s.isCurrent);
    return current?.total ?? 0;
  }, [purchases, card]);
  const totalCapital      = useMemo(() => activePurchases.reduce((s, p) => s + parseFloat(p.montoTotal ?? 0), 0), [activePurchases]);
  const totalConIntereses = useMemo(() => activePurchases.reduce((s, p) => s + parseFloat(p.totalAPagar ?? 0), 0), [activePurchases]);
  const totalYaPagado     = useMemo(() => activePurchases.reduce((s, p) => s + Number(p.cuotasPagadas) * parseFloat(p.valorCuotaMensual ?? 0), 0), [activePurchases]);
  const totalRestante     = useMemo(() => activePurchases.reduce((s, p) => s + (Number(p.numeroCuotas) - Number(p.cuotasPagadas)) * parseFloat(p.valorCuotaMensual ?? 0), 0), [activePurchases]);
  const maxMesesRestantes = useMemo(() => activePurchases.length > 0 ? Math.max(...activePurchases.map(p => Number(p.numeroCuotas) - Number(p.cuotasPagadas))) : 0, [activePurchases]);

  const cupoUsado   = card ? parseFloat(card.cupoTotal) - parseFloat(card.cupoDisponible) : 0;
  const usagePct    = card ? (cupoUsado / parseFloat(card.cupoTotal)) * 100 : 0;
  const barColor    = usagePct >= 80 ? '#ef4444' : usagePct >= 50 ? '#f59e0b' : '#22c55e';
  const tasaMensual = card ? parseFloat(card.tasaInteresMensual) : 0;
  const tasaEA      = ((Math.pow(1 + tasaMensual / 100, 12) - 1) * 100).toFixed(1);
  const isHighRate  = card && parseFloat(tasaEA) > TASA_USURA_EA;

  const nextCorte = useMemo(() => {
    if (!card) return null;
    return nextOccurrence(card.fechaCorte);
  }, [card]);

  const nextPago = useMemo(() => {
    if (!card) return null;
    const date = nextOccurrence(card.fechaPago);
    const today = new Date();
    // Si ya se pagó todo lo facturado (payableSlot es null) y hoy aún no pasa el día de pago de este mes,
    // significa que el pago de este mes ya se realizó. Por lo tanto, el próximo pago real es el del mes siguiente.
    if (payableSlot === null && today.getDate() <= Number(card.fechaPago) && activePurchases.length > 0) {
      date.setMonth(date.getMonth() + 1);
    }
    return date;
  }, [card, payableSlot, activePurchases]);

  const daysCorte = useMemo(() => (nextCorte ? daysUntil(nextCorte) : null), [nextCorte]);
  const daysPago  = useMemo(() => (nextPago ? daysUntil(nextPago) : null), [nextPago]);

  const categoryData = useMemo(() =>
    CATEGORIES.map(cat => ({
      name: cat.label, color: cat.color,
      value: activePurchases.filter(p => p.categoria === cat.value).reduce((s, p) => s + parseFloat(p.montoTotal ?? 0), 0),
    })).filter(d => d.value > 0),
    [activePurchases]
  );

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: '¿Eliminar tarjeta?',
      text: 'Se eliminarán también todas las compras registradas. Esta acción no se puede deshacer.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626', cancelButtonColor: '#64748B',
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await CreditCardService.delete(id);
      navigate('/credit-cards');
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la tarjeta.' });
    }
  };

  const handlePayAll = async () => {
    if (payableLines.length === 0) return;
    const result = await Swal.fire({
      title: 'Pagar este corte',
      html: `Se registrará <b>1 cuota</b> de las <b>${payableLines.length} compra${payableLines.length !== 1 ? 's' : ''}</b> de este corte.<br/><span style="color:#64748b;font-size:0.85rem">Total: <b>${fmt(payableTotal)}</b></span>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#5B4DF1', cancelButtonColor: '#64748B',
      confirmButtonText: 'Pagar corte', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    let errors = 0;
    await Promise.all(payableLines.map(l => CreditCardService.registerPurchasePayment(id, l.id).catch(() => { errors++; })));
    await load();
    if (errors === 0) {
      Swal.fire({ icon: 'success', title: '¡Corte pagado!', text: `${payableLines.length} cuota${payableLines.length !== 1 ? 's' : ''} registrada${payableLines.length !== 1 ? 's' : ''}.`, timer: 2000, showConfirmButton: false });
    } else {
      Swal.fire({ icon: 'warning', title: 'Parcialmente completado', text: `${payableLines.length - errors} pagos ok, ${errors} fallaron.` });
    }
  };

  if (loading) return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ height: 44, marginBottom: 16, borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ height: 40, marginBottom: 16, borderRadius: 'var(--radius-md)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '6fr 5fr', gap: '1rem' }}>
        <div className="skeleton" style={{ height: 210, borderRadius: 'var(--radius-md)' }} />
        <div className="skeleton" style={{ height: 210, borderRadius: 'var(--radius-md)' }} />
      </div>
    </div>
  );

  const base = `/credit-cards/${id}`;
  const tabs = [
    { to: '', label: 'Resumen', icon: LayoutGrid, end: true },
    { to: 'statement', label: 'Extracto', icon: FileText },
    { to: 'purchases', label: 'Compras', icon: ShoppingBag, badge: activePurchases.length },
    { to: 'analysis', label: 'Análisis', icon: PieChart },
  ];

  const ctx = {
    card, purchases, activePurchases, id, reload: load,
    monthlyObligation, totalCapital, totalConIntereses, totalYaPagado, totalRestante, maxMesesRestantes,
    cupoUsado, usagePct, barColor, tasaMensual, tasaEA, isHighRate,
    nextCorte, nextPago, daysCorte, daysPago, categoryData, handlePayAll,
    payableCount: payableLines.length,
    payableTotal,
    payableLines,
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/credit-cards')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>{card?.nombre}</h1>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {card?.entidad}
              {card?.status && (
                <span style={{
                  background: card.status === 'activa' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                  color: card.status === 'activa' ? 'var(--color-success)' : 'var(--color-warning)',
                  fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, textTransform: 'uppercase',
                }}>{card.status}</span>
              )}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate(`${base}/edit`)}><Edit2 size={14} /> Editar</button>
          <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={14} /> Eliminar</button>
        </div>
      </div>

      <TabNav tabs={tabs} base={base} />

      <Outlet context={ctx} />
    </div>
  );
};
