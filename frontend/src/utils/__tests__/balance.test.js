import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cardDueForMonth, cardPayMonth, creditDueForMonth, subDueForMonth, incomeDueForMonth, montoFila, resumenBalance, gastosPorOrigen } from '../balance';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 24)); // 24-nov-2026 local
});
afterEach(() => vi.useRealTimers());

describe('cardDueForMonth', () => {
  // Corte 15, pago 5: el extracto de diciembre se paga en enero.
  const card = {
    fechaCorte: 15, fechaPago: 5,
    CreditCardPurchases: [
      { id: 1, descripcion: 'TV', fechaCompra: '2026-11-20', numeroCuotas: 3, cuotasPagadas: 0, valorCuotaMensual: '100000', status: 'activa' },
    ],
  };

  it('el balance del mes muestra el extracto de ese mes (mes del corte)', () => {
    // Compra 20-nov (después del corte 15) → cortes de dic, ene y feb.
    expect(cardDueForMonth(card, 2026, 11)).toBe(0);
    expect(cardDueForMonth(card, 2026, 12)).toBe(100000);
    expect(cardDueForMonth(card, 2027, 2)).toBe(100000);
    expect(cardDueForMonth(card, 2027, 3)).toBe(0);
  });

  // Regresión 2026-11-24: con solo las compras activas, un extracto ya pagado salía en $0.
  it('incluye compras ya pagadas del extracto', () => {
    const c = { fechaCorte: 20, fechaPago: 10, CreditCardPurchases: [
      { id: 2, descripcion: 'Pagada', fechaCompra: '2026-10-25', numeroCuotas: 1, cuotasPagadas: 1, valorCuotaMensual: '42000', status: 'pagada' },
    ] };
    expect(cardDueForMonth(c, 2026, 11)).toBe(42000);
  });

  it('cardPayMonth: pago antes del corte → mes siguiente', () => {
    expect(cardPayMonth({ fechaCorte: 30, fechaPago: 10 }, 2026, 12)).toEqual({ anio: 2027, mes: 1 });
    expect(cardPayMonth({ fechaCorte: 15, fechaPago: 30 }, 2026, 11)).toEqual({ anio: 2026, mes: 11 });
  });
});

describe('creditDueForMonth', () => {
  const credit = { status: 'activo', fechaInicio: '2026-01-02', diaPago: 2, numeroCuotas: 12, cuotasPagadas: 10, montoTotal: '1200000', tasaMensual: '0', valorCuota: '100000' };
  it('cuenta la cuota entre el inicio y la última cuota pendiente', () => {
    expect(creditDueForMonth(credit, 2026, 11)).toBe(100000);
    expect(creditDueForMonth(credit, 2027, 1)).toBe(100000);
    expect(creditDueForMonth(credit, 2027, 2)).toBe(0);
    expect(creditDueForMonth(credit, 2025, 12)).toBe(0);
  });
  it('un crédito pagado no cuenta', () => {
    expect(creditDueForMonth({ ...credit, status: 'pagado' }, 2026, 12)).toBe(0);
  });
});

describe('subDueForMonth', () => {
  it('mensual cada mes; anual solo el mes en que inició; convierte a COP', () => {
    expect(subDueForMonth({ status: 'activa', frecuencia: 'mensual', monto: '30000', moneda: 'COP', fechaInicio: '2026-01-10' }, 2026, 11)).toBe(30000);
    const anual = { status: 'activa', frecuencia: 'anual', monto: '10', moneda: 'USD', fechaInicio: '2025-03-01' };
    expect(subDueForMonth(anual, 2026, 3)).toBe(40000);
    expect(subDueForMonth(anual, 2026, 4)).toBe(0);
  });
  it('fuera de vigencia o cancelada no cuenta', () => {
    const s = { status: 'activa', frecuencia: 'mensual', monto: '1', moneda: 'COP', fechaInicio: '2026-06-01', fechaFin: '2026-09-30' };
    expect(subDueForMonth(s, 2026, 5)).toBe(0);
    expect(subDueForMonth(s, 2026, 10)).toBe(0);
    expect(subDueForMonth({ ...s, status: 'cancelada' }, 2026, 7)).toBe(0);
  });
});

