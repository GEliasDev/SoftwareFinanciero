/**
 * Conversión a COP para montos en moneda extranjera (suscripciones USD/EUR).
 *
 * Espejo de `backend/src/utils/currency.js` — mantener ambas listas en sync.
 * El backend permite ajustar las tasas por env (TRM_USD/TRM_EUR); aquí van los
 * mismos valores por defecto, porque el frontend solo las usa para totales
 * informativos (los cálculos que alimentan dineroLibre los hace el servidor).
 */
const RATES = { COP: 1, USD: 4000, EUR: 4350 };

export const toCOP = (monto, moneda = 'COP') =>
  (parseFloat(monto) || 0) * (RATES[moneda] ?? 1);

/**
 * Costo mensual equivalente de una suscripción, en COP.
 * Usa `montoMensual` (que el backend ya calculó dividiendo las anuales entre
 * 12) — NO `monto`, que es el valor por cobro y para una suscripción anual
 * sobreestimaría el gasto mensual 12 veces.
 */
export const subMonthlyCOP = (s) => toCOP(s?.montoMensual ?? 0, s?.moneda);

/** Costo anual equivalente de una suscripción, en COP. */
export const subAnnualCOP = (s) => subMonthlyCOP(s) * 12;
