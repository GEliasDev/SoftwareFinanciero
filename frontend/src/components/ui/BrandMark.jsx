/**
 * Marca de Debit: cuadrado índigo con una línea ascendente (solvencia /
 * crecimiento financiero). Mismo arte que el favicon. Reutilizable en el shell
 * y en las pantallas de auth.
 *   <BrandMark size={28} />
 */
export const BrandMark = ({ size = 28, shadow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    style={{ display: 'block', flexShrink: 0, filter: shadow ? 'drop-shadow(0 2px 6px rgba(4,120,87,0.35))' : 'none' }}
  >
    <defs>
      <linearGradient id="debit-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#065F46" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#debit-mark)" />
    <path d="M8 21 L13.5 14.5 L18.5 18 L24 10" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="10" r="2.5" fill="#fff" />
  </svg>
);
