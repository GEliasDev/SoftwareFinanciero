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

// Fecha desde un Date o string ISO ("2026-05-30T…") -> "30 may 2026"
export const fmtDateLong = (x) => {
  if (!x) return '—';
  return new Date(x).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ── Fechas de corte / pago y urgencia (genérico, usado por varios módulos) ── */
export const nextOccurrence = (dayOfMonth) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(today.getFullYear(), today.getMonth(), Number(dayOfMonth));
  if (d <= today) d.setMonth(d.getMonth() + 1);
  return d;
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
  const d = new Date(date);
  const day = d.getDay();              // 0 = domingo, 6 = sábado
  if (day === 6) d.setDate(d.getDate() - 1);
  else if (day === 0) d.setDate(d.getDate() - 2);
  return d;
};
