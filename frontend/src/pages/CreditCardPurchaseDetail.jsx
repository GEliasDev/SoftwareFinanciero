import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CreditCardService } from '../services/creditCardService';
import {
  ArrowLeft, Edit2, Trash2, Check, X, DollarSign, Table2,
  Utensils, Car, Heart, Tv2, Home, Laptop, Tag, BookOpen, Plane, Package,
  ShoppingBag, Calendar, TrendingDown, CreditCard, ChevronRight, RotateCcw, Zap,
} from 'lucide-react';
import { getCardGradient } from '../utils/cardColors';

const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (str) => {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
};

const CATEGORIES = [
  { value: 'comida',          label: 'Comida',          Icon: Utensils, color: '#f97316' },
  { value: 'transporte',      label: 'Transporte',      Icon: Car,      color: '#3b82f6' },
  { value: 'salud',           label: 'Salud',           Icon: Heart,    color: '#ef4444' },
  { value: 'entretenimiento', label: 'Entretenimiento', Icon: Tv2,      color: '#8b5cf6' },
  { value: 'hogar',           label: 'Hogar',           Icon: Home,     color: '#14b8a6' },
  { value: 'tecnologia',      label: 'Tecnología',      Icon: Laptop,   color: '#06b6d4' },
  { value: 'ropa',            label: 'Ropa',            Icon: Tag,      color: '#ec4899' },
  { value: 'educacion',       label: 'Educación',       Icon: BookOpen, color: '#f59e0b' },
  { value: 'viajes',          label: 'Viajes',          Icon: Plane,    color: '#10b981' },
  { value: 'otros',           label: 'Otros',           Icon: Package,  color: '#6b7280' },
];
const getCat = (v) => CATEGORIES.find(c => c.value === v) ?? CATEGORIES[CATEGORIES.length - 1];

function buildAmortization(montoTotal, numeroCuotas, tasaMensualPct) {
  const n = Number(numeroCuotas);
  const P = parseFloat(montoTotal);
  const i = parseFloat(tasaMensualPct) / 100;
  const C = n === 1 ? P : P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  const rows = [];
  let saldo = P;
  for (let k = 1; k <= n; k++) {
    const interes = saldo * i;
    const capital = C - interes;
    saldo = Math.max(0, saldo - capital);
    rows.push({ periodo: k, cuota: C, interes, capital, saldo });
  }
  return rows;
}

