import { describe, it, expect } from 'vitest';
import { buildLoanSchedule } from '../bankCredit';

/**
 * El backend guarda `tasaMensual` como FRACCIÓN (tasaInteres/100):
 * un crédito al 1,62% M.V. llega como tasaMensual = "0.0162".
 * Caso real detectado en auditoría: el schedule mostraba interés ~100× menor
 * por dividir la fracción nuevamente entre 100.
 */
const credit = {
  montoTotal: '950000',
  numeroCuotas: 24,
  cuotasPagadas: 9,
  tasaMensual: '0.0162',      // 1,62% mensual, como lo persiste el backend
  valorCuota: '60592.06',     // cuota base ~48.092 + admin 8.000 + seguro 4.500
  cuotaAdministracion: '8000',
  seguro: '4500',
  diaPago: 5,
};

describe('buildLoanSchedule', () => {
  it('calcula el interés de la primera cuota como saldo × tasa mensual real', () => {
    const { rows } = buildLoanSchedule(credit);
    // 950.000 × 1,62% = 15.390 (no ~154, que era el síntoma del bug)
    expect(rows[0].interes).toBeGreaterThan(15000);
    expect(rows[0].interes).toBeLessThan(15800);
  });

  it('el total de intereses corresponde a amortización francesa al 1,62%', () => {
    const { rows } = buildLoanSchedule(credit);
    const totalInteres = rows.reduce((s, r) => s + r.interes, 0);
    // 24 × 48.092 − 950.000 ≈ 204.200
    expect(totalInteres).toBeGreaterThan(190000);
    expect(totalInteres).toBeLessThan(215000);
  });

  it('amortiza el saldo a 0 en la última cuota', () => {
    const { rows } = buildLoanSchedule(credit);
    expect(rows[rows.length - 1].saldo).toBe(0);
  });

  it('devuelve solo las cuotas pendientes en remaining', () => {
    const { remaining } = buildLoanSchedule(credit);
    expect(remaining).toHaveLength(24 - 9);
    expect(remaining[0].k).toBe(10);
  });

  it('soporta tasa 0 sin NaN', () => {
    const { rows } = buildLoanSchedule({ ...credit, tasaMensual: '0', valorCuota: '52083.33' });
    expect(rows[0].interes).toBe(0);
    expect(Number.isFinite(rows[0].capital)).toBe(true);
  });
});
