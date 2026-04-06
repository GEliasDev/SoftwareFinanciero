/**
 * Calcula el equivalente mensual de una suscripción
 * Si es mensual, el equivalente es el mismo monto
 * Si es anual, se divide entre 12
 *
 * @param {number} monto - Valor del cobro
 * @param {'mensual'|'anual'} frecuencia - Frecuencia de cobro
 */
export function calcularMontoMensual({ monto, frecuencia }) {
    if (frecuencia === 'mensual') {
        return parseFloat(monto.toFixed(2));
    }
    return parseFloat((monto / 12).toFixed(2));
}

/**
 * Calcula el total anual de una suscripción
 *
 * @param {number} monto - Valor del cobro
 * @param {'mensual'|'anual'} frecuencia - Frecuencia de cobro
 */
export function calcularTotalAnual({ monto, frecuencia }) {
    if (frecuencia === 'anual') {
        return parseFloat(monto.toFixed(2));
    }
    return parseFloat((monto * 12).toFixed(2));
}