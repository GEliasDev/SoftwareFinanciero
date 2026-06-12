/**
 * Conversión simple a COP para montos en moneda extranjera (suscripciones USD/EUR).
 *
 * Las tasas son aproximadas y se pueden ajustar por variables de entorno
 * (TRM_USD, TRM_EUR) sin tocar código. Mientras no exista una integración de
 * TRM en línea, esto evita el bug de sumar USD 15 como $15 COP en analytics.
 */
const RATES = {
    COP: 1,
    USD: Number(process.env.TRM_USD) || 4000,
    EUR: Number(process.env.TRM_EUR) || 4350,
};

export const toCOP = (monto, moneda = 'COP') =>
    Number(monto || 0) * (RATES[moneda] ?? 1);
