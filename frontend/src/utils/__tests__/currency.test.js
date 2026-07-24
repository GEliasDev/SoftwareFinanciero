import { describe, it, expect } from 'vitest';
import { toCOP, subMonthlyCOP, subAnnualCOP } from '../currency';

describe('toCOP', () => {
    it('deja los montos en COP intactos', () => {
        expect(toCOP(150000, 'COP')).toBe(150000);
        expect(toCOP(150000)).toBe(150000); // COP por defecto
    });

    it('convierte USD y EUR', () => {
        expect(toCOP(10, 'USD')).toBe(40000);
        expect(toCOP(10, 'EUR')).toBe(43500);
    });

    it('trata los DECIMAL string de Sequelize como números', () => {
        expect(toCOP('150000.00', 'COP')).toBe(150000);
    });

    it('no rompe con moneda desconocida ni valores nulos', () => {
        expect(toCOP(100, 'JPY')).toBe(100);
        expect(toCOP(null, 'USD')).toBe(0);
        expect(toCOP(undefined)).toBe(0);
    });
});

describe('subMonthlyCOP', () => {
    it('usa montoMensual, no monto (bug: la anual contaba 12x)', () => {
        // Suscripción anual de 1.200.000 → 100.000 al mes.
        const anual = { monto: '1200000.00', montoMensual: '100000.00', moneda: 'COP', frecuencia: 'anual' };
        expect(subMonthlyCOP(anual)).toBe(100000);
    });

    it('convierte a COP una suscripción en USD', () => {
        const usd = { monto: '15.00', montoMensual: '15.00', moneda: 'USD', frecuencia: 'mensual' };
        expect(subMonthlyCOP(usd)).toBe(60000);
    });

    it('no revienta con una suscripción indefinida', () => {
        expect(subMonthlyCOP(undefined)).toBe(0);
        expect(subMonthlyCOP({})).toBe(0);
    });
});

describe('subAnnualCOP', () => {
    it('es 12 veces el mensual equivalente', () => {
        const s = { montoMensual: '30000.00', moneda: 'COP' };
        expect(subAnnualCOP(s)).toBe(360000);
    });

    it('para una anual devuelve el valor original del cobro', () => {
        const anual = { monto: '1200000.00', montoMensual: '100000.00', moneda: 'COP' };
        expect(subAnnualCOP(anual)).toBe(1200000);
    });
});
