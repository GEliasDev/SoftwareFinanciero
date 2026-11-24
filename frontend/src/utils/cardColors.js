// Colores sólidos de tarjeta (el rediseño no usa degradados). `gradient` se
// conserva como nombre de propiedad porque se usa directo como `background`.
export const CARD_COLORS = [
  { key: 'blue',   label: 'Azul',    gradient: '#0D47A1' },
  { key: 'purple', label: 'Morado',  gradient: '#5B21B6' },
  { key: 'green',  label: 'Verde',   gradient: '#047857' },
  { key: 'red',    label: 'Rojo',    gradient: '#B42318' },
  { key: 'slate',  label: 'Grafito', gradient: '#344054' },
  { key: 'gold',   label: 'Dorado',  gradient: '#B54708' },
  { key: 'rose',   label: 'Rosa',    gradient: '#BE123C' },
  { key: 'teal',   label: 'Teal',    gradient: '#0E7490' },
];

// Oscurece un hex en la proporción indicada (0–1).
export const darkenHex = (hex, amount) => {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export const getCardGradient = (key) => {
  if (!key) return CARD_COLORS[0].gradient;
  const preset = CARD_COLORS.find(c => c.key === key);
  if (preset) return preset.gradient;
  // Color hex personalizado
  if (key.startsWith('#')) return key;
  return CARD_COLORS[0].gradient;
};

// Alias con nombre claro para el código nuevo.
export const getCardColor = getCardGradient;
