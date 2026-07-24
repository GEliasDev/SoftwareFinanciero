import { AlertCircle, CalendarDays } from 'lucide-react';
import { nextOccurrence, effectiveDayInMonth, capFirst } from '../../utils/format';

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Selector de "día del mes" para ciclos recurrentes (cobro, corte, pago).
 *
 * Reemplaza al `<input type="number" min=1 max=31>` suelto: muestra los días
 * como una grilla tipo calendario, calcula en vivo la próxima fecha real en
 * que cae y advierte sobre los días 29-31, que no existen en todos los meses
 * (en esos casos el cobro se hace el último día — ver utils/cycleDay.js).
 *
 * @param {number|string} value    día seleccionado (1..31)
 * @param {(d:number)=>void} onChange
 * @param {string} label
 * @param {string} nombreEvento    "cobro" | "pago" | "corte" — para los textos
 * @param {string} error           mensaje de validación, si lo hay
 * @param {string} hint            texto de ayuda cuando no hay error
 */
export const DayOfMonthPicker = ({
  value,
  onChange,
  label = 'Día del mes',
  nombreEvento = 'cobro',
  error,
  hint,
  required = false,
}) => {
  const dia = Number(value) || 0;
  const valido = dia >= 1 && dia <= 31;
  const proxima = valido ? nextOccurrence(dia) : null;

  // Meses en los que el día elegido se corre al último día disponible.
  const mesesCortos = [];
  if (dia >= 29) {
    const y = new Date().getFullYear();
    for (let m = 0; m < 12; m++) {
      const real = effectiveDayInMonth(dia, y, m);
      if (real !== dia) {
        mesesCortos.push({
          mes: new Date(y, m, 1).toLocaleDateString('es-CO', { month: 'long' }),
          real,
        });
      }
    }
  }

  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label">{label}{required && ' *'}</label>

      <div className="dom-grid" role="group" aria-label={label}>
        {DIAS.map(d => (
          <button
            key={d}
            type="button"
            className={`dom-day${d === dia ? ' selected' : ''}${d >= 29 ? ' edge' : ''}`}
            aria-pressed={d === dia}
            onClick={() => onChange(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {error ? (
        <p className="form-error"><AlertCircle size={11} /> {error}</p>
      ) : proxima ? (
        <p className="form-hint dom-next">
          <CalendarDays size={11} />
          Próximo {nombreEvento}:{' '}
          <strong>
            {capFirst(proxima.toLocaleDateString('es-CO', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            }))}
          </strong>
        </p>
      ) : hint ? (
        <p className="form-hint">{hint}</p>
      ) : null}

      {mesesCortos.length > 0 && (
        <p className="form-hint dom-warn">
          <AlertCircle size={11} />
          {mesesCortos.length === 1
            ? `En ${mesesCortos[0].mes} el ${nombreEvento} se hace el día ${mesesCortos[0].real} (ese mes no tiene ${dia}).`
            : `En los meses que no tienen día ${dia} (${mesesCortos.map(m => m.mes).join(', ')}) el ${nombreEvento} se hace el último día del mes.`}
        </p>
      )}
    </div>
  );
};
