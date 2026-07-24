import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    calcularProximaFechaPago,
    calcularFechaRecordatorio,
    debeEnviarse,
} from '../reminderCalculation.js';

const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

afterEach(() => vi.useRealTimers());

describe('calcularProximaFechaPago', () => {
    it('devuelve el día de este mes si aún no ha pasado', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 6, 10, 9, 0)); // 10 jul
        expect(calcularProximaFechaPago(20)).toBe('2026-07-20');
    });

    it('salta al mes siguiente si el día ya pasó', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 6, 25, 9, 0)); // 25 jul
        expect(calcularProximaFechaPago(10)).toBe('2026-08-10');
    });

    it('recorta el día 31 en meses que no lo tienen (bug: desbordaba al mes siguiente)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 1, 9, 0)); // 1 jun (30 días)
        expect(calcularProximaFechaPago(31)).toBe('2026-06-30');
    });

    it('recorta el día 31 a febrero', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 1, 1, 9, 0)); // 1 feb 2026 (28 días)
        expect(calcularProximaFechaPago(31)).toBe('2026-02-28');
    });

    it('no devuelve nunca una fecha en el pasado', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 11, 20, 9, 0)); // 20 dic
        // día 5 ya pasó → siguiente ocurrencia en enero del año que viene
        expect(calcularProximaFechaPago(5)).toBe('2027-01-05');
    });

    it('no se corre un día por zona horaria de noche', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 6, 10, 20, 30)); // 8:30 PM
        expect(calcularProximaFechaPago(15)).toBe('2026-07-15');
    });
});

describe('calcularFechaRecordatorio', () => {
    it('resta los días de anticipación', () => {
        expect(calcularFechaRecordatorio('2026-07-15', 3)).toBe('2026-07-12');
    });

    it('cruza el borde de mes hacia atrás', () => {
        expect(calcularFechaRecordatorio('2026-07-02', 5)).toBe('2026-06-27');
    });

    it('0 días de anticipación = el mismo día', () => {
        expect(calcularFechaRecordatorio('2026-07-15', 0)).toBe('2026-07-15');
    });
});

describe('debeEnviarse', () => {
    it('true solo cuando la fecha es hoy (hora local)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 6, 15, 8, 0));
        expect(debeEnviarse('2026-07-15')).toBe(true);
        expect(debeEnviarse('2026-07-16')).toBe(false);
    });

    it('sigue siendo hoy a las 8 PM (no adelanta a mañana por UTC)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 6, 31, 20, 0)); // 31 jul 8pm; en UTC ya es 1 ago
        expect(debeEnviarse('2026-07-31')).toBe(true);
        expect(debeEnviarse(ymd(new Date()))).toBe(true);
    });
});
