import { effectiveDayInMonth } from '../../../utils/cycleDay.js';

// 'YYYY-MM-DD' en hora LOCAL, sin pasar por toISOString (que convierte a UTC).
const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Calcula la próxima fecha de pago dado un día del mes.
 * Si el día ya pasó este mes, devuelve el del mes siguiente.
 *
 * El día se recorta al mes real (`effectiveDayInMonth`): un diaPago=31 en un mes
 * de 30 días desbordaba al mes siguiente — el recordatorio de una obligación con
 * pago el 31 terminaba agendado el 1 o el 3 del mes equivocado.
 *
 * @param {number} diaPago - Día del mes del pago (1-31)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function calcularProximaFechaPago(diaPago) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const y = hoy.getFullYear();
    const m = hoy.getMonth(); // 0-indexed

    const enMes = (yy, mm) => new Date(yy, mm, effectiveDayInMonth(diaPago, yy, mm));

    let fecha = enMes(y, m);
    if (fecha <= hoy) {
        // getMonth()+1 puede pasar de 11 a 12; new Date lo normaliza al año siguiente.
        const next = new Date(y, m + 1, 1);
        fecha = enMes(next.getFullYear(), next.getMonth());
    }
    return ymd(fecha);
}

/**
 * Calcula la fecha en que debe enviarse el recordatorio (N días antes del pago).
 *
 * @param {string} proximaFechaPago - Fecha de pago en YYYY-MM-DD
 * @param {number} diasAnticipacion - Días antes del pago para avisar
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function calcularFechaRecordatorio(proximaFechaPago, diasAnticipacion) {
    // Parseo local explícito: new Date('YYYY-MM-DD') interpreta UTC.
    const [y, mo, d] = String(proximaFechaPago).split('-').map(Number);
    const fecha = new Date(y, mo - 1, d);
    fecha.setDate(fecha.getDate() - (Number(diasAnticipacion) || 0));
    return ymd(fecha);
}

/**
 * Verifica si hoy es el día de enviar el recordatorio.
 *
 * @param {string} fechaRecordatorio - Fecha en YYYY-MM-DD
 * @returns {boolean}
 */
export function debeEnviarse(fechaRecordatorio) {
    // Hoy en hora local (el cron corre 8 AM Colombia): comparar contra el UTC
    // de toISOString podía adelantar el día en horas cercanas a medianoche.
    return ymd(new Date()) === fechaRecordatorio;
}
