import { describe, it, expect } from 'vitest';
import { fmt, fmtK, fmtDate, daysUntil, urgencyStyle, weekendToFriday, nextOccurrence } from '../format';

describe('fmt', () => {
  it('formats positive COP amount', () => {
    expect(fmt(1000000)).toMatch('1.000.000');
  });

  it('formats zero as $0', () => {
    expect(fmt(0)).toMatch('0');
  });

  it('handles null/undefined as 0', () => {
    expect(fmt(null)).toMatch('0');
    expect(fmt(undefined)).toMatch('0');
  });
});

describe('fmtK', () => {
  it('formats millions with M suffix', () => {
    expect(fmtK(1_500_000)).toBe('$1.5M');
  });

  it('formats thousands with k suffix', () => {
    expect(fmtK(840_000)).toBe('$840k');
  });

  it('formats small amounts as integer', () => {
    expect(fmtK(500)).toBe('$500');
  });

  it('handles negative millions', () => {
    expect(fmtK(-2_000_000)).toBe('$-2.0M');
  });

  it('handles null/undefined as 0', () => {
    expect(fmtK(null)).toBe('$0');
    expect(fmtK(undefined)).toBe('$0');
  });
});

describe('fmtDate', () => {
  it('returns em dash for falsy input', () => {
    expect(fmtDate('')).toBe('—');
    expect(fmtDate(null)).toBe('—');
  });

  it('formats a YYYY-MM-DD string', () => {
    const result = fmtDate('2026-01-15');
    expect(result).toMatch('15');
    expect(result).toMatch('2026');
  });
});

describe('daysUntil', () => {
  it('returns 0 for today', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(daysUntil(today)).toBe(0);
  });

  it('returns 1 for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(daysUntil(tomorrow)).toBe(1);
  });

  it('returns 7 for a week from now', () => {
    const week = new Date();
    week.setHours(0, 0, 0, 0);
    week.setDate(week.getDate() + 7);
    expect(daysUntil(week)).toBe(7);
  });
});

describe('urgencyStyle', () => {
  it('returns danger level for ≤3 days', () => {
    expect(urgencyStyle(0).level).toBe('danger');
    expect(urgencyStyle(3).level).toBe('danger');
  });

  it('returns warning level for 4-7 days', () => {
    expect(urgencyStyle(4).level).toBe('warning');
    expect(urgencyStyle(7).level).toBe('warning');
  });

  it('returns normal level for >7 days', () => {
    expect(urgencyStyle(8).level).toBe('normal');
    expect(urgencyStyle(30).level).toBe('normal');
  });
});

describe('weekendToFriday', () => {
  it('returns null/undefined unchanged', () => {
    expect(weekendToFriday(null)).toBe(null);
    expect(weekendToFriday(undefined)).toBe(undefined);
  });

  it('moves Saturday (day 6) to Friday (day 5)', () => {
    // 2026-06-13 is a Saturday
    const sat = new Date(2026, 5, 13);
    const result = weekendToFriday(sat);
    expect(result.getDay()).toBe(5); // Friday
    expect(result.getDate()).toBe(12);
  });

  it('moves Sunday (day 0) to Friday (day 5)', () => {
    // 2026-06-14 is a Sunday
    const sun = new Date(2026, 5, 14);
    const result = weekendToFriday(sun);
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBe(12);
  });

  it('leaves weekdays unchanged', () => {
    // 2026-06-10 is a Wednesday
    const wed = new Date(2026, 5, 10);
    const result = weekendToFriday(wed);
    expect(result.getDay()).toBe(3);
    expect(result.getDate()).toBe(10);
  });
});

describe('nextOccurrence', () => {
  it('returns a Date in the future', () => {
    const result = nextOccurrence(15);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(result > today).toBe(true);
  });

  it('returns the specified day of month', () => {
    const result = nextOccurrence(15);
    expect(result.getDate()).toBe(15);
  });
});

/* ── Helpers de fecha local (auditoría 2026-06-11: bug UTC en Budget) ── */
import { localISODate, monthKey, addMonths, capFirst } from '../format';

describe('localISODate / monthKey', () => {
  it('usa la fecha local, no UTC (una noche de 11 de junio sigue siendo 11)', () => {
    const night = new Date(2026, 5, 11, 21, 30); // 9:30 p. m. local (UTC: ya es 12 jun)
    expect(localISODate(night)).toBe('2026-06-11');
    expect(monthKey(night)).toBe('2026-06');
  });
  it('rellena con ceros', () => {
    expect(localISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('addMonths', () => {
  it('retrocede y avanza meses cruzando el año', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2025-12', 1)).toBe('2026-01');
    expect(addMonths('2026-06', -1)).toBe('2026-05');
  });
});

describe('capFirst', () => {
  it('capitaliza solo la primera letra', () => {
    expect(capFirst('junio de 2026')).toBe('Junio de 2026');
  });
});
