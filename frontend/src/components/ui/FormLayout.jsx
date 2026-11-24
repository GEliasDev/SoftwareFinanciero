import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getCardColor } from '../../utils/cardColors';
import { fmt } from '../../utils/format';

/**
 * Encabezado de formulario: migas (PC), volver (teléfono), título y subtítulo.
 *   crumbs: [{ to, label }] — el último es la página actual (sin `to`).
 */
export const FormHeader = ({ crumbs = [], title, subtitle, onBack, actions }) => (
  <>
    {crumbs.length > 0 && (
      <nav className="breadcrumb desktop-flex" aria-label="Ruta">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
          </Fragment>
        ))}
      </nav>
    )}
    <div className="detail-head">
      {onBack && <button type="button" className="icon-btn ghost mobile-only" onClick={onBack} aria-label="Volver"><ArrowLeft size={20} /></button>}
      <div className="detail-head-text">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle" style={{ margin: 0 }}>{subtitle}</p>}
      </div>
      {actions && <div className="detail-actions">{actions}</div>}
    </div>
  </>
);

/** Bloque de formulario con título y descripción. */
export const FormSection = ({ title, desc, children, className = '' }) => (
  <section className={`card form-section ${className}`}>
    {title && <h2 className="card-title">{title}</h2>}
    {desc && <p className="form-section-desc">{desc}</p>}
    <div className="form-section-body">{children}</div>
  </section>
);

/**
 * Selector de opciones en botones (cuotas, frecuencia…). Con `other` agrega
 * "Otro" que muestra un input numérico entre `min` y `max`.
 */
export const ChoiceChips = ({ options, value, onChange, other, min = 1, max = 36, label, disabled, suffix }) => {
  const isPreset = options.some(o => String(o.value ?? o) === String(value));
  const [custom, setCustom] = useState(!isPreset && value !== '' && value != null);
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map(o => {
        const v = String(o.value ?? o);
        const active = !custom && String(value) === v;
        return (
          <button type="button" key={v} className={`chip ${active ? 'active' : ''}`} aria-pressed={active} disabled={disabled}
            onClick={() => { setCustom(false); onChange(v); }}>
            {o.label ?? o}
          </button>
        );
      })}
      {other && (custom ? (
        <input className="form-input chip-input" type="number" min={min} max={max} value={value} autoFocus disabled={disabled}
          onChange={e => onChange(e.target.value)} aria-label={`${label} (otro)`} />
      ) : (
        <button type="button" className="chip" disabled={disabled} onClick={() => setCustom(true)}>Otro</button>
      ))}
      {suffix && <span className="chips-suffix">{suffix}</span>}
    </div>
  );
};

/** Vista compacta de la tarjeta (columna derecha de los formularios). */
export const CardMini = ({ card, dark = false }) => card ? (
  <div className="card-mini" style={{ background: dark ? 'var(--cat-1)' : getCardColor(card.color) }}>
    <span className="card-mini-bank">{card.entidad?.toUpperCase()}</span>
    <b>{card.nombre}</b>
    <span className="card-mini-label">Cupo disponible</span>
    <span className="card-mini-amount n">{fmt(card.cupoDisponible)}</span>
    <span className="card-mini-foot n">{Number(card.tasaInteresMensual).toLocaleString('es-CO', { maximumFractionDigits: 2 })} % M.V. · Corte día {card.fechaCorte}</span>
  </div>
) : null;

/** Botonera final del formulario. */
export const FormActions = ({ children }) => <div className="form-actions">{children}</div>;
