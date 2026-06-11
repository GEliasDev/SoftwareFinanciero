import icono from '../../assets/icono.png';

export const BrandMark = ({ size = 50 }) => (
  <img
    src={icono}
    alt="Debti"
    height={size}
    style={{ display: 'block', flexShrink: 0, width: 'auto' }}
    aria-hidden="true"
  />
);
