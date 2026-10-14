import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachAdvanceCommission, buildSchedule, buildCardStats } from '../creditCard';

describe('attachAdvanceCommission', () => {
  it('une la comisión al avance correspondiente sin duplicarla en la lista', () => {
    const purchases = [
      { id: 10, tipo: 'avance', descripcion: 'Avance en efectivo', status: 'activa' },
      { id: 11, tipo: 'comision', avanceId: 10, descripcion: 'Comisión por avance', montoTotal: 25000, status: 'activa' },
      { id: 12, tipo: 'compra', descripcion: 'Compra normal', status: 'activa' },
    ];

    const result = attachAdvanceCommission(purchases);

    expect(result).toHaveLength(2);
    expect(result[0].tipo).toBe('avance');
    expect(result[0].commission).toMatchObject({ id: 11, avanceId: 10, montoTotal: 25000 });
    expect(result[1].tipo).toBe('compra');
  });

  it('deja las comisiones sin avance como registros independientes', () => {
    const purchases = [
      { id: 7, tipo: 'comision', descripcion: 'Comisión aislada', status: 'activa' },
    ];

    expect(attachAdvanceCommission(purchases)).toEqual(purchases);
  });
});

describe('buildSchedule — comisión de avance', () => {
  const card = { fechaCorte: 15, fechaPago: 5 };

  const avance = (withCommission = true) => ({
    id: 1, tipo: 'avance', descripcion: 'Avance en efectivo', status: 'activa',
    montoTotal: 100000, numeroCuotas: 3, cuotasPagadas: 0,
    valorCuotaMensual: 35000, fechaCompra: '2026-09-10',
    ...(withCommission ? {
      commission: {
        id: 2, tipo: 'comision', avanceId: 1, descripcion: 'Comisión por avance',
        montoTotal: 9900, numeroCuotas: 1, cuotasPagadas: 0,
        valorCuotaMensual: 9900, fechaCompra: '2026-09-10',
      },
    } : {}),
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7)); // 7-sep-2026 local; próximo corte: 15-sep-2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('suma la comisión al total del corte donde cae la primera cuota del avance', () => {
    const schedule = buildSchedule([avance()], card);
    const current = schedule.find(s => s.isCurrent);

    const commissionLine = current.lines.find(l => l.isCommission);
    expect(commissionLine).toBeDefined();
    expect(commissionLine.tipo).toBe('comision');
    expect(commissionLine.id).toBe(2);
    expect(commissionLine.wasPaid).toBe(false);

    // Avance (35.000) + comisión (9.900) = 44.900
    expect(current.total).toBe(44900);
  });

  it('marca la comisión como pagada cuando el avance ya pagó su primera cuota', () => {
    const avancePagado = avance();
    avancePagado.cuotasPagadas = 1;
    avancePagado.status = 'activa';
    avancePagado.commission.cuotasPagadas = 1;

    const schedule = buildSchedule([avancePagado], card);
    const current = schedule.find(s => s.isCurrent);

    // Ya pagado: ni la cuota del avance ni la comisión se listan como pendientes.
    expect(current.lines.some(l => l.isCommission && !l.wasPaid)).toBe(false);
    expect(current.total).toBe(0);
  });

  it('no cuenta como pendiente una comisión raw cuyo avance ya pagó su primera cuota (dato histórico)', () => {
    // Formato crudo del backend: la comisión es una fila independiente con avanceId
    // y status 'activa' (dato corrupto del bug anterior), pero el avance ya pagó.
    const avancePagado = {
      id: 1, tipo: 'avance', descripcion: 'Avance', status: 'activa',
      montoTotal: 100000, numeroCuotas: 3, cuotasPagadas: 1,
      valorCuotaMensual: 35000, fechaCompra: '2026-09-10',
    };
    const comisionColgada = {
      id: 2, tipo: 'comision', avanceId: 1, descripcion: 'Comisión por avance',
      montoTotal: 9900, numeroCuotas: 1, cuotasPagadas: 0, status: 'activa',
      valorCuotaMensual: 9900, fechaCompra: '2026-09-10',
    };

    const schedule = buildSchedule([avancePagado, comisionColgada], card);
    const current = schedule.find(s => s.isCurrent);

    // No debe haber pendientes (ni avance cuya cuota 1 ya se pagó, ni la comisión colgada).
    expect(current.lines.some(l => !l.wasPaid)).toBe(false);
    expect(current.total).toBe(0);
  });

  it('no cuenta como pendiente una comisión cuyo avance ya no está activo (lista getAllCreditCards)', () => {
    // Abre Caminos: el avance (#106) quedó 'pagada' y getAllCreditCards solo trae
    // 'activa', así que la comisión llega SOLA sin su avance. Debe tratarse como no pendiente.
    const comisionSola = {
      id: 2, tipo: 'comision', avanceId: 106, descripcion: 'Comisión por avance',
      montoTotal: 5000, numeroCuotas: 1, cuotasPagadas: 0, status: 'activa',
      valorCuotaMensual: 5000, fechaCompra: '2026-08-10',
    };

    const schedule = buildSchedule([comisionSola], card);
    const current = schedule.find(s => s.isCurrent);

    expect(current.lines.some(l => !l.wasPaid)).toBe(false);
    expect(current.total).toBe(0);
  });
});

