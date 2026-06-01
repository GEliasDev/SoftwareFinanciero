import {
  Utensils, Car, Heart, Tv2, Home, Laptop, Tag, BookOpen, Plane, Package,
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
 * Construye el extracto ciclo a ciclo a partir de las compras activas y el día
 * de corte de la tarjeta. El índice 0 es el corte vigente (próxima fecha de corte).
 *
 * Cada compra factura su cuota 1 en el primer corte POSTERIOR a su fecha de
 * compra (comprar el día de corte → siguiente ciclo); la cuota k, k-1 ciclos
 * después. Solo se proyectan cuotas pendientes (> cuotasPagadas).
 *
 * @returns Array<{ key, date, label, total, lines, endingCount }>
 *   lines: [{ id, descripcion, categoria, valorCuota, cuotaActual, numeroCuotas, isLast }]
 */
export const buildSchedule = (activePurchases, card, monthsAhead = 12) => {
  if (!card) return [];
  const cutDay = Number(card.fechaCorte);
  const anchor = _nextOccurrence(cutDay);                 // próxima fecha de corte
  const anchorIdx = anchor.getFullYear() * 12 + anchor.getMonth();

  const points = Array.from({ length: monthsAhead }, (_, mOff) => {
    const cutIdx = anchorIdx + mOff;
    const date   = new Date(Math.floor(cutIdx / 12), cutIdx % 12, 1);
    const label  = date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
    const key    = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const lines = activePurchases.reduce((acc, p) => {
      const pagadas = Number(p.cuotasPagadas);
      const total   = Number(p.numeroCuotas);
      const cuotaActual = (cutIdx - firstCutMonthIndex(p.fechaCompra, cutDay)) + 1;
      if (cuotaActual >= 1 && cuotaActual <= total && cuotaActual > pagadas) {
        acc.push({
          id: p.id,
          descripcion: p.descripcion,
          categoria: p.categoria || 'otros',
          valorCuota: parseFloat(p.valorCuotaMensual ?? 0),
          cuotaActual,
          numeroCuotas: total,
          isLast: cuotaActual === total,
        });
      }
      return acc;
    }, []);

    const totalMes    = lines.reduce((s, l) => s + l.valorCuota, 0);
    const endingCount = lines.filter(l => l.isLast).length;
    return { key, date, label, total: totalMes, lines, endingCount };
  });

  // Recortar meses finales sin obligaciones.
  let last = points.length - 1;
  while (last > 0 && points[last].total === 0) last--;
  return points.slice(0, last + 1);
};
