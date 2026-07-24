/**
 * Fecha/mes de HOY en hora local, como string.
 *
 * `new Date().toISOString()` da la fecha en UTC: en Colombia (UTC-5) después de
 * las ~7pm ya devuelve el día siguiente. Para fechas "de hoy" que el usuario ve
 * o que se guardan como DATEONLY, usar estos helpers.
 *
 * (Construir `new Date(año,mes,día)` a medianoche local y hacer toISOString SÍ es
 * seguro para la parte de fecha —medianoche local sigue siendo el mismo día en
 * UTC—; el problema es solo `new Date()` con la hora actual.)
 */
export const localToday = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const localMonth = (d = new Date()) => localToday(d).slice(0, 7);
