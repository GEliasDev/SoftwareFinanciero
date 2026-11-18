// Parser de las alertas por correo de Bancolombia (remitente *@notificacionesbancolombia.com).
// Función pura: recibe asunto + cuerpo en texto y devuelve el movimiento o null.
//
// Solo interesan las COMPRAS CON TARJETA DE CRÉDITO (el correo dice "T.Cred *7439"):
//   "Bancolombia: Compraste COP3.200,00 en NOVAVENTA con tu T.Cred *7439, el 18/11/2026 a las 12:48."
// Quedan fuera (null): compras con débito ("T.Deb"), transferencias, nómina y pagos desde cuenta.
// El asunto es siempre "Alertas y Notificaciones", así que no sirve para distinguir el tipo.
// El correo no trae número de autorización: la huella usa fecha, hora, monto y comercio.

import { normalizar, parseMontoCOP } from './rappicard.parser.js';

const RE_COMPRA = new RegExp(
    'Compraste (?:COP|\\$)\\s*([\\d.,]+) en (.+?) con tu T\\.Cred \\*(\\d{4}),? ' +
    'el (\\d{2})/(\\d{2})/(\\d{2,4}) a las (\\d{2}:\\d{2})'
);

export const parseBancolombiaEmail = ({ body = '' }) => {
    const m = normalizar(body).match(RE_COMPRA);
    if (!m) return null;
    const [, montoTxt, comercio, ultimos4, dia, mes, anioTxt, hora] = m;
    const monto = parseMontoCOP(montoTxt);
    if (!Number.isFinite(monto)) return null;
    const anio = anioTxt.length === 2 ? `20${anioTxt}` : anioTxt;
    const fecha = `${anio}-${mes}-${dia}`;
    return {
        fuente: 'bancolombia', tipo: 'compra',
        monto, ultimos4, comercio: comercio.trim(), fecha, hora,
        huella: `bancolombia|compra|${ultimos4}|${fecha} ${hora}|${monto}|${comercio.trim()}`,
    };
};
