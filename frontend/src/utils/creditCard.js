import {
  Utensils, Car, Heart, Tv2, Home, Laptop, Tag, BookOpen, Plane, Package,
  Banknote, Receipt, Wallet,
} from 'lucide-react';
import { nextOccurrence as _nextOccurrence } from './format';

/* ── Formato ──────────────────────────────────────────────────────────── */
export const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n ?? 0);

export const fmtDate = (str) => {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtShort = (date) =>
  date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

export const monthLabel = (m) => {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1, 1)
    .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
};

/* ── Categorías ───────────────────────────────────────────────────────── */
export const CATEGORIES = [
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

export const getCat = (v) => CATEGORIES.find(c => c.value === v) ?? CATEGORIES[CATEGORIES.length - 1];

/**
 * Visual (ícono, label, color) de un movimiento según su tipo.
 * Para 'compra' usa la categoría; el resto tiene su propio distintivo.
 */
export const getMovimientoVisual = (tipo, categoria) => {
  switch (tipo) {
    case 'avance':       return { Icon: Banknote, label: 'Avance',          color: '#0891b2' };
    case 'comision':     return { Icon: Receipt,  label: 'Comisión',        color: '#b45309' };
    case 'cuota_manejo': return { Icon: Wallet,   label: 'Cuota de manejo', color: '#7c3aed' };
    default: {
      const cat = getCat(categoria);
      return { Icon: cat.Icon, label: cat.label, color: cat.color };
    }
  }
};

/* ── Fechas de corte / pago y urgencia ────────────────────────────────── */
// Helpers genéricos centralizados en format.js; se re-exportan aquí por
// compatibilidad con los consumidores existentes del módulo de tarjetas.
export { nextOccurrence, daysUntil, urgencyStyle, weekendToFriday } from './format';

// Índice absoluto de mes (año*12 + mes, 0-based) del PRIMER corte en que una
// compra empieza a facturar. Regla: si la compra se hizo el día de corte o
// después, ya pasó el corte de ese mes → factura en el siguiente ciclo.
const firstCutMonthIndex = (fechaCompra, cutDay) => {
  const [y, m, d] = String(fechaCompra).split('-').map(Number);
  const pIdx = y * 12 + (m - 1);
  return d >= cutDay ? pIdx + 1 : pIdx;
};

/* ── Extracto / calendario de pagos ───────────────────────────────────── */
/**
 * Construye el extracto ciclo a ciclo a partir de todas las compras y el día
 * de corte de la tarjeta.
 *
 * Cortes pasados (isPast): incluyen todas las cuotas válidas (pagadas o no).
 * Corte vigente (isCurrent) y futuros: solo cuotas pendientes (> cuotasPagadas).
 *
 * @returns Array<{ key, date, label, total, lines, endingCount, isPast, isCurrent }>
 *   lines: [{ id, descripcion, categoria, valorCuota, cuotaActual, numeroCuotas, isLast, wasPaid }]
 */
export const buildSchedule = (purchases, card, monthsAhead = 12, monthsBack = 3) => {
  if (!card) return [];
  const cutDay    = Number(card.fechaCorte);
  const anchor    = _nextOccurrence(cutDay);
  const anchorIdx = anchor.getFullYear() * 12 + anchor.getMonth();

  // Ventana de pago: el vencimiento del corte anterior cae ANTES del próximo corte.
  // Ej: corte el 30, pago hasta el 10 → el 1-ero el pago (10) viene antes que el próximo corte (30).
  const nextPayDate       = _nextOccurrence(Number(card.fechaPago));
  const isInPaymentWindow = nextPayDate < anchor;

  const buildSlot = (mOff) => {
    const isPast       = mOff < 0;
    const isCurrent    = mOff === 0;
    // El corte anterior (mOff=-1) es el que necesita pago cuando estamos en ventana de pago.
    const isPaymentDue = mOff === -1 && isInPaymentWindow;
    const cutIdx       = anchorIdx + mOff;
    const date      = new Date(Math.floor(cutIdx / 12), cutIdx % 12, 1);
    const label     = date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
    const key       = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const lines = purchases.reduce((acc, p) => {
      const pagadas     = Number(p.cuotasPagadas);
      const total       = Number(p.numeroCuotas);
      const cuotaActual = (cutIdx - firstCutMonthIndex(p.fechaCompra, cutDay)) + 1;
      const validCuota  = cuotaActual >= 1 && cuotaActual <= total;
      const isPending   = cuotaActual > pagadas;

      // Pasados: mostrar todas las cuotas válidas (historial). Vigente/futuros: solo pendientes.
      if (validCuota && (isPast || isPending)) {
        acc.push({
          id: p.id,
          descripcion: p.descripcion,
          categoria: p.categoria || 'otros',
          tipo: p.tipo,
          valorCuota: parseFloat(p.valorCuotaMensual ?? 0),
          cuotaActual,
          numeroCuotas: total,
          isLast: cuotaActual === total,
          wasPaid: !isPending,
        });
      }
      return acc;
    }, []);

    const totalMes    = lines.reduce((s, l) => s + l.valorCuota, 0);
    const endingCount = lines.filter(l => l.isLast).length;
    return { key, date, label, total: totalMes, lines, endingCount, isPast, isCurrent, isPaymentDue };
  };

  const pastSlots   = Array.from({ length: monthsBack }, (_, i) => buildSlot(-(monthsBack - i)));
  const currentSlot = buildSlot(0);
  const futureSlots = Array.from({ length: monthsAhead - 1 }, (_, i) => buildSlot(i + 1));

  const past = pastSlots.filter(s => s.total > 0);
  let lastF  = futureSlots.length - 1;
  while (lastF > 0 && futureSlots[lastF].total === 0) lastF--;
  const future = futureSlots.slice(0, lastF + 1);

  return [...past, currentSlot, ...future];
};
