import { Plus } from 'lucide-react';
import { CARD_COLORS } from '../../utils/cardColors';

// Colores predefinidos de tarjeta + uno personalizado (input color nativo).
export const CardColorPicker = ({ value, onChange }) => {
  const custom = value?.startsWith('#');
  return (
    <div className="color-picker" role="radiogroup" aria-label="Color de la tarjeta">
      {CARD_COLORS.map(c => (
        <button
          key={c.key} type="button" role="radio" aria-checked={value === c.key}
          className={`color-dot ${value === c.key ? 'selected' : ''}`}
          title={c.label} aria-label={c.label}
          style={{ background: c.gradient }}
          onClick={() => onChange(c.key)}
        />
      ))}
      <label className={`color-dot custom ${custom ? 'selected' : ''}`} title="Color personalizado" style={custom ? { background: value } : undefined}>
        {!custom && <Plus size={16} />}
        <span className="sr-only">Color personalizado</span>
        <input type="color" value={custom ? value : '#047857'} onChange={e => onChange(e.target.value)} />
      </label>
    </div>
  );
};
