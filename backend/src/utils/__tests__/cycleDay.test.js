import { describe, it, expect } from 'vitest';
import { effectiveDayInMonth } from '../cycleDay.js';

describe('effectiveDayInMonth', () => {
    it('deja el día tal cual cuando el mes lo contiene', () => {
        expect(effectiveDayInMonth(15, 2026, 5)).toBe(15); // junio
        expect(effectiveDayInMonth(31, 2026, 6)).toBe(31); // julio tiene 31
    });

    it('recorta el 31 en meses de 30 días (bug: la cuota se saltaba ese mes)', () => {
        expect(effectiveDayInMonth(31, 2026, 3)).toBe(30);  // abril
        expect(effectiveDayInMonth(31, 2026, 5)).toBe(30);  // junio
        expect(effectiveDayInMonth(31, 2026, 8)).toBe(30);  // septiembre
        expect(effectiveDayInMonth(31, 2026, 10)).toBe(30); // noviembre
    });

    it('recorta correctamente en febrero, incluidos años bisiestos', () => {
        expect(effectiveDayInMonth(31, 2026, 1)).toBe(28); // 2026 no bisiesto
        expect(effectiveDayInMonth(30, 2026, 1)).toBe(28);
        expect(effectiveDayInMonth(29, 2026, 1)).toBe(28);
        expect(effectiveDayInMonth(31, 2028, 1)).toBe(29); // 2028 bisiesto
    });

    it('el día recortado nunca desborda al mes siguiente', () => {
        // new Date(2026, 5, 31) daba 1-jul; con el recorte se queda en junio.
        const d = new Date(2026, 5, effectiveDayInMonth(31, 2026, 5));
        expect(d.getMonth()).toBe(5);
        expect(d.getDate()).toBe(30);
    });

    it('tolera valores inválidos sin romper', () => {
        expect(effectiveDayInMonth(0, 2026, 5)).toBe(1);
        expect(effectiveDayInMonth(undefined, 2026, 5)).toBe(1);
    });
});