describe('incomeDueForMonth', () => {
  it('fijo cada mes; extra solo el mes en que se registró', () => {
    expect(incomeDueForMonth({ status: 'activo', tipo: 'fijo', monto: '1859000' }, 2027, 2)).toBe(1859000);
    const extra = { status: 'activo', tipo: 'extra', monto: '500000', createdAt: new Date(2026, 10, 3, 10).toISOString() };
    expect(incomeDueForMonth(extra, 2026, 11)).toBe(500000);
    expect(incomeDueForMonth(extra, 2026, 12)).toBe(0);
  });
});

describe('montoFila', () => {
  const fuentes = { incomes: [{ id: 5, status: 'activo', tipo: 'fijo', monto: '1000' }] };
  it('usa el monto guardado, si no el automático, y 0 si el enlace ya no existe', () => {
    expect(montoFila({ origen: 'ingreso', origenId: 5, monto: '1500.00', anio: 2026, mes: 11 }, fuentes)).toBe(1500);
    expect(montoFila({ origen: 'ingreso', origenId: 5, monto: null, anio: 2026, mes: 11 }, fuentes)).toBe(1000);
    expect(montoFila({ origen: 'ingreso', origenId: 99, monto: null, anio: 2026, mes: 11 }, fuentes)).toBe(0);
  });
});

describe('gastosPorOrigen', () => {
  it('suma solo gastos, por origen', () => {
    expect(gastosPorOrigen([
      { tipo: 'gasto', origen: 'tarjeta', valor: 100 },
      { tipo: 'gasto', origen: 'tarjeta', valor: 50 },
      { tipo: 'gasto', origen: 'manual', valor: 30 },
      { tipo: 'ingreso', origen: 'ingreso', valor: 999 },
    ])).toEqual({ tarjeta: 150, credito: 0, suscripcion: 0, manual: 30 });
  });
});

describe('resumenBalance', () => {
  // Mismos datos que noviembre en el Excel "Balance Nuevo".
  const filas = [
    { tipo: 'ingreso', categoria: 'Sueldo', estado: 'pendiente', valor: 1859000 },
    { tipo: 'ingreso', categoria: 'Ingresos extra', estado: 'pendiente', valor: 500000 },
    { tipo: 'ingreso', categoria: 'Ingresos extra', estado: 'pendiente', valor: 295000 },
    { tipo: 'ingreso', categoria: 'Ingresos extra', estado: 'recibido', valor: 100000 },
    { tipo: 'gasto', categoria: 'Tarjetas', estado: 'pendiente', valor: 1965000 },
    { tipo: 'gasto', categoria: 'Tarjetas', estado: 'pendiente', valor: 42000 },
    { tipo: 'gasto', categoria: 'Tarjetas', estado: 'pagado', valor: 150000 },
    { tipo: 'gasto', categoria: 'Hogar', estado: 'comprometido', valor: 80000 },
    { tipo: 'gasto', categoria: 'Otros', estado: 'pendiente', valor: 100000 },
  ];
  const r = resumenBalance(filas);
  it('totales y lo que queda', () => {
    expect(r.ingresos).toBe(2754000);
    expect(r.gastos).toBe(2337000);
    expect(r.queda).toBe(417000);
    expect(r.pagado).toBe(150000);
    expect(r.comprometido).toBe(80000);
    expect(r.pendiente).toBe(2107000);
    expect(r.disponibleHoy).toBe(100000 - 150000);
    expect(r.pctPagado).toBeCloseTo(150000 / 2337000);
  });
  it('gastos por categoría de mayor a menor', () => {
    expect(r.categorias).toEqual([
      { categoria: 'Tarjetas', valor: 2157000 },
      { categoria: 'Otros', valor: 100000 },
      { categoria: 'Hogar', valor: 80000 },
    ]);
  });
});
