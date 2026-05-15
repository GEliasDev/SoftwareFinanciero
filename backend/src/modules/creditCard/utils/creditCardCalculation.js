/**
 * Calcula el valor de cuota mensual de una compra con tarjeta de crédito
 * Usa sistema francés: C = P × [i(1+i)^n] / [(1+i)^n - 1]
 *
 * @param {number} montoTotal - Valor de la compra
 * @param {number} numeroCuotas - Número de cuotas elegidas
 * @param {number} tasaInteresMensual - Tasa mensual de la tarjeta (en porcentaje, ej: 2.5)
 */
export function calcularCuotaCompra({ montoTotal, numeroCuotas, tasaInteresMensual }) {
    const i = tasaInteresMensual / 100;

    // Si es a 1 cuota no aplica interés
    if (numeroCuotas === 1) {
        return {
            valorCuotaMensual: parseFloat(montoTotal.toFixed(2)),
            totalAPagar: parseFloat(montoTotal.toFixed(2)),
            totalIntereses: 0,
        };
    }

    const factor = Math.pow(1 + i, numeroCuotas);
    const valorCuotaMensual = montoTotal * (i * factor) / (factor - 1);
    const totalAPagar = valorCuotaMensual * numeroCuotas;
    const totalIntereses = totalAPagar - montoTotal;

    return {
        valorCuotaMensual: parseFloat(valorCuotaMensual.toFixed(2)),
        totalAPagar: parseFloat(totalAPagar.toFixed(2)),
        totalIntereses: parseFloat(totalIntereses.toFixed(2)),
    };
}

/**
 * Calcula el pago mínimo mensual de la tarjeta
 * Regla: el mayor valor entre el 2% del saldo usado y $50.000 COP
 *
 * @param {number} cupoTotal - Cupo total de la tarjeta
 * @param {number} cupoDisponible - Cupo disponible actual
 */
export function calcularPagoMinimo({ cupoTotal, cupoDisponible }) {
    const saldoUsado = cupoTotal - cupoDisponible;
    const minimoAbsoluto = 50000; // $50.000 COP mínimo
    const porcentajeSaldo = saldoUsado * 0.02; // 2% del saldo usado

    const pagoMinimo = Math.max(porcentajeSaldo, minimoAbsoluto);

    // Si no hay saldo usado no hay pago mínimo
    if (saldoUsado <= 0) return 0;

    return parseFloat(pagoMinimo.toFixed(2));
}