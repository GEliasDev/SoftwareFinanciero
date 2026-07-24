/**
 * Día efectivo de un ciclo mensual dentro de un mes concreto.
 *
 * Los días de cobro/corte se guardan como 1..31, pero no todos los meses
 * tienen 31 días. Sin recortar, un `diaCobro = 31` hacía que la condición
 * `hoy < diaCobro` fuera siempre verdadera en abril, junio, septiembre,
 * noviembre y febrero — la suscripción (o la cuota de manejo) simplemente
 * NO se cobraba ese mes. Además `new Date(2026, 5, 31)` desborda a julio,
 * con lo que la comprobación de idempotencia miraba el mes equivocado.
 *
 * @param {number|string} day  día configurado (1..31)
 * @param {number} year
 * @param {number} monthIndex  0 = enero (igual que Date)
 * @returns {number} día real a usar en ese mes (31 → 30 en junio, 28/29 en febrero)
 */
export const effectiveDayInMonth = (day, year, monthIndex) => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const d = Number(day);
    if (!Number.isFinite(d) || d < 1) return 1;
    return Math.min(d, lastDay);
};
