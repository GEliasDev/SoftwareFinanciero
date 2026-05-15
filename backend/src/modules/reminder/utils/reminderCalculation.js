/**
 * Calcula la próxima fecha de pago dado un día del mes
 * Si el día ya pasó este mes, devuelve el del mes siguiente
 *
 * @param {number} diaPago - Día del mes del pago (1-31)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function calcularProximaFechaPago(diaPago) {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth(); // 0-indexed

    // Intentar con el mes actual
    let fecha = new Date(anio, mes, diaPago);

    // Si el día ya pasó, ir al mes siguiente
    if (fecha <= hoy) {
        fecha = new Date(anio, mes + 1, diaPago);
    }

    return fecha.toISOString().split('T')[0];
}

/**
 * Calcula la fecha en que debe enviarse el recordatorio
 *
 * @param {string} proximaFechaPago - Fecha de pago en YYYY-MM-DD
 * @param {number} diasAnticipacion - Días antes del pago para avisar
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function calcularFechaRecordatorio(proximaFechaPago, diasAnticipacion) {
    const fecha = new Date(proximaFechaPago);
    fecha.setDate(fecha.getDate() - diasAnticipacion);
    return fecha.toISOString().split('T')[0];
}

/**
 * Verifica si hoy es el día de enviar el recordatorio
 *
 * @param {string} fechaRecordatorio - Fecha en YYYY-MM-DD
 * @returns {boolean}
 */
export function debeEnviarse(fechaRecordatorio) {
    const hoy = new Date().toISOString().split('T')[0];
    return hoy === fechaRecordatorio;
}