import { buildSchedule } from './creditCard';
import { buildLoanSchedule } from './bankCredit';
import { toCOP } from './currency';
import { parseLocalDate } from './format';

/* Balance mensual (plantilla tipo Excel). `mes` es 1-12 como en el backend. */

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const CATEGORIAS_INGRESO = ['Sueldo', 'Ingresos extra'];
export const CATEGORIAS_GASTO = ['Tarjetas', 'Créditos', 'Suscripciones', 'Hogar', 'Servicios', 'Mercado', 'Transporte', 'Salud', 'Educación', 'Entretenimiento', 'Ahorro', 'Otros'];

export const ESTADOS = {
  ingreso: [{ value: 'pendiente', label: 'Pendiente' }, { value: 'recibido', label: 'Recibido' }],
  gasto:   [{ value: 'pendiente', label: 'Pendiente' }, { value: 'comprometido', label: 'Comprometido' }, { value: 'pagado', label: 'Pagado' }],
};

const idx = (anio, mes) => anio * 12 + (mes - 1);
const idxDe = (d) => d.getFullYear() * 12 + d.getMonth();
const sum = (arr) => arr.reduce((s, n) => s + n, 0);

/**
 * Lo que se paga de una tarjeta en el mes: el total del corte cuyo vencimiento
 * cae en ese mes (si el día de pago es menor que el de corte, se paga el mes
 * siguiente al corte). Usa `buildSchedule`, la misma fuente que el extracto.
 */
export const cardDueForMonth = (card, anio, mes) => {
  if (!card) return 0;
  const offset = Number(card.fechaPago) < Number(card.fechaCorte) ? 1 : 0;
  const cut = idx(anio, mes) - offset;
  const key = `${Math.floor(cut / 12)}-${String((cut % 12) + 1).padStart(2, '0')}`;
  const slot = buildSchedule(card.CreditCardPurchases || [], card, 36).find(s => s.key === key);
  return slot ? slot.total : 0;
};

/** Cuota del crédito si el mes está entre su inicio y su última cuota pendiente. */
export const creditDueForMonth = (credit, anio, mes) => {
  if (!credit || !['activo', 'en_mora'].includes(credit.status)) return 0;
  const target = idx(anio, mes);
  const inicio = parseLocalDate(credit.fechaInicio);
  if (inicio && target < idxDe(inicio)) return 0;
  const { remaining } = buildLoanSchedule(credit);
  const ultima = remaining.length ? idxDe(remaining[remaining.length - 1].date) : null;
  // Mes actual o pasado con la cuota ya pagada: sigue contando la cuota del mes.
  if (ultima === null || target > ultima) return 0;
  return parseFloat(credit.valorCuota) || 0;
};

/** Cobro de una suscripción en el mes (anual: solo el mes en que inició), en COP. */
export const subDueForMonth = (sub, anio, mes) => {
  if (!sub || sub.status !== 'activa') return 0;
  const target = idx(anio, mes);
  const inicio = parseLocalDate(sub.fechaInicio);
  const fin = parseLocalDate(sub.fechaFin);
  if (inicio && target < idxDe(inicio)) return 0;
  if (fin && target > idxDe(fin)) return 0;
  if (sub.frecuencia === 'anual' && inicio && inicio.getMonth() !== mes - 1) return 0;
  return toCOP(sub.monto, sub.moneda);
};

/** Ingreso de Debti en el mes: fijo cada mes; extra solo el mes en que se registró. */
export const incomeDueForMonth = (inc, anio, mes) => {
  if (!inc || inc.status !== 'activo') return 0;
  if (inc.tipo === 'extra') {
    const d = new Date(inc.createdAt);
    if (idxDe(d) !== idx(anio, mes)) return 0;
  }
  return parseFloat(inc.monto) || 0;
};

const CALC = { tarjeta: cardDueForMonth, credito: creditDueForMonth, suscripcion: subDueForMonth, ingreso: incomeDueForMonth };
const FUENTE = { tarjeta: 'cards', credito: 'credits', suscripcion: 'subs', ingreso: 'incomes' };

/** Elemento de Debti al que apunta una fila enlazada (o undefined si ya no existe). */
export const fuenteDe = (item, fuentes) =>
  item.origen === 'manual' ? null : (fuentes[FUENTE[item.origen]] || []).find(f => f.id === item.origenId);

/**
 * Monto de una fila: el guardado si lo hay; si no (automático), el calculado
 * para el mes. Una fila enlazada cuyo elemento se borró queda en 0.
 */
export const montoFila = (item, fuentes) => {
  if (item.monto != null) return parseFloat(item.monto) || 0;
  const f = fuenteDe(item, fuentes);
  return f ? CALC[item.origen](f, item.anio, item.mes) : 0;
};

/** Resumen del mes, como el panel del Excel. `filas` = [{ ...item, valor }]. */
export const resumenBalance = (filas) => {
  const ing = filas.filter(f => f.tipo === 'ingreso');
  const gas = filas.filter(f => f.tipo === 'gasto');
  const total = (arr, estado) => sum(arr.filter(f => !estado || f.estado === estado).map(f => f.valor));
  const ingresos = total(ing);
  const recibido = total(ing, 'recibido');
  const gastos = total(gas);
  const pagado = total(gas, 'pagado');
  const comprometido = total(gas, 'comprometido');
  const pendiente = total(gas, 'pendiente');

  const porCat = new Map();
  for (const f of gas) porCat.set(f.categoria, (porCat.get(f.categoria) || 0) + f.valor);
  const categorias = [...porCat].map(([categoria, valor]) => ({ categoria, valor }))
    .filter(c => c.valor > 0).sort((a, b) => b.valor - a.valor);

  return {
    ingresos, recibido, gastos, pagado, comprometido, pendiente,
    queda: ingresos - gastos,
    disponibleHoy: recibido - pagado,
    pctPagado: gastos > 0 ? pagado / gastos : 0,
    categorias,
  };
};
