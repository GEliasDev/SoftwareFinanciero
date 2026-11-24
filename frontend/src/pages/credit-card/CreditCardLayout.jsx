import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Outlet, Link, useSearchParams } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Swal from '../../utils/alerts';
import { ArrowLeft, Pencil, Trash2, Plus, MoreHorizontal, Banknote, Upload } from 'lucide-react';
import { getCardColor } from '../../utils/cardColors';
import { rememberCard } from '../../utils/lastCard';
import { CreditCardService } from '../../services/creditCardService';
import { CardInboxService } from '../../services/cardInboxService';
import { TabNav } from '../../components/ui/TabNav';
import { fmt, nextOccurrence, daysUntil } from '../../utils/format';
import { buildSchedule, TASA_USURA_EA, attachAdvanceCommission } from '../../utils/creditCard';

// Re-exportada para no romper imports existentes; la fuente vive en utils/creditCard.
export { TASA_USURA_EA };

export const CreditCardLayout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard]           = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [pending, setPending]     = useState([]);
  const [loading, setLoading]     = useState(true);

  const normalizedPurchases = useMemo(() => attachAdvanceCommission(purchases), [purchases]);

  const load = async () => {
    setLoading(true);
    try {
      const [cardData, purchasesData, pendingData] = await Promise.all([
        CreditCardService.getById(id),
        CreditCardService.getPurchases(id),
        // Sin Gmail conectado (o si falla) la pestaña simplemente queda vacía.
        CardInboxService.list().catch(() => []),
      ]);
      setCard(cardData);
      setPurchases(purchasesData);
      setPending(pendingData.filter(p => p.creditCardId === Number(id)));
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la tarjeta.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  const [params, setParams] = useSearchParams();

  const activePurchases = useMemo(() => normalizedPurchases.filter(p => p.status === 'activa'), [normalizedPurchases]);

  // Corte cuyo pago está vigente: el corte más antiguo CERRADO (pasado) que tenga cuotas pendientes.
  // No exigimos el pago del corte vigente (isCurrent) hasta que este cierre físicamente.
  const payableSlot = useMemo(() => {
    if (!card) return null;
    const schedule = buildSchedule(normalizedPurchases, card);
    const oldestUnpaidPast = schedule.find(s => s.isPast && s.lines.some(l => !l.wasPaid));
    return oldestUnpaidPast ?? null;
  }, [normalizedPurchases, card]);

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
    const schedule = buildSchedule(normalizedPurchases, card);
    const current = schedule.find(s => s.isCurrent);
    return current?.total ?? 0;
  }, [normalizedPurchases, card]);
  const totalCapital      = useMemo(() => activePurchases.reduce((s, p) => s + parseFloat(p.montoTotal ?? 0), 0), [activePurchases]);
  const totalConIntereses = useMemo(() => activePurchases.reduce((s, p) => s + parseFloat(p.totalAPagar ?? 0), 0), [activePurchases]);
  const totalYaPagado     = useMemo(() => activePurchases.reduce((s, p) => s + Number(p.cuotasPagadas) * parseFloat(p.valorCuotaMensual ?? 0), 0), [activePurchases]);
  const totalRestante     = useMemo(() => activePurchases.reduce((s, p) => s + (Number(p.numeroCuotas) - Number(p.cuotasPagadas)) * parseFloat(p.valorCuotaMensual ?? 0), 0), [activePurchases]);
  const maxMesesRestantes = useMemo(() => activePurchases.length > 0 ? Math.max(...activePurchases.map(p => Number(p.numeroCuotas) - Number(p.cuotasPagadas))) : 0, [activePurchases]);

  const cupoUsado   = card ? parseFloat(card.cupoTotal) - parseFloat(card.cupoDisponible) : 0;
  const usagePct    = card ? (cupoUsado / parseFloat(card.cupoTotal)) * 100 : 0;
  const barColor    = usagePct >= 80 ? '#DC2626' : usagePct >= 50 ? '#D97706' : '#059669';
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
    // Las comisiones de avance se pagan automáticamente con la primera cuota de
    // su avance, así que NO se envían como pago individual — se cuentan en el
    // total mostrado pero se excluyen de los registros a pagar.
    const payItems = payableLines.filter(l => !l.isCommission);
    const result = await Swal.fire({
      title: 'Pagar este corte',
      html: `Se registrará <b>1 cuota</b> de las <b>${payItems.length} compra${payItems.length !== 1 ? 's' : ''}</b> de este corte.<br/><span style="color:#64748b;font-size:0.85rem">Total a pagar: <b>${fmt(payableTotal)}</b></span>`,
      icon: 'question', showCancelButton: true,
      confirmButtonText: 'Registrar pago', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    let errors = 0;
    await Promise.all(payItems.map(l => CreditCardService.registerPurchasePayment(id, l.id).catch(() => { errors++; })));
    await load();
    if (errors === 0) {
      Swal.fire({ icon: 'success', title: '¡Corte pagado!', text: `${payItems.length} cuota${payItems.length !== 1 ? 's' : ''} registrada${payItems.length !== 1 ? 's' : ''}.`, timer: 2000, showConfirmButton: false });
    } else {
      Swal.fire({ icon: 'warning', title: 'Parcialmente completado', text: `${payItems.length - errors} pagos ok, ${errors} fallaron.` });
    }
  };

  useEffect(() => {
    if (loading || params.get('accion') !== 'pagar') return;
    setParams({}, { replace: true });
    if (payableLines.length > 0) handlePayAll(); // eslint-disable-line react-hooks/set-state-in-effect
    else Swal.fire({ icon: 'info', title: 'No hay un corte por pagar', text: nextCorte ? `El corte actual cierra el ${nextCorte.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}; podrás registrar su pago después de esa fecha.` : 'Esta tarjeta no tiene cuotas pendientes de un corte cerrado.' });
  }, [loading, params]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div aria-busy="true">
      <div className="skeleton" style={{ height: 56, width: 360, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 40, marginBottom: 20 }} />
      <div className="cc-ov-grid">
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />)}
      </div>
    </div>
  );

  const base = `/credit-cards/${id}`;
  const tabs = [
    { to: '', label: 'Resumen', end: true },
    { to: 'statement', label: 'Extracto' },
    { to: 'purchases', label: 'Compras', badge: activePurchases.length },
    { to: 'pending', label: 'Por aprobar', badge: pending.length },
  ];

  const ctx = {
    card, purchases: normalizedPurchases, activePurchases, pending, id, reload: load,
    monthlyObligation, totalCapital, totalConIntereses, totalYaPagado, totalRestante, maxMesesRestantes,
    cupoUsado, usagePct, barColor, tasaEA, isHighRate,
    nextCorte, nextPago, daysCorte, daysPago, handlePayAll,
    payableCount: payableLines.length,
    payableTotal,
    payableLines,
  };

  const goPurchase = () => { rememberCard(id); navigate(`${base}/purchases/new`); };
  const STATUS_TONE = { activa: 'success', bloqueada: 'danger', cancelada: 'neutral' };

  const menu = (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="icon-btn" aria-label="Más acciones"><MoreHorizontal size={18} /></button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu-content" align="end" sideOffset={6}>
          <DropdownMenu.Item className="menu-item mobile-flex" onSelect={() => navigate(`${base}/edit`)}><Pencil size={16} /> Editar tarjeta</DropdownMenu.Item>
          <DropdownMenu.Item className="menu-item mobile-flex" onSelect={goPurchase}><Plus size={16} /> Registrar compra</DropdownMenu.Item>
          <DropdownMenu.Item className="menu-item" onSelect={() => navigate(`${base}/advances/new`)}><Banknote size={16} /> Avance en efectivo</DropdownMenu.Item>
          <DropdownMenu.Item className="menu-item" onSelect={() => navigate(`${base}/purchases/import`)}><Upload size={16} /> Importar extracto</DropdownMenu.Item>
          <DropdownMenu.Separator className="menu-sep" />
          <DropdownMenu.Item className="menu-item danger" onSelect={handleDelete}><Trash2 size={16} /> Eliminar tarjeta</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  return (
    <div className="animate-fade-in detail-layout">
      <nav className="breadcrumb desktop-flex" aria-label="Ruta">
        <Link to="/credit-cards">Tarjetas</Link><span aria-hidden="true">/</span><span>{card?.nombre}</span>
      </nav>

      <div className="detail-head">
        <button className="icon-btn ghost mobile-only" onClick={() => navigate('/credit-cards')} aria-label="Volver a tarjetas"><ArrowLeft size={20} /></button>
        <span className="cc-brand lg desktop-only" style={{ background: getCardColor(card?.color) }} aria-hidden="true" />
        <div className="detail-head-text">
          <div className="row" style={{ gap: 10 }}>
            <h1 className="page-title">{card?.nombre}</h1>
            {card?.status && <span className={`badge badge-${STATUS_TONE[card.status] ?? 'neutral'} desktop-only`} style={{ textTransform: 'capitalize' }}>{card.status}</span>}
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>{card?.entidad}{card?.ultimos4 ? ` · •••• ${card.ultimos4}` : ''}</p>
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary desktop-flex" onClick={() => navigate(`${base}/edit`)}><Pencil size={16} /> Editar</button>
          <button className="btn btn-secondary desktop-flex" onClick={goPurchase}><Plus size={16} /> Registrar compra</button>
          {menu}
        </div>
      </div>

      <TabNav tabs={tabs} base={base} />

      <Outlet context={ctx} />
    </div>
  );
};
