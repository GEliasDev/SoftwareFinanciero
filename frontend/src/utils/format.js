/* Formato centralizado para toda la app (antes duplicado en ~6 archivos). */

export const fmt = (n, currency = 'COP') =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n ?? 0);

// Versión compacta: $1.2M, $840k
export const fmtK = (n) => {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
};

// "2026-05-30" -> "30 may 2026"
export const fmtDate = (str) => {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtShort = (date) =>
  date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

export const monthLabel = (m) => {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1, 1)
    .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
};

// "junio de 2026" -> "Junio de 2026" (sin text-transform: capitalize, que capitaliza el "de")
export const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* ── Fechas LOCALES (nunca toISOString: en UTC-5 cambia de día después de las 7 p. m.) ── */

/**
 * Parsea a Date SIEMPRE en hora local.
 *
 * `new Date('2026-07-01')` parsea en UTC y, leído en UTC-5, muestra el 30 de
 * junio — un día menos en TODA fecha, y en un 1 de enero cambia hasta el año
 * ("31 de dic de 2025"). Los campos DATEONLY de Sequelize llegan como
 * 'YYYY-MM-DD' exacto y por eso se construyen a mano.
 *
 * Los timestamps CON hora ('...T10:30:00Z') sí representan un instante real:
 * esos se dejan a `new Date()`, que los convierte correctamente a hora local.
 */
export const parseLocalDate = (x) => {
  if (!x) return null;
  if (x instanceof Date) return x;
  const s = String(x);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
};

/**
 * Día real de un ciclo mensual dentro de un mes concreto: recorta 29/30/31 a
 * los días que ese mes tenga. Espejo de `backend/src/utils/cycleDay.js`.
 */
export const effectiveDayInMonth = (day, year, monthIndex) => {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const d = Number(day);
  if (!Number.isFinite(d) || d < 1) return 1;
  return Math.min(d, lastDay);
};

// Date -> "YYYY-MM-DD" en hora local
export const localISODate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Date -> "YYYY-MM" en hora local
export const monthKey = (d = new Date()) => localISODate(d).slice(0, 7);

// "YYYY-MM" ± n meses -> "YYYY-MM" (aritmética local, sin parseo UTC)
export const addMonths = (mKey, delta) => {
  const [y, mo] = mKey.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Fecha desde un Date, un DATEONLY ("2026-05-30") o un ISO con hora -> "30 may 2026"
export const fmtDateLong = (x) => {
  const d = parseLocalDate(x);
  if (!d) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ── Fechas de corte / pago y urgencia (genérico, usado por varios módulos) ── */
// Próxima vez que cae un día de ciclo. Recorta 29/30/31 al último día real del
// mes: sin eso `new Date(2026, 5, 31)` desbordaba a julio y "próximo cobro"
// mostraba el 1 de julio en vez del 30 de junio.
export const nextOccurrence = (dayOfMonth) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const enMes = (y, m) => new Date(y, m, effectiveDayInMonth(dayOfMonth, y, m));
  const d = enMes(today.getFullYear(), today.getMonth());
  return d <= today ? enMes(today.getFullYear(), today.getMonth() + 1) : d;
};

export const daysUntil = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / 86400000);
};

export const urgencyStyle = (days) =>
  days <= 3 ? { bg: '#fef2f2', color: '#991b1b', border: 'rgba(220,38,38,0.2)', badge: 'var(--color-danger)', level: 'danger' }
  : days <= 7 ? { bg: '#fffbeb', color: '#92400e', border: 'rgba(217,119,6,0.2)', badge: 'var(--color-warning)', level: 'warning' }
  : { bg: 'var(--color-primary-light)', color: 'var(--brand-700)', border: 'rgba(4,120,87,0.15)', badge: 'var(--color-primary)', level: 'normal' };

// Si la fecha cae sábado o domingo, devuelve el viernes anterior (días hábiles).
export const weekendToFriday = (date) => {
  if (!date) return date;
  // parseLocalDate: si llega un DATEONLY como string, `new Date(str)` lo leería
  // en UTC y podría caer en otro día — cambiando qué día de la semana es.
  const d = new Date(parseLocalDate(date));
  const day = d.getDay();              // 0 = domingo, 6 = sábado
  if (day === 6) d.setDate(d.getDate() - 1);
  else if (day === 0) d.setDate(d.getDate() - 2);
  return d;
};
