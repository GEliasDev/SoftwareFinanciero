/**
 * Calcula los valores de un crédito bancario con cuota fija (sistema francés)
 * Fórmula: C = P × [i(1+i)^n] / [(1+i)^n - 1]
 *
 * @param {number} montoTotal - Monto original del crédito
 * @param {number} numeroCuotas - Número de cuotas mensuales
 * @param {number} tasaInteres - Tasa ingresada por el usuario
 * @param {'mensual'|'anual'} tipoTasa - Tipo de tasa ingresada
 * @param {number} cuotaAdministracion - Cuota fija adicional (opcional)
 * @param {number} seguro - Seguro/aval mensual (opcional)
 * @param {string} fechaInicio - Fecha de inicio en formato YYYY-MM-DD
 * @param {number} diaPago - Día del mes del pago
 */
export function bankCreditCalculation({
    montoTotal,
    numeroCuotas,
    tasaInteres,
    tipoTasa,
    cuotaAdministracion = 0,
    seguro = 0,
    fechaInicio,
    diaPago,
}) {
    // Convertir tasa a mensual si es anual (tasa efectiva anual a mensual)
    // Fórmula: i_mensual = (1 + i_anual)^(1/12) - 1
    const tasaMensual =
        tipoTasa === 'anual'
            ? Math.pow(1 + tasaInteres / 100, 1 / 12) - 1
            : tasaInteres / 100;

    // Cuota fija sin cargos adicionales
    // C = P × [i(1+i)^n] / [(1+i)^n - 1]
    const factor = Math.pow(1 + tasaMensual, numeroCuotas);
    const valorCuotaBase = montoTotal * (tasaMensual * factor) / (factor - 1);
    const valorCuota = valorCuotaBase + cuotaAdministracion + seguro;

    const totalAPagar = valorCuota * numeroCuotas;
    const totalIntereses = valorCuotaBase * numeroCuotas - montoTotal;

    // Calcular fecha de fin sumando los meses de cuotas
    const fecha = new Date(fechaInicio);
    fecha.setMonth(fecha.getMonth() + numeroCuotas);
    fecha.setDate(diaPago);
    const fechaFin = fecha.toISOString().split('T')[0];

    return {
        tasaMensual: parseFloat(tasaMensual.toFixed(6)),
        valorCuota: parseFloat(valorCuota.toFixed(2)),
        totalAPagar: parseFloat(totalAPagar.toFixed(2)),
        totalIntereses: parseFloat(totalIntereses.toFixed(2)),
        saldoPendiente: parseFloat(montoTotal.toFixed(2)),
        fechaFin,
    };
}