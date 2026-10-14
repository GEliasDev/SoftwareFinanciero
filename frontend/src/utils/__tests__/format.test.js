import { describe, it, expect } from 'vitest';
import { fmt, fmtK, fmtDate, daysUntil, urgencyStyle, weekendToFriday, nextOccurrence, parseLocalDate, fmtDateLong, effectiveDayInMonth, parseMoneyInput, formatMoneyInput } from '../format';

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

/* ── Regresiones de zona horaria y días de ciclo (2026-07-23) ── */

describe('parseLocalDate', () => {
  it('parsea un DATEONLY en hora LOCAL, no UTC', () => {
    // new Date('2026-07-01') daba 30-jun en UTC-5: un día menos en toda la app.
    const d = parseLocalDate('2026-07-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // julio
    expect(d.getDate()).toBe(1);
  });

  it('no cambia el año en un 1 de enero', () => {
    const d = parseLocalDate('2026-01-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
  });

  it('deja pasar Date y nulos', () => {
    const orig = new Date(2026, 5, 15);
    expect(parseLocalDate(orig)).toBe(orig);
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate('')).toBeNull();
  });
});

describe('fmtDateLong', () => {
  it('muestra el día correcto de un DATEONLY', () => {
    expect(fmtDateLong('2026-07-01')).toMatch(/01.*jul.*2026/);
    expect(fmtDateLong('2026-12-25')).toMatch(/25.*dic.*2026/);
  });

  it('devuelve — si no hay fecha', () => {
    expect(fmtDateLong(null)).toBe('—');
  });
});

describe('effectiveDayInMonth', () => {
  it('recorta el 31 a los meses que no lo tienen', () => {
    expect(effectiveDayInMonth(31, 2026, 5)).toBe(30);  // junio
    expect(effectiveDayInMonth(31, 2026, 1)).toBe(28);  // febrero
    expect(effectiveDayInMonth(31, 2028, 1)).toBe(29);  // febrero bisiesto
    expect(effectiveDayInMonth(15, 2026, 5)).toBe(15);  // sin cambios
  });
});

describe('nextOccurrence con días 29-31', () => {
  it('no desborda al mes siguiente', () => {
    // Antes: new Date(2026, 5, 31) -> 1 de julio.
    const d = nextOccurrence(31);
    const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    expect(d.getDate()).toBeLessThanOrEqual(ultimoDia);
  });

  it('siempre devuelve una fecha futura o de hoy', () => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    for (const dia of [1, 15, 28, 29, 30, 31]) {
      expect(nextOccurrence(dia).getTime()).toBeGreaterThanOrEqual(hoy.getTime());
    }
  });
});

describe('parseMoneyInput (texto es-CO → valor canónico)', () => {
  it('quita los separadores de miles con punto', () => {
    expect(parseMoneyInput('26.000')).toBe('26000');
    expect(parseMoneyInput('1.234.567')).toBe('1234567');
    expect(parseMoneyInput('26.0000')).toBe('260000'); // digitando un dígito más
  });

  it('interpreta la coma como separador decimal', () => {
    expect(parseMoneyInput('26.000,50')).toBe('26000.50');
    expect(parseMoneyInput('1234,56')).toBe('1234.56');
  });

  it('acepta punto decimal estilo en-US', () => {
    expect(parseMoneyInput('1234.5')).toBe('1234.5');
    expect(parseMoneyInput('1234.56')).toBe('1234.56');
  });

  it('conserva el separador decimal pendiente mientras se digita', () => {
    expect(parseMoneyInput('26.000,')).toBe('26000.');
    expect(parseMoneyInput('26.000.')).toBe('26000.');
  });

  it('quita ceros a la izquierda', () => {
    expect(parseMoneyInput('007')).toBe('7');
    expect(parseMoneyInput('000')).toBe('0');
  });

  it('devuelve vacío para entradas vacías', () => {
    expect(parseMoneyInput('')).toBe('');
    expect(parseMoneyInput(null)).toBe('');
    expect(parseMoneyInput(undefined)).toBe('');
  });
});

describe('formatMoneyInput (valor canónico → texto es-CO)', () => {
  it('agrupa miles con punto', () => {
    expect(formatMoneyInput('26000')).toBe('26.000');
    expect(formatMoneyInput('1234567')).toBe('1.234.567');
    expect(formatMoneyInput('0')).toBe('0');
  });

  it('usa coma para los decimales', () => {
    expect(formatMoneyInput('26000.50')).toBe('26.000,50');
    expect(formatMoneyInput('179611.81')).toBe('179.611,81');
  });

  it('omite los decimales .00 (prefill de DECIMAL del backend)', () => {
    expect(formatMoneyInput('1200000.00')).toBe('1.200.000');
    expect(formatMoneyInput('26000.00')).toBe('26.000');
  });

  it('muestra el separador decimal pendiente', () => {
    expect(formatMoneyInput('26000.')).toBe('26.000,');
  });

  it('acepta números y devuelve vacío para nulos', () => {
    expect(formatMoneyInput(26000)).toBe('26.000');
    expect(formatMoneyInput('')).toBe('');
    expect(formatMoneyInput(null)).toBe('');
  });
});
