import { describe, it, expect } from 'vitest';
import { bankCreditCalculation } from '../bankCreditCalculation.js';

const BASE = {
  montoTotal: 10_000_000,
  numeroCuotas: 24,
  tasaInteres: 1.5,
  tipoTasa: 'mensual',
  cuotaAdministracion: 0,
  seguro: 0,
  fechaInicio: '2026-01-01',
  diaPago: 1,
};

describe('bankCreditCalculation — sistema francés', () => {
  it('devuelve los campos esperados', () => {
    const r = bankCreditCalculation(BASE);
    expect(r).toHaveProperty('tasaMensual');
    expect(r).toHaveProperty('valorCuota');
    expect(r).toHaveProperty('totalAPagar');
    expect(r).toHaveProperty('totalIntereses');
    expect(r).toHaveProperty('saldoPendiente');
    expect(r).toHaveProperty('fechaFin');
  });

  it('saldoPendiente inicial es igual al monto total', () => {
    const r = bankCreditCalculation(BASE);
    expect(r.saldoPendiente).toBe(BASE.montoTotal);
  });

  it('totalAPagar > montoTotal cuando tasa > 0', () => {
    const r = bankCreditCalculation(BASE);
    expect(r.totalAPagar).toBeGreaterThan(BASE.montoTotal);
  });

  it('totalIntereses = totalAPagar - cuotaBase * n', () => {
    const r = bankCreditCalculation(BASE);
    // totalAPagar = valorCuota * n; con admin=seguro=0, cuotaBase = valorCuota
    expect(r.totalIntereses).toBeCloseTo(r.totalAPagar - BASE.montoTotal, 0);
  });

  it('con tasa 0 la cuota es monto/cuotas y sin intereses', () => {
    const r = bankCreditCalculation({ ...BASE, tasaInteres: 0 });
    expect(r.valorCuota).toBeCloseTo(BASE.montoTotal / BASE.numeroCuotas, 1);
    expect(r.totalIntereses).toBeCloseTo(0, 0);
  });

  it('convierte tasa anual a mensual correctamente', () => {
    const rMensual = bankCreditCalculation({ ...BASE, tasaInteres: 1.5, tipoTasa: 'mensual' });
    const tasaMensualDesdeAnual = Math.pow(1 + 18 / 100, 1 / 12) - 1;
    const rAnual = bankCreditCalculation({ ...BASE, tasaInteres: 18, tipoTasa: 'anual' });
    expect(rAnual.tasaMensual).toBeCloseTo(tasaMensualDesdeAnual, 5);
    // tasa anual 18% ≈ mensual 1.388%, diferente a 1.5% mensual
    expect(rAnual.tasaMensual).not.toBeCloseTo(rMensual.tasaMensual, 3);
  });

  it('cuotaAdministracion y seguro se suman a la cuota base', () => {
    const r = bankCreditCalculation({ ...BASE, cuotaAdministracion: 50_000, seguro: 20_000 });
    const rBase = bankCreditCalculation(BASE);
    expect(r.valorCuota).toBeCloseTo(rBase.valorCuota + 70_000, 1);
  });

  it('fechaFin cae en el mes correcto', () => {
    const r = bankCreditCalculation({ ...BASE, fechaInicio: '2026-01-01', numeroCuotas: 12, diaPago: 15 });
    // 12 cuotas desde ene 2026 → fin en ene 2027 (mes 13)
    expect(r.fechaFin.startsWith('2027-01')).toBe(true);
    expect(r.fechaFin.endsWith('-15')).toBe(true);
  });

  it('valorCuota es positivo para cualquier combinación válida', () => {
    const combinations = [
      { montoTotal: 5_000_000, numeroCuotas: 12, tasaInteres: 2, tipoTasa: 'mensual' },
      { montoTotal: 50_000_000, numeroCuotas: 60, tasaInteres: 12, tipoTasa: 'anual' },
      { montoTotal: 1_000_000, numeroCuotas: 6, tasaInteres: 0, tipoTasa: 'mensual' },
    ];
    combinations.forEach(c =>
      expect(bankCreditCalculation({ ...BASE, ...c }).valorCuota).toBeGreaterThan(0)
    );
  });
});
