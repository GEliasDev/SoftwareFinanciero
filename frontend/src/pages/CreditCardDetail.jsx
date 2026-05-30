import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CreditCardService } from '../services/creditCardService';
import {
  ArrowLeft, CreditCard, Edit2, Trash2, X, Plus, ShoppingBag,
  DollarSign, RotateCcw, AlertTriangle, TrendingDown, Calendar, Percent,
  ChevronDown, ChevronUp, CheckSquare, Search, SlidersHorizontal,
  Zap, ChevronRight,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getCardGradient } from '../utils/cardColors';
import { CardStatement } from '../components/credit-cards/CardStatement';
import {
  fmt, fmtDate, fmtShort, monthLabel, CATEGORIES, getCat,
  nextOccurrence, daysUntil, urgencyStyle,
} from '../utils/creditCard';

const TASA_USURA_EA = 28.5;

function calcAbonoImpact(activePurchases, abonoAmount, tasaMensual) {
  const extra = parseFloat(abonoAmount) || 0;
  if (extra <= 0 || activePurchases.length === 0) return null;

  const target = [...activePurchases].sort((a, b) =>
    (Number(b.numeroCuotas) - Number(b.cuotasPagadas)) - (Number(a.numeroCuotas) - Number(a.cuotasPagadas))
  )[0];

  const restantes = Number(target.numeroCuotas) - Number(target.cuotasPagadas);
  const capitalPorCuota = parseFloat(target.montoTotal) / Number(target.numeroCuotas);
  const capitalRestante = capitalPorCuota * restantes;
  const nuevoCapital = Math.max(0, capitalRestante - extra);

  let nuevasCuotas;
  if (nuevoCapital <= 0) {
    nuevasCuotas = 0;
  } else {
    const i = tasaMensual / 100;
    const C = parseFloat(target.valorCuotaMensual);
    if (i === 0 || C <= 0) {
      nuevasCuotas = Math.ceil(nuevoCapital / capitalPorCuota);
    } else {
      const ratio = 1 - (nuevoCapital * i) / C;
      nuevasCuotas = ratio <= 0 ? 1 : Math.ceil(-Math.log(ratio) / Math.log(1 + i));
    }
  }

  const mesesAhorrados = Math.max(0, restantes - nuevasCuotas);
  const interesAhorrado = Math.max(0, mesesAhorrados * (parseFloat(target.valorCuotaMensual) - capitalPorCuota));
  return { targetName: target.descripcion, mesesAhorrados, interesAhorrado };
}

