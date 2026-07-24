import { describe, it, expect, vi, afterEach } from 'vitest';
import { localToday, localMonth } from '../localDate.js';

afterEach(() => vi.useRealTimers());

describe('localToday / localMonth', () => {
    it('devuelve la fecha local, no la UTC, de noche (bug: abono/export salían con mañana)', () => {
        vi.useFakeTimers();
        // 31 jul 2026, 8:00 PM hora local; en UTC ya es 1 ago.
        vi.setSystemTime(new Date(2026, 6, 31, 20, 0));
        expect(localToday()).toBe('2026-07-31');
        expect(localMonth()).toBe('2026-07');
    });

    it('formatea con ceros a la izquierda', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 0, 5, 10, 0)); // 5 ene
        expect(localToday()).toBe('2026-01-05');
        expect(localMonth()).toBe('2026-01');
    });

    it('acepta un Date explícito', () => {
        expect(localToday(new Date(2026, 11, 25))).toBe('2026-12-25');
    });
});
