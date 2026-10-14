import { useEffect, useRef, useState } from 'react';
import { formatMoneyInput, parseMoneyInput } from '../../utils/format';

/**
 * Input de dinero con formato es-CO en vivo: separador de miles con punto y
 * coma decimal ('1.200.000', '26.000,50'). NUNCA type="number" — el navegador
 * no agrupa miles y con locale es-CO muestra '26000,00' en vez de '26.000'.
 *
 * El valor que expone vía onChange es SIEMPRE canónico (punto decimal, sin
 * separadores de miles: '1200000', '26000.50') listo para Number() al enviar.
 * value acepta canónico o número ('1200000.00' del backend DECIMAL funciona).
 *
 * <MoneyInput id="monto" value={form.montoTotal} onChange={setMonto} />
 */
export const MoneyInput = ({ id, value, onChange, placeholder, disabled, className = '', error, ...props }) => {
  const [display, setDisplay] = useState(() => formatMoneyInput(value ?? ''));
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      setDisplay(formatMoneyInput(value ?? ''));
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setDisplay('');
      onChange('');
      return;
    }
    // Solo dígitos, puntos de miles y una coma/punto decimal con ≤2 decimales.
    if (!/^\d*[.,]?\d{0,2}$/.test(raw.replace(/\./g, ''))) return;
    const canonical = parseMoneyInput(raw);
    setDisplay(formatMoneyInput(canonical));
    onChange(canonical);
  };

  return (
    <input
      id={id}
      className={`form-input tabular ${error ? 'error' : ''} ${className}`.trim()}
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder ?? '0'}
      value={display}
      onChange={handleChange}
      onFocus={(e) => e.target.select()}
      disabled={disabled}
      {...props}
    />
  );
};