describe('buildSchedule — historial completo', () => {
  const card = { fechaCorte: 15, fechaPago: 5 };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7)); // 7-sep-2026 local; próximo corte: 15-sep-2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('genera cortes pasados más allá del límite antiguo de 3 meses (historial completo por defecto)', () => {
    // Antes monthsBack=3 truncaba el historial a los últimos 3 cortes y el
    // extracto de una compra antigua "desaparecía" de la vista (bug 2026-10-13).
    const vieja = {
      id: 99, tipo: 'compra', descripcion: 'Compra antigua', status: 'activa',
      montoTotal: 500000, numeroCuotas: 24, cuotasPagadas: 8,
      valorCuotaMensual: 22000, fechaCompra: '2026-01-05',
    };

    const schedule = buildSchedule([vieja], card);
    const past = schedule.filter(s => s.isPast);

    expect(past.length).toBeGreaterThan(3);

    // El extracto más antiguo generado cubre el primer ciclo de la compra vieja.
    expect(past[0].lines.some(l => l.id === 99)).toBe(true);
  });

  it('respeta monthsBack explícito en 0 (proyección de Reports solo mira a futuro)', () => {
    const vieja = {
      id: 99, tipo: 'compra', descripcion: 'Compra antigua', status: 'activa',
      montoTotal: 500000, numeroCuotas: 24, cuotasPagadas: 8,
      valorCuotaMensual: 22000, fechaCompra: '2026-01-05',
    };

    const schedule = buildSchedule([vieja], card, 18, 0);

    expect(schedule.filter(s => s.isPast)).toHaveLength(0);
    expect(schedule.some(s => s.isCurrent)).toBe(true);
  });
});

describe('buildCardStats — fuente única de Inicio y Tarjetas', () => {
  const card = {
    id: 7, nombre: 'RappiCard', entidad: 'Rappi',
    fechaCorte: 15, fechaPago: 5,
    CreditCardPurchases: [
      { id: 50, tipo: 'compra', descripcion: 'Compra', status: 'activa',
        montoTotal: 300000, numeroCuotas: 6, cuotasPagadas: 0,
        valorCuotaMensual: 50000, fechaCompra: '2026-08-20' },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7)); // 7-sep-2026; próximo corte 15-sep
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calcula la obligación del ciclo activo con buildSchedule (mismo número en Inicio y Tarjetas)', () => {
    const [stats] = buildCardStats([card]);
    expect(stats.cardOblMes).toBe(50000);
    expect(stats.activeSlot).not.toBeNull();
    expect(stats.tieneDeuda).toBe(false); // el ciclo vigente aún no ha cerrado
    expect(stats.nombre).toBe('RappiCard');
    expect(stats.entidad).toBe('Rappi');
  });

  it('la fecha de pago del ciclo activo respeta el día de pago (corte 15-sep → pago 5-oct)', () => {
    const [stats] = buildCardStats([card]);
    expect(stats.nextPago.getFullYear()).toBe(2026);
    expect(stats.nextPago.getMonth()).toBe(9); // octubre
    expect(stats.nextPago.getDate()).toBe(5);
  });

  it('una tarjeta sin compras no tiene obligación ni fecha de pago', () => {
    const [stats] = buildCardStats([{
      id: 8, nombre: 'Vacía', entidad: 'X', fechaCorte: 15, fechaPago: 5,
      CreditCardPurchases: [],
    }]);
    expect(stats.cardOblMes).toBe(0);
    expect(stats.nextPago).toBeNull();
    expect(stats.dPago).toBe(999);
  });
});
