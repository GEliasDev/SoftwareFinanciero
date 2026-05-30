import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Tarjeta de métrica del sistema Solventa: acento lateral por tono, icono,
 * valor grande con figuras tabulares y delta opcional con tendencia.
 *
 * Props:
 *   label    — etiqueta superior
 *   value    — valor principal (string o number ya formateado)
 *   delta    — texto secundario bajo el valor
 *   trend    — 'up' | 'down' | undefined (colorea el delta)
 *   icon     — componente de icono (lucide), opcional
 *   tone     — 'brand'(def) | 'pos' | 'warn' | 'neg' | 'neutral'
 *   onClick  — hace la tarjeta clickable
 */
export const StatCard = ({ label, value, delta, trend, icon: Icon, tone = 'brand', onClick }) => (
  <div
    className={`stat-card tone-${tone} ${onClick ? 'clickable' : ''}`}
    onClick={onClick}
  >
    <div className="stat-card-head">
      {Icon && <div className="stat-card-icon"><Icon size={16} /></div>}
      <span className="stat-card-label">{label}</span>
    </div>
    <p className="stat-card-value tabular">{value}</p>
    {delta && (
      <div className={`stat-card-delta ${trend || ''}`}>
        {trend === 'up' && <TrendingUp size={13} />}
        {trend === 'down' && <TrendingDown size={13} />}
        {delta}
      </div>
    )}
  </div>
);
