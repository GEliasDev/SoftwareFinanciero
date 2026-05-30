import { Fragment } from 'react';
import { Check } from 'lucide-react';

/**
 * Indicador de progreso para formularios por pasos.
 *   <Stepper steps={['Identidad', 'Financiero', 'Fechas']} current={1} />
 * Si se pasa `onStepClick`, los pasos son clicables (útil en edición, donde
 * puedes saltar a cualquier sección libremente).
 */
export const Stepper = ({ steps, current, onStepClick }) => (
  <div className="stepper">
    {steps.map((label, i) => {
      const cls = `stepper-step ${i < current ? 'done' : ''} ${i === current ? 'active' : ''} ${onStepClick ? 'clickable' : ''}`;
      const content = (
        <>
          <span className="stepper-dot">{i < current ? <Check size={14} /> : i + 1}</span>
          <span className="stepper-label">{label}</span>
        </>
      );
      return (
        <Fragment key={label}>
          {onStepClick
            ? <button type="button" className={cls} onClick={() => onStepClick(i)}>{content}</button>
            : <div className={cls}>{content}</div>}
          {i < steps.length - 1 && <div className={`stepper-line ${i < current ? 'done' : ''}`} />}
        </Fragment>
      );
    })}
  </div>
);
