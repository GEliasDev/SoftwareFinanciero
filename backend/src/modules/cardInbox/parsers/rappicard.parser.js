// Parser de las alertas por correo de RappiCard (producto de Davivienda).
// Función pura: recibe asunto + cuerpo en texto y devuelve el movimiento o null
// (extractos, publicidad y cualquier correo que no sea un movimiento).
//
// Formatos reales vistos (remitente noreply@rappicard.co):
//   "RappiCard - Resumen de transacción"  → compra:  monto, tarjeta *1625, autorización, comercio, fecha
//   "¡Tu Avance Digital está listo!"      → avance:  monto, cuotas, tasas, costo transaccional, total (SIN tarjeta)
//   "Comprobante de pago"                 → pago:    tarjeta *1625, fecha, método (PSE), monto
// Los montos vienen en es-CO ("$21.000", "$50.000,00", "1.172.324,98") salvo
// "Costo Transaccional", que llega como "7000.00" (punto decimal, sin miles).

export const REMITENTE_RAPPICARD = 'noreply@rappicard.co';

const MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12 };

// El cuerpo llega como tabla markdown ("| Monto | $21.000 |") o aplanado
// (snippet). Se normaliza a una sola línea con espacios simples para que la
// misma regex sirva en ambos casos.
export const normalizar = (texto) => String(texto ?? '')
    .replace(/\|/g, ' ')
    .replace(/-{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// "$21.000" → 21000 · "$50.000,00" → 50000 · "1.172.324,98" → 1172324.98 · "7000.00" → 7000
export const parseMontoCOP = (valor) => {
    const s = String(valor).replace(/[$\s]/g, '');
    if (!/^\d[\d.,]*$/.test(s)) return NaN;
    if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''));
    return Number(s);
};

const MONTO = '\\$?\\s*([\\d.,]+)';

const RE_COMPRA = new RegExp(
    `Monto ${MONTO} Método de pago \\*+(\\d{4}) No\\. de autorización (\\d+) Comercio (.+?) ` +
    'Fecha de la transacción (\\d{4}-\\d{2}-\\d{2}) (\\d{2}:\\d{2}:\\d{2})'
);

const RE_AVANCE = new RegExp(
    `Monto Solicitado ${MONTO} Fecha y hora (\\d{4}-\\d{2}-\\d{2}) (\\d{2}:\\d{2}) No\\. de cuotas (\\d+) ` +
    'Tasa de interés M\\.? ?V\\.? ([\\d.,]+)% Tasa de interés E\\.? ?A\\.? ([\\d.,]+)% ' +
    `Costo Transaccional ${MONTO} Intereses totales ${MONTO} Total a pagar ${MONTO}`
);

const RE_PAGO = new RegExp(
    'Destino de pago \\*+(\\d{4}) Fecha y hora (\\d{1,2}) ([a-zA-Z]{3,4}) (\\d{4}) (\\d{2}:\\d{2}) ' +
    `Método de pago (\\S+) Monto ${MONTO}`
);

const compra = (t) => {
    const m = t.match(RE_COMPRA);
    if (!m) return null;
    const [, monto, ultimos4, autorizacion, comercio, fecha, hora] = m;
    return {
        fuente: 'rappicard', tipo: 'compra',
        monto: parseMontoCOP(monto), ultimos4, autorizacion, comercio: comercio.trim(), fecha, hora,
        huella: `rappicard|compra|${ultimos4}|${autorizacion}`,
    };
};

const avance = (t) => {
    const m = t.match(RE_AVANCE);
    if (!m) return null;
    const [, monto, fecha, hora, cuotas, tasaMensual, tasaEA, costo, intereses, total] = m;
    const montoNum = parseMontoCOP(monto);
    return {
        fuente: 'rappicard', tipo: 'avance',
        monto: montoNum, fecha, hora, numeroCuotas: Number(cuotas),
        tasaMensual: Number(tasaMensual), tasaEA: Number(tasaEA),
        costoTransaccional: parseMontoCOP(costo), interesesTotales: parseMontoCOP(intereses), totalAPagar: parseMontoCOP(total),
        ultimos4: null, // el correo del avance no trae el número de tarjeta
        huella: `rappicard|avance|${fecha} ${hora}|${montoNum}`,
    };
};

const pago = (t) => {
    const m = t.match(RE_PAGO);
    if (!m) return null;
    const [, ultimos4, dia, mesTxt, anio, hora, metodoPago, monto] = m;
    const mes = MESES[mesTxt.toLowerCase()];
    if (!mes) return null;
    const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const montoNum = parseMontoCOP(monto);
    return {
        fuente: 'rappicard', tipo: 'pago',
        monto: montoNum, ultimos4, fecha, hora, metodoPago,
        huella: `rappicard|pago|${ultimos4}|${fecha} ${hora}|${montoNum}`,
    };
};

export const parseRappiCardEmail = ({ subject = '', body = '' }) => {
    const texto = normalizar(body);
    const asunto = subject.toLowerCase();
    let resultado = null;
    if (asunto.includes('resumen de transacción')) resultado = compra(texto);
    else if (asunto.includes('avance digital')) resultado = avance(texto);
    else if (asunto.includes('comprobante de pago')) resultado = pago(texto);
    return resultado && Number.isFinite(resultado.monto) ? resultado : null;
};
