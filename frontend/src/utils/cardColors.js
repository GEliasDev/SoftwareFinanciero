export const CARD_COLORS = [
  { key: 'blue',   label: 'Azul',    gradient: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)' },
  { key: 'purple', label: 'Morado',  gradient: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' },
  { key: 'green',  label: 'Verde',   gradient: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)' },
  { key: 'red',    label: 'Rojo',    gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' },
  { key: 'slate',  label: 'Grafito', gradient: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)' },
  { key: 'gold',   label: 'Dorado',  gradient: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)' },
  { key: 'rose',   label: 'Rosa',    gradient: 'linear-gradient(135deg, #e11d48 0%, #9f1239 100%)' },
  { key: 'teal',   label: 'Teal',    gradient: 'linear-gradient(135deg, #0891b2 0%, #155e75 100%)' },
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
  if (key.startsWith('#')) return `linear-gradient(135deg, ${key} 0%, ${darkenHex(key, 0.25)} 100%)`;
  return CARD_COLORS[0].gradient;
};
