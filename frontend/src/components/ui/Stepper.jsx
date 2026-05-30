import { Fragment } from 'react';
import { Check } from 'lucide-react';

/**
 * Indicador de progreso para formularios por pasos.
 *   <Stepper steps={['Identidad', 'Financiero', 'Fechas']} current={1} />
 */
export const Stepper = ({ steps, current }) => (
  <div className="stepper">
    {steps.map((label, i) => (
      <Fragment key={label}>
        <div className={`stepper-step ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}>
          <span className="stepper-dot">{i < current ? <Check size={14} /> : i + 1}</span>
          <span className="stepper-label">{label}</span>
        </div>
        {i < steps.length - 1 && <div className={`stepper-line ${i < current ? 'done' : ''}`} />}
      </Fragment>
    ))}
  </div>
);
