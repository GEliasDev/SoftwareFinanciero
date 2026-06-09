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
      <linearGradient id="debti-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#065F46" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#debti-mark)" />
    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700" fontFamily="IBM Plex Sans, sans-serif">D</text>
  </svg>
);
