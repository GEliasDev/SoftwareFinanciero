import {
  Utensils, Car, Heart, Tv2, Home, Laptop, Tag, BookOpen, Plane, Package,
  Banknote, Receipt, Wallet,
} from 'lucide-react';
import {
  nextOccurrence as _nextOccurrence,
  daysUntil as _daysUntil,
  effectiveDayInMonth as _effectiveDayInMonth,
} from './format';

// Tasa de usura de referencia (E.A.) para Colombia. Fuente única — antes estaba
// copiada a mano como 28.5 en 4 sitios. Es un valor de referencia orientativo
// (la Superfinanciera la fija por trimestre); si se quiere exactitud habría que
// consultarla en línea, pero para "tu tasa está alta" este umbral basta.
export const TASA_USURA_EA = 28.5;

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

export const attachAdvanceCommission = (purchases = []) => {
  const commissionByAdvance = new Map();

  purchases.forEach((purchase) => {
    if (purchase?.tipo === 'comision' && purchase?.avanceId != null) {
      commissionByAdvance.set(Number(purchase.avanceId), purchase);
    }
  });

  return purchases
    .filter((purchase) => !(purchase?.tipo === 'comision' && purchase?.avanceId != null))
    .map((purchase) => {
      if (purchase?.tipo === 'avance') {
        const commission = commissionByAdvance.get(Number(purchase.id));
        return commission ? { ...purchase, commission } : purchase;
      }
      return purchase;
    });
};

/* ── Fechas de corte / pago y urgencia ────────────────────────────────── */
// Helpers genéricos centralizados en format.js; se re-exportan aquí por
// compatibilidad con los consumidores existentes del módulo de tarjetas.
export { nextOccurrence, daysUntil, urgencyStyle, weekendToFriday, effectiveDayInMonth, parseLocalDate } from './format';

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
export const buildSchedule = (purchases = [], card, monthsAhead = 12, monthsBack) => {
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
      let isPending     = cuotaActual > pagadas;

      // Comisión de avance en formato crudo (depende del avance padre). Si ese
      // avance ya pagó su PRIMERA cuota, la comisión NO cuenta como pendiente,
      // aunque su status siga siendo 'activa' (dato histórico corrupto por el
      // bug previo a 2026-09-07: quedaba sin pagar al "Pagar este corte").
      if (p?.tipo === 'comision' && p?.avanceId != null) {
        const avance = purchases.find(a => a.id === Number(p.avanceId));
        // Si el avance falta en la lista (getAllCreditCards solo trae 'activa'),
        // significa que ya no está activo (pagada/cancelada) → la comisión no es pendiente.
        const avancePagado = !avance || Number(avance.cuotasPagadas) >= 1 || avance.status === 'pagada';
        if (avancePagado) {
          isPending = false;
        }
      }

      // Pasados: mostrar todas las cuotas válidas (historial). Vigente/futuros: solo pendientes.
      if (validCuota && (isPast || isPending)) {
        const autoPaid = p?.tipo === 'comision' && p?.avanceId != null && !isPending;
        acc.push({
          id: p.id,
          descripcion: p.descripcion,
          categoria: p.categoria || 'otros',
          tipo: p.tipo,
          valorCuota: parseFloat(p.valorCuotaMensual ?? 0),
          cuotaActual,
          numeroCuotas: total,
          isLast: cuotaActual === total,
          wasPaid: autoPaid ? true : !isPending,
        });
      }

      // Comisión de un avance: se paga junto con la PRIMERA cuota del avance.
      // Aparece en el extracto como línea informativa (suma al total del corte)
      // pero NO es una compra pagable aparte — la paga el avance al registrar
      // su primera cuota. `isCommission` permite excluirla del pago individual.
      // Si el avance ya pagó su primera cuota, la comisión se considera pagada
      // aunque su status siga 'activa' (dato histórico corrupto del bug anterior).
      if (p?.tipo === 'avance' && p?.commission && cuotaActual === 1) {
        const c           = p.commission;
        const avancePago1 = Number(p.cuotasPagadas) >= 1;
        const pagadasC    = avancePago1 ? 1 : Number(c.cuotasPagadas ?? 0);
        const pendienteC  = pagadasC < 1;
        if (isPast || pendienteC) {
          acc.push({
            id: c.id,
            descripcion: c.descripcion || 'Comisión por avance',
            categoria: c.categoria || 'otros',
            tipo: 'comision',
            isCommission: true,
            valorCuota: parseFloat(c.valorCuotaMensual ?? c.montoTotal ?? 0),
            cuotaActual: 1,
            numeroCuotas: 1,
            isLast: true,
            wasPaid: !pendienteC,
          });
        }
      }

      return acc;
    }, []);

    const totalMes    = lines.reduce((s, l) => s + l.valorCuota, 0);
    const endingCount = lines.filter(l => l.isLast).length;
    return { key, date, label, total: totalMes, lines, endingCount, isPast, isCurrent, isPaymentDue };
  };

  // Historial COMPLETO: sin monthsBack explícito se deriva desde la compra más
  // antigua para que ningún extracto pasado quede fuera (antes se fijaba en 3
  // meses y el historial más viejo "desaparecía" de la vista). Reports.jsx pasa
  // 0 a propósito (su proyección solo mira hacia adelante).
  let back = monthsBack;
  if (back === undefined) {
    let firstIdx = null;
    for (const p of purchases) {
      if (p?.fechaCompra) {
        const idx = firstCutMonthIndex(p.fechaCompra, cutDay);
        if (firstIdx === null || idx < firstIdx) firstIdx = idx;
      }
    }
    // +1 cubre el ciclo en curso del corte más antiguo; el cap evita generar
    // cientos de meses vacíos con una tarjeta de muchos años.
    back = firstIdx === null ? 1 : Math.min(120, Math.max(1, anchorIdx - firstIdx + 1));
  }

  const pastCount   = Math.max(0, Number(back) || 0);
  const pastSlots   = Array.from({ length: pastCount }, (_, i) => buildSlot(-(pastCount - i)));
  const currentSlot = buildSlot(0);
  const futureSlots = Array.from({ length: monthsAhead - 1 }, (_, i) => buildSlot(i + 1));

  const past = pastSlots.filter(s => s.total > 0);
  let lastF  = futureSlots.length - 1;
  while (lastF > 0 && futureSlots[lastF].total === 0) lastF--;
  const future = futureSlots.slice(0, lastF + 1);

  return [...past, currentSlot, ...future];
};

