import { fmt } from '../../utils/format';

const TONE_COLOR = {
  pos: 'var(--pos-600)',
  neg: 'var(--neg-600)',
  warn: 'var(--warn-600)',
  muted: 'var(--color-text-muted)',
};

/**
 * Cifra monetaria con figuras tabulares (alineación en columnas) y color
 * semántico opcional. Uso: <Money value={1250000} tone="pos" />
 */
export const Money = ({ value, currency = 'COP', tone, className = '', style }) => (
  <span
    className={`tabular ${className}`}
    style={{ color: tone ? TONE_COLOR[tone] : undefined, ...style }}
  >
    {fmt(value, currency)}
  </span>
);
