import { effectiveDayInMonth } from '../../../utils/cycleDay.js';

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
    // C = P × [i(1+i)^n] / [(1+i)^n - 1]; caso tasa=0: cuota simple P/n
    let valorCuotaBase;
    if (tasaMensual === 0) {
        valorCuotaBase = montoTotal / numeroCuotas;
    } else {
        const factor = Math.pow(1 + tasaMensual, numeroCuotas);
        valorCuotaBase = montoTotal * (tasaMensual * factor) / (factor - 1);
    }
    const valorCuota = valorCuotaBase + cuotaAdministracion + seguro;

    const totalAPagar = valorCuota * numeroCuotas;
    const totalIntereses = valorCuotaBase * numeroCuotas - montoTotal;

    // Fecha de fin. `new Date(y, m, 31)` SÍ desborda al mes siguiente (el
    // comentario anterior afirmaba lo contrario): hay que recortar el día al
    // mes destino con effectiveDayInMonth.
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const finY = inicio.getFullYear();
    const finM = inicio.getMonth() + numeroCuotas;
    // Normalizar año/mes antes de recortar (finM puede superar 11).
    const finNorm = new Date(finY, finM, 1);
    const finDate = new Date(
        finNorm.getFullYear(),
        finNorm.getMonth(),
        effectiveDayInMonth(diaPago, finNorm.getFullYear(), finNorm.getMonth())
    );
    const fechaFin = `${finDate.getFullYear()}-${String(finDate.getMonth() + 1).padStart(2, '0')}-${String(finDate.getDate()).padStart(2, '0')}`;

    return {
        tasaMensual: parseFloat(tasaMensual.toFixed(6)),
        valorCuota: parseFloat(valorCuota.toFixed(2)),
        totalAPagar: parseFloat(totalAPagar.toFixed(2)),
        totalIntereses: parseFloat(totalIntereses.toFixed(2)),
        saldoPendiente: parseFloat(montoTotal.toFixed(2)),
        fechaFin,
    };
}