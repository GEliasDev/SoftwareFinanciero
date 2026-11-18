// Parser de las alertas por correo de Nu (remitente nu@nu.com.co).
// Función pura: recibe asunto + cuerpo en texto y devuelve el movimiento o null.
//
// Formato real visto (Nu no manda correo por cada compra, solo por los pagos):
//   "¡Ya entró tu pago!" → pago: monto, fecha y hora (12 h, "1:48:43 PM"), tarjeta destino "**** **** **** 8063", ID de transacción
// Extractos, cambios de cupo y novedades no son movimientos (null).

import { normalizar, parseMontoCOP } from './rappicard.parser.js';

const MESES = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const RE_PAGO = new RegExp(
    'Tu pago fue de \\$?\\s*([\\d.,]+) Lo has realizado el (\\d{1,2}) ([a-zA-Záéíóú]+) (\\d{4}) ' +
    '(\\d{1,2}):(\\d{2}):\\d{2} (AM|PM)[\\s\\S]*?Producto destino (?:\\*+ ){3}(\\d{4})[\\s\\S]*?ID transacción ([\\w-]+)',
    'i'
);

export const parseNuEmail = ({ subject = '', body = '' }) => {
    if (!subject.toLowerCase().includes('ya entró tu pago')) return null;
    const m = normalizar(body).match(RE_PAGO);
    if (!m) return null;
    const [, montoTxt, dia, mesTxt, anio, h12, minutos, ampm, ultimos4, idTransaccion] = m;
    const mes = MESES[mesTxt.toLowerCase()];
    const monto = parseMontoCOP(montoTxt);
    if (!mes || !Number.isFinite(monto)) return null;
    let hora24 = Number(h12) % 12;
    if (ampm.toUpperCase() === 'PM') hora24 += 12;
    return {
        fuente: 'nu', tipo: 'pago',
        monto, ultimos4,
        fecha: `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
        hora: `${String(hora24).padStart(2, '0')}:${minutos}`,
        huella: `nu|pago|${ultimos4}|${idTransaccion}`,
    };
};
