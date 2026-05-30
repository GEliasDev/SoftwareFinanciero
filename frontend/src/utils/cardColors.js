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

export const getCardGradient = (key) =>
  CARD_COLORS.find(c => c.key === key)?.gradient ?? CARD_COLORS[0].gradient;