/* ── Obligación mensual por tarjeta (fuente única) ────────────────────── */
/**
 * Obligación del ciclo activo de cada tarjeta: el primer corte (pasado,
 * vigente o futuro) con cuotas pendientes. Fuente ÚNICA compartida por la
 * lista de Tarjetas y el Dashboard, para que los números de Inicio y Tarjetas
 * no puedan desfasarse: ambos llaman a esta función, que a su vez usa
 * `buildSchedule`. Cualquier cambio en la lógica de extractos se refleja en
 * las dos pantallas a la vez.
 *
 * @returns Array<{ cardId, nombre, entidad, cardOblMes, nextPago, dPago,
 *                  activePurchases, activeSlot, tieneDeuda }>
 */
export const buildCardStats = (cards = []) =>
  cards.map(c => {
    const schedule = buildSchedule(c.CreditCardPurchases || [], c);

    // Primer ciclo con cuotas pendientes: el corte hacia el que el usuario
    // está aportando o debe pagar.
    const activeSlot = schedule.find(s => s.lines.some(l => !l.wasPaid));

    if (!activeSlot) {
      return {
        cardId: c.id, nombre: c.nombre, entidad: c.entidad,
        cardOblMes: 0, nextPago: null, dPago: 999,
        activePurchases: [], activeSlot: null, tieneDeuda: false,
      };
    }

    const cardOblMes = activeSlot.lines
      .filter(l => !l.wasPaid)
      .reduce((s, l) => s + l.valorCuota, 0);

    const activePurchases = (c.CreditCardPurchases || []).filter(p => p.status === 'activa');

    // Fecha de pago del corte activo. Día recortado al mes destino: un
    // fechaPago=31 en un mes de 30 desbordaba al mes siguiente.
    const payMonthOffset = Number(c.fechaPago) < Number(c.fechaCorte) ? 1 : 0;
    const payYear  = activeSlot.date.getFullYear();
    const payMonth = activeSlot.date.getMonth() + payMonthOffset;
    const nextPago = new Date(payYear, payMonth, _effectiveDayInMonth(c.fechaPago, payYear, payMonth));
    const dPago = _daysUntil(nextPago);

    return {
      cardId: c.id, nombre: c.nombre, entidad: c.entidad,
      cardOblMes, nextPago, dPago,
      activePurchases, activeSlot,
      tieneDeuda: activeSlot.isPast && cardOblMes > 0,
    };
  });