export const CreditCardPurchaseDetail = () => {
  const { id: cardId, purchaseId } = useParams();
  const navigate = useNavigate();

  const [card, setCard]         = useState(null);
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editData, setEditData]   = useState({ descripcion: '', categoria: 'otros' });
  const [showAmort, setShowAmort] = useState(false);
  const [undoLoading, setUndoLoading] = useState(false);
  const [abonoMonto, setAbonoMonto]   = useState('');
  const [abonoLoading, setAbonoLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cardData, purchaseData] = await Promise.all([
        CreditCardService.getById(cardId),
        CreditCardService.getPurchaseById(cardId, purchaseId),
      ]);
      setCard(cardData);
      setPurchase(purchaseData);
      setEditData({ descripcion: purchaseData.descripcion, categoria: purchaseData.categoria || 'otros' });
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la compra.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [cardId, purchaseId]);

  const cat           = purchase ? getCat(purchase.categoria || 'otros') : null;
  const isPaid        = purchase?.status === 'pagada';
  const cuotasPagadas = purchase ? Number(purchase.cuotasPagadas) : 0;
  const numeroCuotas  = purchase ? Number(purchase.numeroCuotas) : 1;
  const cuotasRestantes = numeroCuotas - cuotasPagadas;
  const progress      = isPaid ? 100 : numeroCuotas > 0 ? (cuotasPagadas / numeroCuotas) * 100 : 0;
  const tasaMensual   = card ? parseFloat(card.tasaInteresMensual) : 0;
  const totalIntereses = purchase ? parseFloat(purchase.totalIntereses ?? 0) : 0;
  const pendienteTotal = cuotasRestantes * parseFloat(purchase?.valorCuotaMensual ?? 0);

  const amortRows = useMemo(
    () => (showAmort && purchase ? buildAmortization(purchase.montoTotal, numeroCuotas, tasaMensual) : null),
    [showAmort, purchase, numeroCuotas, tasaMensual]
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await CreditCardService.updatePurchase(cardId, purchaseId, {
        descripcion: editData.descripcion,
        categoria: editData.categoria,
      });
      setEditing(false);
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo actualizar la compra.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async () => {
    const result = await Swal.fire({
      title: 'Registrar pago de cuota',
      html: `<b>${purchase.descripcion}</b><br/>Cuota ${cuotasPagadas + 1} de ${numeroCuotas} — <b>${fmt(purchase.valorCuotaMensual)}</b><br/><span style="color:#64748b;font-size:0.85rem">${cuotasRestantes - 1} cuota${cuotasRestantes - 1 !== 1 ? 's' : ''} quedarán pendientes</span>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#1565C0', cancelButtonColor: '#64748B',
      confirmButtonText: 'Registrar pago', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await CreditCardService.registerPurchasePayment(cardId, purchaseId);
      await load();
      const pagada = cuotasPagadas + 1 >= numeroCuotas;
      Swal.fire({
        icon: 'success',
        title: pagada ? '¡Compra pagada!' : '¡Cuota registrada!',
        text: pagada
          ? `"${purchase.descripcion}" está completamente pagada.`
          : `Cuota ${cuotasPagadas + 1}/${numeroCuotas} registrada.`,
        timer: 2000, showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo registrar el pago.' });
    }
  };

  const handleUndoPay = async () => {
    const result = await Swal.fire({
      title: 'Deshacer último pago',
      html: `Se revertirá la cuota ${cuotasPagadas} de "<b>${purchase.descripcion}</b>".<br/>
             <span style="color:#64748b;font-size:0.85rem">El cupo de la tarjeta se descontará.</span>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#dc2626', cancelButtonColor: '#64748B',
      confirmButtonText: 'Deshacer pago', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setUndoLoading(true);
    try {
      await CreditCardService.undoPay(cardId, purchaseId);
      await load();
      Swal.fire({ icon: 'success', title: 'Pago revertido', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo revertir el pago.' });
    } finally {
      setUndoLoading(false);
    }
  };

  const handleApplyAbono = async () => {
    const monto = parseFloat(abonoMonto);
    if (!monto || monto <= 0) return;
    const capitalRestante = cuotasRestantes * (parseFloat(purchase.montoTotal) / numeroCuotas);
    const result = await Swal.fire({
      title: 'Aplicar abono extraordinario',
      html: `Abono de <b>${fmt(monto)}</b> a "<b>${purchase.descripcion}</b>".<br/>
             <span style="color:#64748b;font-size:0.85rem">${monto >= capitalRestante ? 'Este abono liquidará la deuda.' : 'Se reducirán las cuotas restantes.'}</span>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#1565C0', cancelButtonColor: '#64748B',
      confirmButtonText: 'Aplicar abono', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setAbonoLoading(true);
    try {
      await CreditCardService.registerAbono(cardId, purchaseId, monto);
      setAbonoMonto('');
      await load();
      Swal.fire({ icon: 'success', title: '¡Abono aplicado!', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo aplicar el abono.' });
    } finally {
      setAbonoLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: `¿Eliminar "${purchase.descripcion}"?`,
      text: 'El cupo utilizado será restaurado. Esta acción no se puede deshacer.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#DC2626', cancelButtonColor: '#64748B',
      confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await CreditCardService.deletePurchase(cardId, purchaseId);
      navigate(`/credit-cards/${cardId}`);
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la compra.' });
    }
  };

  if (loading) return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 'var(--radius-md)' }} />)}
      </div>
      {[240, 200].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
      ))}
    </div>
  );

  if (!purchase) return (
    <div className="card" style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center', padding: '2rem' }}>
      <p style={{ color: 'var(--color-text-muted)' }}>Compra no encontrada.</p>
      <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate(`/credit-cards/${cardId}`)}>
        <ArrowLeft size={14} /> Volver
      </button>
    </div>
  );

  const cardGradient = card ? getCardGradient(card.color) : 'var(--color-primary)';

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* ── Header / Breadcrumb ─────────────────────────────────────── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: '0.625rem' }}>
          <button onClick={() => navigate('/credit-cards')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, padding: 0 }}>
            Tarjetas
          </button>
          <ChevronRight size={12} />
          <button onClick={() => navigate(`/credit-cards/${cardId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, padding: 0 }}>
            {card?.nombre ?? '—'}
          </button>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{purchase.descripcion}</span>
        </div>

        <div className="page-header" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => navigate(`/credit-cards/${cardId}`)} className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>{purchase.descripcion}</h1>
              {card && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CreditCard size={11} /> {card.nombre} · {card.entidad}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isPaid
              ? <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, letterSpacing: '0.04em' }}>PAGADA</span>
              : <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, letterSpacing: '0.04em' }}>ACTIVA</span>
            }
          </div>
        </div>
      </div>

      {/* ── Card gradient accent strip ──────────────────────────────── */}
      <div style={{ height: 5, borderRadius: 99, marginBottom: '1.25rem', background: cardGradient }} />

      {/* ── 4 KPI cards ─────────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: '1.25rem' }}>
        {[
          { label: 'Monto original',      value: fmt(purchase.montoTotal),        accent: 'var(--color-text-secondary)', bg: 'var(--color-bg)',          border: 'var(--color-border)' },
          { label: 'Cuota mensual',        value: fmt(purchase.valorCuotaMensual), accent: 'var(--color-primary)',        bg: 'var(--color-primary-light)', border: 'rgba(21,101,192,0.15)' },
          { label: 'Total con intereses',  value: fmt(purchase.totalAPagar),       accent: '#dc2626',                     bg: '#fef2f2',                    border: 'rgba(220,38,38,0.15)' },
          { label: 'Intereses generados',  value: fmt(totalIntereses),             accent: 'var(--color-warning)',        bg: 'var(--color-warning-bg)',    border: 'rgba(217,119,6,0.15)' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: kpi.bg, border: `1px solid ${kpi.border}`, borderRadius: 'var(--radius-md)', padding: '1rem 1.125rem', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: kpi.accent, margin: 0, letterSpacing: '-0.01em' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── 2-column body ───────────────────────────────────────────── */}
      <div className="split-grid" style={{ marginBottom: '1rem' }}>

        {/* Left: Progress + Timeline + Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Progress card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <DollarSign size={14} style={{ color: 'var(--color-primary)' }} /> Progreso de pago
            </h3>

            {/* Progress bar */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
                <span>{isPaid ? '✓ Completada' : `${cuotasPagadas} de ${numeroCuotas} cuotas`}</span>
                <span style={{ fontWeight: 700, color: isPaid ? '#15803d' : 'var(--color-primary)' }}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 10, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: 10,
                  width: '100%',
                  background: isPaid ? 'linear-gradient(90deg, #059669, #34D399)' : 'linear-gradient(90deg, #1D4ED8, var(--color-primary))',
                  borderRadius: 99,
                  transition: 'transform 0.5s ease',
                  transformOrigin: 'left',
                  transform: `scaleX(${progress / 100})`,
                }} />
              </div>
              {!isPaid && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: 11, color: 'var(--color-text-muted)' }}>
                  <span>{cuotasRestantes} cuota{cuotasRestantes !== 1 ? 's' : ''} restante{cuotasRestantes !== 1 ? 's' : ''}</span>
                  <span style={{ fontWeight: 600 }}>{fmt(pendienteTotal)} pendiente</span>
                </div>
              )}
            </div>

            {/* Cuotas summary grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: 'Pagadas',   value: cuotasPagadas,   color: '#15803d', bg: '#f0fdf4' },
                { label: 'Restantes', value: cuotasRestantes, color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
                { label: 'Total',     value: numeroCuotas,    color: 'var(--color-text-secondary)', bg: 'var(--color-bg)' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius-sm)', padding: '0.625rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color, margin: 0, lineHeight: 1.1 }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: '0.15rem 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment timeline */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={14} style={{ color: 'var(--color-primary)' }} /> Historial de cuotas
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {Array.from({ length: numeroCuotas }, (_, i) => {
                const cuotaNum = i + 1;
                const paid = cuotaNum <= cuotasPagadas;
                const isCurrent = cuotaNum === cuotasPagadas + 1 && !isPaid;
                return (
                  <div
                    key={i}
                    title={paid ? `Cuota ${cuotaNum} — pagada` : isCurrent ? `Cuota ${cuotaNum} — próxima` : `Cuota ${cuotaNum} — pendiente`}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                      background: isPaid || paid ? 'linear-gradient(135deg, #059669, #34D399)' : isCurrent ? 'var(--color-primary-light)' : 'var(--color-bg)',
                      color: isPaid || paid ? 'white' : isCurrent ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      border: isCurrent ? '2px solid var(--color-primary)' : '1px solid transparent',
                      boxShadow: isCurrent ? '0 0 0 3px rgba(21,101,192,0.15)' : paid ? '0 1px 3px rgba(5,150,105,0.2)' : 'none',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    {isPaid || paid ? <Check size={12} /> : cuotaNum}
                  </div>
                );
              })}
            </div>
            {numeroCuotas > 1 && (
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0.625rem 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #34D399)', flexShrink: 0 }} />
                Pagada ·
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary-light)', border: '2px solid var(--color-primary)', flexShrink: 0 }} />
                Próxima ·
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', flexShrink: 0 }} />
                Pendiente
              </p>
            )}
          </div>

          {/* Purchase info */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShoppingBag size={14} style={{ color: 'var(--color-primary)' }} /> Información de la compra
            </h3>
            <div className="info-grid">
              {[
                { label: 'Fecha de compra', value: fmtDate(purchase.fechaCompra), Icon: Calendar },
                { label: 'Categoría',        value: cat.label,                    Icon: cat.Icon, color: cat.color },
                { label: 'Tasa mensual',     value: `${card?.tasaInteresMensual ?? '—'}% M.V.`, Icon: TrendingDown },
                { label: 'Tarjeta',          value: card ? `${card.nombre} · ${card.entidad}` : '—', Icon: CreditCard },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-xs)', background: item.color ? `${item.color}18` : 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <item.Icon size={13} style={{ color: item.color ?? 'var(--color-text-muted)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Action buttons or edit form */}
          {!editing ? (
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 1rem' }}>Acciones</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '0.625rem 0.875rem' }}
                  onClick={() => setEditing(true)}
                >
                  <Edit2 size={15} />
                  <div style={{ textAlign: 'left', marginLeft: '0.25rem' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Editar compra</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 400 }}>Cambiar nombre o categoría</div>
                  </div>
                </button>

                {!isPaid && (
                  <button
                    className="btn btn-success"
                    style={{ justifyContent: 'flex-start', padding: '0.625rem 0.875rem' }}
                    onClick={handlePay}
                  >
                    <DollarSign size={15} />
                    <div style={{ textAlign: 'left', marginLeft: '0.25rem' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Registrar cuota</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 400 }}>
                        {fmt(purchase.valorCuotaMensual)} · cuota {cuotasPagadas + 1}/{numeroCuotas}
                      </div>
                    </div>
                  </button>
                )}

                {cuotasPagadas > 0 && (
                  <button
                    className="btn btn-secondary"
                    style={{ justifyContent: 'flex-start', padding: '0.625rem 0.875rem' }}
                    onClick={handleUndoPay}
                    disabled={undoLoading}
                  >
                    <RotateCcw size={15} />
                    <div style={{ textAlign: 'left', marginLeft: '0.25rem' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {undoLoading ? 'Revirtiendo…' : 'Deshacer último pago'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 400 }}>Revierte la cuota {cuotasPagadas}</div>
                    </div>
                  </button>
                )}

                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '0.625rem 0.875rem' }}
                  onClick={() => setShowAmort(s => !s)}
                >
                  <Table2 size={15} />
                  <div style={{ textAlign: 'left', marginLeft: '0.25rem' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{showAmort ? 'Ocultar tabla' : 'Ver amortización'}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 400 }}>Tabla cuota por cuota</div>
                  </div>
                </button>

                <div style={{ height: 1, background: 'var(--color-border)', margin: '0.25rem 0' }} />

                <button
                  className="btn btn-danger"
                  style={{ justifyContent: 'flex-start', padding: '0.625rem 0.875rem' }}
                  onClick={handleDelete}
                >
                  <Trash2 size={15} />
                  <div style={{ textAlign: 'left', marginLeft: '0.25rem' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Eliminar compra</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 400 }}>Restaura el cupo utilizado</div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Edit2 size={14} /> Editar compra
              </h3>
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Descripción *</label>
                  <input
                    className="form-input"
                    value={editData.descripcion}
                    onChange={e => setEditData(p => ({ ...p, descripcion: e.target.value }))}
                    required placeholder="Descripción de la compra"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-input"
                    value={editData.categoria}
                    onChange={e => setEditData(p => ({ ...p, categoria: e.target.value }))}
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>
                    <X size={13} /> Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                    <Check size={13} /> {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Mini summary card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingDown size={14} style={{ color: 'var(--color-primary)' }} /> Resumen financiero
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { label: 'Capital financiado', value: fmt(purchase.montoTotal), color: 'var(--color-text-primary)', bold: true },
                { label: 'Total con intereses', value: fmt(purchase.totalAPagar), color: '#dc2626' },
                { label: 'Costo total intereses', value: fmt(totalIntereses), color: 'var(--color-warning)' },
                { label: 'Ya pagado (cuotas)', value: fmt(cuotasPagadas * parseFloat(purchase.valorCuotaMensual ?? 0)), color: '#15803d' },
                { label: 'Saldo pendiente', value: fmt(pendienteTotal), color: 'var(--color-primary)', bold: true },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: row.bold ? 700 : 600, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Abono extraordinario */}
          {!isPaid && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={14} style={{ color: '#d97706' }} /> Abono extraordinario
              </h3>
              <div className="form-group" style={{ marginBottom: '0.625rem' }}>
                <label className="form-label">Monto del abono</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Ej: 200000"
                  value={abonoMonto}
                  onChange={e => setAbonoMonto(e.target.value)}
                />
              </div>
              {abonoMonto && parseFloat(abonoMonto) > 0 && (
                <div className="info-box success" style={{ fontSize: 12, marginBottom: '0.625rem' }}>
                  <Zap size={12} />
                  {parseFloat(abonoMonto) >= cuotasRestantes * (parseFloat(purchase.montoTotal) / numeroCuotas)
                    ? 'Este abono liquidará la deuda completamente.'
                    : `Reducirá las cuotas restantes de ${cuotasRestantes}.`
                  }
                </div>
              )}
              <button
                className="btn btn-success"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleApplyAbono}
                disabled={abonoLoading || !abonoMonto || parseFloat(abonoMonto) <= 0}
              >
                <Zap size={13} /> {abonoLoading ? 'Aplicando…' : 'Aplicar abono'}
              </button>
            </div>
          )}

          {/* Card context */}
          {card && (
            <div
              style={{
                borderRadius: 'var(--radius-md)', background: cardGradient,
                padding: '1rem 1.25rem', position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}
            >
              <div style={{ position: 'absolute', top: '-40%', right: '-20%', width: 140, height: 140, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: '0 0 0.2rem', fontWeight: 600, letterSpacing: '0.1em' }}>{card.entidad.toUpperCase()}</p>
              <p style={{ color: 'white', fontWeight: 700, margin: '0 0 0.625rem', fontSize: 13 }}>{card.nombre}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                <span>Cupo total: {fmt(card.cupoTotal)}</span>
                <span>{card.tasaInteresMensual}% M.V.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Amortization table ──────────────────────────────────────── */}
      {showAmort && amortRows && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Table2 size={15} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-secondary)' }}>Tabla de amortización — Sistema Francés</span>
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: 12, color: 'var(--color-text-muted)' }}>
              <span>{cuotasPagadas} cuotas pagadas</span>
              <span style={{ color: '#dc2626' }}>Interés total: {fmt(amortRows.reduce((s, r) => s + r.interes, 0))}</span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)' }}>
                  {['#', 'Cuota total', 'Capital', 'Interés', 'Saldo'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 1rem', textAlign: h === '#' ? 'center' : 'right', fontWeight: 700, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {amortRows.map(row => {
                  const rowPaid = row.periodo <= cuotasPagadas;
                  const isCurrent = row.periodo === cuotasPagadas + 1 && !isPaid;
                  return (
                    <tr key={row.periodo} style={{ background: rowPaid ? '#f0fdf4' : isCurrent ? 'var(--color-primary-light)' : row.periodo % 2 === 0 ? 'var(--color-bg)' : 'var(--color-surface)' }}>
                      <td style={{ padding: '0.45rem 1rem', textAlign: 'center', fontWeight: 600, color: rowPaid ? '#15803d' : isCurrent ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                        {rowPaid ? <Check size={12} style={{ color: '#15803d' }} /> : row.periodo}
                      </td>
                      <td style={{ padding: '0.45rem 1rem', textAlign: 'right', color: 'var(--color-text-secondary)', fontWeight: rowPaid ? 500 : 400 }}>{fmt(row.cuota)}</td>
                      <td style={{ padding: '0.45rem 1rem', textAlign: 'right', color: 'var(--color-primary)', fontWeight: 500 }}>{fmt(row.capital)}</td>
                      <td style={{ padding: '0.45rem 1rem', textAlign: 'right', color: '#dc2626' }}>{fmt(row.interes)}</td>
                      <td style={{ padding: '0.45rem 1rem', textAlign: 'right', fontWeight: row.saldo === 0 ? 700 : 400, color: row.saldo === 0 ? '#15803d' : 'var(--color-text-secondary)' }}>
                        {fmt(row.saldo)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--color-bg)', borderTop: '2px solid var(--color-border)' }}>
                  <td style={{ padding: '0.625rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>Total</td>
                  <td style={{ padding: '0.625rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmt(amortRows.reduce((s, r) => s + r.cuota, 0))}</td>
                  <td style={{ padding: '0.625rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(amortRows.reduce((s, r) => s + r.capital, 0))}</td>
                  <td style={{ padding: '0.625rem 1rem', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmt(amortRows.reduce((s, r) => s + r.interes, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