export const CreditCardDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [card, setCard]           = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [flipped, setFlipped]     = useState(false);
  const [simBudget, setSimBudget]   = useState('');
  const [abonoExtra, setAbonoExtra] = useState('');
  const [abonoLoading, setAbonoLoading] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [searchText, setSearchText]   = useState('');
  const [filterCat, setFilterCat]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy]           = useState('fecha');

  const load = async () => {
    setLoading(true);
    try {
      const [cardData, purchasesData] = await Promise.all([
        CreditCardService.getById(id),
        CreditCardService.getPurchases(id),
      ]);
      setCard(cardData);
      setPurchases(purchasesData);
      if (purchasesData.length > 0) {
        const latest = purchasesData.map(p => p.fechaCompra.slice(0, 7)).sort().reverse()[0];
        setExpandedMonths(prev => ({ ...prev, [latest]: true }));
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la tarjeta.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const activePurchases = useMemo(() => purchases.filter(p => p.status === 'activa'), [purchases]);

  const monthlyObligation = useMemo(
    () => activePurchases.reduce((s, p) => s + parseFloat(p.valorCuotaMensual ?? 0), 0),
    [activePurchases]
  );
  const totalCapital      = useMemo(() => activePurchases.reduce((s, p) => s + parseFloat(p.montoTotal ?? 0), 0), [activePurchases]);
  const totalConIntereses = useMemo(() => activePurchases.reduce((s, p) => s + parseFloat(p.totalAPagar ?? 0), 0), [activePurchases]);
  const totalYaPagado     = useMemo(
    () => activePurchases.reduce((s, p) => s + Number(p.cuotasPagadas) * parseFloat(p.valorCuotaMensual ?? 0), 0),
    [activePurchases]
  );
  const totalRestante = useMemo(
    () => activePurchases.reduce((s, p) => s + (Number(p.numeroCuotas) - Number(p.cuotasPagadas)) * parseFloat(p.valorCuotaMensual ?? 0), 0),
    [activePurchases]
  );
  const maxMesesRestantes = useMemo(
    () => activePurchases.length > 0 ? Math.max(...activePurchases.map(p => Number(p.numeroCuotas) - Number(p.cuotasPagadas))) : 0,
    [activePurchases]
  );

  const cupoUsado   = card ? parseFloat(card.cupoTotal) - parseFloat(card.cupoDisponible) : 0;
  const usagePct    = card ? (cupoUsado / parseFloat(card.cupoTotal)) * 100 : 0;
  const barColor    = usagePct >= 80 ? '#ef4444' : usagePct >= 50 ? '#f59e0b' : '#22c55e';
  const tasaMensual = card ? parseFloat(card.tasaInteresMensual) : 0;
  const tasaEA      = ((Math.pow(1 + tasaMensual / 100, 12) - 1) * 100).toFixed(1);
  const isHighRate  = card && parseFloat(tasaEA) > TASA_USURA_EA;

  const nextCorte = card ? nextOccurrence(card.fechaCorte) : null;
  const nextPago  = card ? nextOccurrence(card.fechaPago)  : null;
  const daysCorte = nextCorte ? daysUntil(nextCorte) : null;
  const daysPago  = nextPago  ? daysUntil(nextPago)  : null;

  const filteredPurchases = useMemo(() => purchases.filter(p => {
    const matchSearch = !searchText || p.descripcion.toLowerCase().includes(searchText.toLowerCase());
    const matchCat    = filterCat === 'all' || p.categoria === filterCat;
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  }), [purchases, searchText, filterCat, filterStatus]);

  const purchasesByMonth = useMemo(() => {
    const map = {};
    filteredPurchases.forEach(p => {
      const m = p.fechaCompra.slice(0, 7);
      (map[m] = map[m] || []).push(p);
    });
    return map;
  }, [filteredPurchases]);

  const sortedMonths = useMemo(() => Object.keys(purchasesByMonth).sort().reverse(), [purchasesByMonth]);

  const categoryData = useMemo(() =>
    CATEGORIES.map(cat => ({
      name: cat.label, color: cat.color,
      value: activePurchases.filter(p => p.categoria === cat.value)
        .reduce((s, p) => s + parseFloat(p.montoTotal ?? 0), 0),
    })).filter(d => d.value > 0),
    [activePurchases]
  );

  const simAmount     = parseFloat(simBudget) || 0;
  const simDiff       = simAmount - monthlyObligation;
  const simSuficiente = simAmount > 0 && simAmount >= monthlyObligation;
  const abonoImpact   = useMemo(() => calcAbonoImpact(activePurchases, abonoExtra, tasaMensual), [abonoExtra, activePurchases, tasaMensual]);
  const hasFilters    = searchText || filterCat !== 'all' || filterStatus !== 'all';

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

  const handleApplyAbono = async () => {
    const monto = parseFloat(abonoExtra);
    if (!monto || monto <= 0 || activePurchases.length === 0) return;
    const target = [...activePurchases].sort((a, b) =>
      (Number(b.numeroCuotas) - Number(b.cuotasPagadas)) - (Number(a.numeroCuotas) - Number(a.cuotasPagadas))
    )[0];
    const capitalPorCuota = parseFloat(target.montoTotal) / Number(target.numeroCuotas);
    const capitalRestante = capitalPorCuota * (Number(target.numeroCuotas) - Number(target.cuotasPagadas));
    const result = await Swal.fire({
      title: 'Aplicar abono extraordinario',
      html: `Abono de <b>${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(monto)}</b> a "<b>${target.descripcion}</b>".<br/>
             <span style="color:#64748b;font-size:0.85rem">${monto >= capitalRestante ? 'Este abono liquidará la deuda.' : 'Se reducirán las cuotas restantes.'}</span>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#1565C0', cancelButtonColor: '#64748B',
      confirmButtonText: 'Aplicar abono', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setAbonoLoading(true);
    try {
      await CreditCardService.registerAbono(id, target.id, monto);
      setAbonoExtra('');
      await load();
      Swal.fire({ icon: 'success', title: '¡Abono aplicado!', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo aplicar el abono.' });
    } finally {
      setAbonoLoading(false);
    }
  };

  const handlePayAll = async () => {
    if (activePurchases.length === 0) return;
    const result = await Swal.fire({
      title: 'Pagar cuota del mes',
      html: `Se registrará <b>1 cuota</b> para cada una de las <b>${activePurchases.length} compras activas</b>.<br/><span style="color:#64748b;font-size:0.85rem">Total: <b>${fmt(monthlyObligation)}</b></span>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#1565C0', cancelButtonColor: '#64748B',
      confirmButtonText: 'Pagar todas', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    let errors = 0;
    await Promise.all(
      activePurchases.map(p =>
        CreditCardService.registerPurchasePayment(id, p.id).catch(() => { errors++; })
      )
    );
    await load();
    if (errors === 0) {
      Swal.fire({ icon: 'success', title: '¡Mes pagado!', text: `${activePurchases.length} cuotas registradas.`, timer: 2000, showConfirmButton: false });
    } else {
      Swal.fire({ icon: 'warning', title: 'Parcialmente completado', text: `${activePurchases.length - errors} pagos ok, ${errors} fallaron.` });
    }
  };

  const toggleMonth = (m) => setExpandedMonths(prev => ({ ...prev, [m]: !prev[m] }));

  if (loading) return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="skeleton" style={{ height: 210, borderRadius: 'var(--radius-md)' }} />
        <div className="skeleton" style={{ height: 210, borderRadius: 'var(--radius-md)' }} />
      </div>
      {[100, 180, 160].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
      ))}
    </div>
  );

  return (
    <div className="animate-fade-in">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/credit-cards')} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>
              {card?.nombre}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {card?.entidad}
              {card?.status && (
                <span style={{
                  background: card.status === 'activa' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                  color: card.status === 'activa' ? 'var(--color-success)' : 'var(--color-warning)',
                  fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, textTransform: 'uppercase',
                }}>
                  {card.status}
                </span>
              )}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/credit-cards/${id}/edit`)}>
            <Edit2 size={14} /> Editar
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────── */}
      {usagePct >= 75 && (
        <div className="info-box warning" style={{ marginBottom: '0.875rem' }}>
          <AlertTriangle size={15} />
          <span><strong>Cupo al {usagePct.toFixed(0)}%.</strong> Evita nuevas compras para no afectar tu salud financiera.</span>
        </div>
      )}
      {isHighRate && (
        <div className="info-box warning" style={{ marginBottom: '0.875rem' }}>
          <AlertTriangle size={15} />
          <span>
            <strong>Tasa alta:</strong> esta tarjeta tiene {tasaEA}% E.A., por encima de la tasa de usura referencial ({TASA_USURA_EA}% E.A.).
            Verifica con tu banco.
          </span>
        </div>
      )}

      {/* ══ HERO: Flip card (left) + Stats/Countdown (right) ════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '6fr 5fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* ── Left: flip card ────────────────────────────────────── */}
        <div className={`cc-flip-wrapper ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(f => !f)} style={{ marginBottom: 0 }}>
          <div className="cc-flip-inner">
            {/* FRONT */}
            <div className="cc-flip-front" style={{ background: getCardGradient(card?.color) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '0 0 0.15rem', fontWeight: 600, letterSpacing: '0.08em' }}>{card?.entidad?.toUpperCase()}</p>
                  <p style={{ color: 'white', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{card?.nombre}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <RotateCcw size={10} /> voltear
                  </span>
                  <CreditCard size={22} style={{ color: 'rgba(255,255,255,0.4)' }} />
                </div>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: '0 0 0.15rem', fontWeight: 600, letterSpacing: '0.08em' }}>CUPO DISPONIBLE</p>
                <p style={{ color: 'white', fontSize: '1.9rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  {fmt(card?.cupoDisponible ?? card?.cupoTotal)}
                </p>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }}>
                  <span>Usado: {fmt(cupoUsado)} ({usagePct.toFixed(0)}%)</span>
                  <span>Cupo total: {fmt(card?.cupoTotal)}</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 99 }}>
                  <div style={{ height: 5, width: `${Math.min(usagePct, 100)}%`, background: barColor, borderRadius: 99, boxShadow: `0 0 6px ${barColor}88`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0, fontFamily: 'monospace', letterSpacing: '0.15em' }}>
                  {card?.ultimos4 ? `•••• •••• •••• ${card.ultimos4}` : ''}
                </p>
              </div>
            </div>

            {/* BACK */}
            <div className="cc-flip-back" style={{ background: getCardGradient(card?.color) }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <RotateCcw size={10} /> voltear
                </span>
                <CreditCard size={22} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </div>
              <div className="cc-magnetic-strip" style={{ position: 'relative', zIndex: 1 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
                {[
                  { label: 'Tasa mensual', value: `${card?.tasaInteresMensual}% M.V.`, Icon: Percent },
                  { label: 'Tasa E.A.',   value: `${tasaEA}% E.A.`,                   Icon: TrendingDown },
                  { label: 'Día corte',   value: `Día ${card?.fechaCorte}`,            Icon: Calendar },
                  { label: 'Día pago',    value: `Día ${card?.fechaPago}`,             Icon: Calendar },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                    <item.Icon size={13} style={{ color: 'rgba(255,255,255,0.5)', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 1 }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.6)', position: 'relative', zIndex: 1 }}>
                <span>{activePurchases.length} compras activas</span>
                <span>Oblig. mensual: {fmt(monthlyObligation)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Countdown + KPI metrics ─────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Countdown badges */}
          {card && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {[
                { label: 'Próximo corte', days: daysCorte, date: nextCorte, Icon: Calendar },
                { label: 'Próximo pago',  days: daysPago,  date: nextPago,  Icon: DollarSign },
              ].map(({ label, days, date, Icon }) => {
                const s = urgencyStyle(days);
                return (
                  <div key={label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Icon size={13} style={{ color: s.color }} />
                      <span style={{ fontSize: 10, color: s.color, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>
                      {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days} días`}
                    </div>
                    <div style={{ fontSize: 11, color: s.color, opacity: 0.75, marginTop: 1 }}>{date ? fmtShort(date) : '—'}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* KPI Metric cards — 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', flex: 1 }}>
            {[
              {
                label: 'Obligación mensual',
                value: activePurchases.length > 0 ? fmt(monthlyObligation) : '—',
                sub: activePurchases.length > 0 ? `${activePurchases.length} compra${activePurchases.length !== 1 ? 's' : ''}` : 'sin cuotas activas',
                bg: 'var(--color-primary-light)', color: 'var(--color-primary)', border: 'rgba(21,101,192,0.15)',
              },
              {
                label: 'Cupo disponible',
                value: fmt(card?.cupoDisponible ?? 0),
                sub: `${(100 - usagePct).toFixed(0)}% disponible`,
                bg: usagePct >= 80 ? '#fef2f2' : 'var(--color-success-bg)',
                color: usagePct >= 80 ? '#dc2626' : 'var(--color-success)',
                border: usagePct >= 80 ? 'rgba(220,38,38,0.15)' : 'rgba(5,150,105,0.15)',
              },
              {
                label: 'Saldo pendiente',
                value: activePurchases.length > 0 ? fmt(totalRestante) : '—',
                sub: activePurchases.length > 0 ? `${maxMesesRestantes} mes${maxMesesRestantes !== 1 ? 'es' : ''} restante${maxMesesRestantes !== 1 ? 's' : ''}` : '0 deuda activa',
                bg: '#fffbeb', color: 'var(--color-warning)', border: 'rgba(217,119,6,0.15)',
              },
              {
                label: 'Tasa efectiva anual',
                value: `${tasaEA}%`,
                sub: isHighRate ? '⚠ Por encima de usura' : '✓ Dentro del límite',
                bg: isHighRate ? 'var(--color-warning-bg)' : 'var(--color-bg)',
                color: isHighRate ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                border: isHighRate ? 'rgba(217,119,6,0.15)' : 'var(--color-border)',
              },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: kpi.bg, border: `1px solid ${kpi.border}`, borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', boxShadow: 'var(--shadow-sm)' }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: kpi.color, margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>{kpi.label}</p>
                <p style={{ fontSize: '1.05rem', fontWeight: 800, color: kpi.color, margin: '0 0 0.2rem', letterSpacing: '-0.01em' }}>{kpi.value}</p>
                <p style={{ fontSize: 10, color: kpi.color, margin: 0, opacity: 0.65 }}>{kpi.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ Debt summary + Category chart ════════════════════════════ */}
      {activePurchases.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: categoryData.length > 0 ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <TrendingDown size={15} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: 0 }}>Resumen de deuda activa</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {[
                { label: 'Capital total',        value: fmt(totalCapital),         color: 'var(--color-text-secondary)' },
                { label: 'Total c/ intereses',   value: fmt(totalConIntereses),    color: '#dc2626' },
                { label: 'Ya pagado',            value: fmt(totalYaPagado),        color: 'var(--color-success)' },
                { label: 'Saldo restante',       value: fmt(totalRestante),        color: 'var(--color-primary)', bold: true },
                { label: 'Intereses totales',    value: fmt(totalConIntereses - totalCapital), color: 'var(--color-warning)' },
                { label: 'Meses hasta saldar',   value: `${maxMesesRestantes} mes${maxMesesRestantes !== 1 ? 'es' : ''}`, color: 'var(--color-text-secondary)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.325rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: row.bold ? 700 : 600, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {categoryData.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <ShoppingBag size={15} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: 0 }}>Por categoría</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value">
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ══ Extracto mensual: corte vigente + calendario ════════════ */}
      {activePurchases.length > 0 && (
        <CardStatement
          card={card}
          activePurchases={activePurchases}
          onPayMonth={handlePayAll}
        />
      )}

      {/* ══ Payment simulator ════════════════════════════════════════ */}
      {activePurchases.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.125rem' }}>
            <DollarSign size={15} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: 0 }}>Simulador de pago</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.125rem' }}>
            <div>
              <label className="form-label">¿Cuánto puedes pagar por mes?</label>
              <input className="form-input" type="number" min="0" step="1000" placeholder="Ej: 300000" value={simBudget} onChange={e => setSimBudget(e.target.value)} />
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Obligación actual: <strong style={{ color: 'var(--color-text-secondary)' }}>{fmt(monthlyObligation)}</strong>
              </p>
            </div>
            <div>
              {simAmount > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div className={`info-box ${simSuficiente ? 'success' : 'danger'}`} style={{ fontSize: 12 }}>
                    {simSuficiente
                      ? <span><strong>Suficiente.</strong> Cubres la obligación con {fmt(simDiff)} de margen.</span>
                      : <span><strong>Insuficiente.</strong> Faltan {fmt(Math.abs(simDiff))} para cubrir todas las cuotas.</span>
                    }
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Meses hasta saldar todo</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>{maxMesesRestantes} {maxMesesRestantes === 1 ? 'mes' : 'meses'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Intereses totales generados</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{fmt(totalConIntereses - totalCapital)}</span>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', paddingTop: 8 }}>Ingresa un monto para ver el análisis.</p>
              )}
            </div>
          </div>

          {/* Abono extraordinario */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.875rem' }}>
              <Zap size={14} style={{ color: '#d97706' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Abono extraordinario</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>— pago único de capital extra</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label className="form-label">Monto del abono</label>
                <input className="form-input" type="number" min="0" step="10000" placeholder="Ej: 500000" value={abonoExtra} onChange={e => setAbonoExtra(e.target.value)} />
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Se aplica a la compra con más cuotas restantes.</p>
              </div>
              <div>
                {abonoImpact ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div className="info-box success" style={{ fontSize: 12 }}>
                      <Zap size={12} />
                      {abonoImpact.mesesAhorrados > 0
                        ? <span>Ahorras <strong>{abonoImpact.mesesAhorrados} {abonoImpact.mesesAhorrados === 1 ? 'mes' : 'meses'}</strong> en <em>{abonoImpact.targetName}</em>.</span>
                        : <span>El abono liquida completamente <em>{abonoImpact.targetName}</em>.</span>
                      }
                    </div>
                    {abonoImpact.interesAhorrado > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Intereses que te ahorras</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>{fmt(abonoImpact.interesAhorrado)}</span>
                      </div>
                    )}
                    <button className="btn btn-success" style={{ fontSize: 12, padding: '0.4rem 0.875rem', marginTop: '0.25rem' }} onClick={handleApplyAbono} disabled={abonoLoading}>
                      <Zap size={12} /> {abonoLoading ? 'Aplicando…' : 'Aplicar abono real'}
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', paddingTop: 8 }}>Ingresa un monto para ver el impacto del abono.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Purchases section ════════════════════════════════════════ */}
      <div className="card">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShoppingBag size={16} style={{ color: 'var(--color-primary)' }} />
            Compras
            {activePurchases.length > 0 && (
              <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 99 }}>
                {activePurchases.length} activa{activePurchases.length !== 1 ? 's' : ''}
              </span>
            )}
            {purchases.length > activePurchases.length && (
              <span style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 99 }}>
                {purchases.length - activePurchases.length} pagada{purchases.length - activePurchases.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {activePurchases.length > 1 && (
              <button className="btn btn-success" style={{ padding: '0.35rem 0.75rem', fontSize: 12 }} onClick={handlePayAll}>
                <CheckSquare size={13} /> Pagar mes
              </button>
            )}
            <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: 12 }} onClick={() => navigate(`/credit-cards/${id}/purchases/new`)}>
              <Plus size={13} /> Nueva compra
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {purchases.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 160px' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 28, fontSize: 12, height: 34 }}
                placeholder="Buscar compra…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
            <select className="form-input" style={{ fontSize: 12, height: 34, flex: '0 0 auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select className="form-input" style={{ fontSize: 12, height: 34, flex: '0 0 auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Activas + pagadas</option>
              <option value="activa">Solo activas</option>
              <option value="pagada">Solo pagadas</option>
            </select>
            <select className="form-input" style={{ fontSize: 12, height: 34, flex: '0 0 auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="fecha">Ordenar: fecha</option>
              <option value="monto">Ordenar: monto ↓</option>
              <option value="cuotas-restantes">Ordenar: cuotas restantes ↓</option>
              <option value="categoria">Ordenar: categoría</option>
            </select>
            {hasFilters && (
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: 11, height: 34 }} onClick={() => { setSearchText(''); setFilterCat('all'); setFilterStatus('all'); }}>
                <X size={11} /> Limpiar
              </button>
            )}
          </div>
        )}

        {/* Purchase list */}
        {purchases.length === 0 ? (
          <div className="empty-state" style={{ padding: '2.5rem 0' }}>
            <div className="empty-state-icon"><ShoppingBag size={22} /></div>
            <p style={{ fontWeight: 600, color: 'var(--neutral-600)' }}>Sin compras registradas</p>
            <p>Registra tu primera compra con el botón "Nueva compra".</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--neutral-400)' }}>
            <SlidersHorizontal size={20} style={{ marginBottom: '0.5rem', opacity: 0.4, display: 'block', margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: 13 }}>Ninguna compra coincide con el filtro.</p>
          </div>
        ) : (
          <div>
            {sortedMonths.map(month => {
              const monthPurchases = purchasesByMonth[month];
              const isOpen = expandedMonths[month] !== false;
              const mTotal = monthPurchases.reduce((s, p) => s + parseFloat(p.montoTotal ?? 0), 0);
              const mActive = monthPurchases.filter(p => p.status === 'activa').length;

              return (
                <div key={month} style={{ marginBottom: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {/* Month header */}
                  <button onClick={() => toggleMonth(month)} style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.625rem 1rem', background: 'var(--color-bg)',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                        {monthLabel(month)}
                      </span>
                      {mActive > 0 && (
                        <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
                          {mActive} activa{mActive !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {monthPurchases.length} compra{monthPurchases.length !== 1 ? 's' : ''} · {fmt(mTotal)}
                      </span>
                      {isOpen ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />}
                    </div>
                  </button>

                  {/* Month purchases */}
                  {isOpen && (
                    <div style={{ padding: '0.625rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {[...monthPurchases].sort((a, b) => {
                        if (sortBy === 'monto') return parseFloat(b.montoTotal) - parseFloat(a.montoTotal);
                        if (sortBy === 'cuotas-restantes') return (Number(b.numeroCuotas) - Number(b.cuotasPagadas)) - (Number(a.numeroCuotas) - Number(a.cuotasPagadas));
                        if (sortBy === 'categoria') return (a.categoria || '').localeCompare(b.categoria || '');
                        return 0;
                      }).map(p => {
                        const cat           = getCat(p.categoria || 'otros');
                        const isPaid        = p.status === 'pagada';
                        const cuotasPagadas = Number(p.cuotasPagadas);
                        const numeroCuotas  = Number(p.numeroCuotas);
                        const progress      = isPaid ? 100 : numeroCuotas > 0 ? (cuotasPagadas / numeroCuotas) * 100 : 0;
                        const pgColor       = isPaid ? '#16a34a' : cuotasPagadas > 0 ? 'var(--color-primary)' : '#94a3b8';

                        return (
                          <div
                            key={p.id}
                            onClick={() => navigate(`/credit-cards/${id}/purchases/${p.id}`)}
                            style={{
                              border: '1px solid var(--color-border)',
                              borderLeft: `3px solid ${cat.color}`,
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.75rem 1rem',
                              display: 'flex', alignItems: 'center', gap: '0.75rem',
                              cursor: 'pointer',
                              background: isPaid ? 'var(--color-bg)' : 'var(--color-surface)',
                              opacity: isPaid ? 0.82 : 1,
                              transition: 'background 0.12s ease',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-light)'}
                            onMouseLeave={e => e.currentTarget.style.background = isPaid ? 'var(--color-bg)' : 'var(--color-surface)'}
                          >
                            {/* Icon */}
                            <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <cat.Icon size={16} style={{ color: cat.color }} />
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.descripcion}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>{fmt(p.montoTotal)}</span>
                                  {isPaid
                                    ? <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>PAGADA</span>
                                    : <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>ACTIVA</span>
                                  }
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.75rem', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>
                                <span>{fmtDate(p.fechaCompra)}</span>
                                <span>{fmt(p.valorCuotaMensual)}/cuota</span>
                                <span>{isPaid ? 'Completada' : `${cuotasPagadas}/${numeroCuotas} cuotas`}</span>
                              </div>
                              <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: 4, width: `${progress}%`, background: pgColor, borderRadius: 99, transition: 'width 0.4s ease', minWidth: cuotasPagadas > 0 || isPaid ? 6 : 0 }} />
                              </div>
                            </div>

                            <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
