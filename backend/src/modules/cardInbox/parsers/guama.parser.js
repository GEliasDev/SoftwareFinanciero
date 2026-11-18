// Parser de las alertas por correo de Guama (remitente info@guamacard.com).
// Función pura: recibe asunto + cuerpo en texto y devuelve el movimiento o null.
//
// Formatos reales vistos:
//   "Compra aprobada"                → compra: comercio, tarjeta 7315, valor, cuotas (puede ir vacío), fecha, hora
//   "Tu pago en Guama fue aprobado"  → pago:   valor, fecha, hora (SIN tarjeta)
// Los pagos "rechazados", códigos de verificación, extractos y avisos no son movimientos (null).

import { normalizar, parseMontoCOP } from './rappicard.parser.js';

const RE_COMPRA = new RegExp(
    'Tu compra en (.+?) fue APROBADA\\.? Más información de la transacción Tarjeta (\\d{4}) ' +
    'Valor \\$?\\s*([\\d.,]+) Cuotas(?: (\\d+))? Fecha (\\d{4}-\\d{2}-\\d{2}) Hora (\\d{2}:\\d{2})',
    'i'
);

const RE_PAGO = /Valor \$?\s*([\d.,]+) Fecha (\d{4}-\d{2}-\d{2}) Hora (\d{2}:\d{2})/;

const compra = (t) => {
    const m = t.match(RE_COMPRA);
    if (!m) return null;
    const [, comercio, ultimos4, montoTxt, cuotas, fecha, hora] = m;
    const monto = parseMontoCOP(montoTxt);
    return {
        fuente: 'guama', tipo: 'compra',
        monto, ultimos4, comercio: comercio.trim(), fecha, hora,
        numeroCuotas: cuotas ? Number(cuotas) : undefined,
        huella: `guama|compra|${ultimos4}|${fecha} ${hora}|${monto}|${comercio.trim()}`,
    };
};

const pago = (t) => {
    const m = t.match(RE_PAGO);
    if (!m) return null;
    const [, montoTxt, fecha, hora] = m;
    const monto = parseMontoCOP(montoTxt);
    return {
        fuente: 'guama', tipo: 'pago', monto, ultimos4: null, fecha, hora,
        huella: `guama|pago|${fecha} ${hora}|${monto}`,
    };
};

export const parseGuamaEmail = ({ subject = '', body = '' }) => {
    const texto = normalizar(body);
    const asunto = subject.toLowerCase();
    let resultado = null;
    if (asunto.includes('compra aprobada')) resultado = compra(texto);
    else if (asunto.includes('pago en guama fue aprobado')) resultado = pago(texto);
    return resultado && Number.isFinite(resultado.monto) ? resultado : null;
};
