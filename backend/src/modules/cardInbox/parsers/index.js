// Fuentes de alertas por correo. Para agregar un banco: su parser + una entrada aquí.
//   remitente: fragmento que debe aparecer en el "From" (y se usa en la búsqueda de Gmail)
//   filtro:    términos extra de la búsqueda para no traer correos que no son movimientos de tarjeta
//   entidad:   cómo se reconoce la tarjeta del usuario cuando el correo no trae los últimos 4
import { parseRappiCardEmail, REMITENTE_RAPPICARD } from './rappicard.parser.js';
import { parseBancolombiaEmail } from './bancolombia.parser.js';
import { parseNuEmail } from './nu.parser.js';
import { parseGuamaEmail } from './guama.parser.js';

export const FUENTES = [
    { fuente: 'rappicard',   remitente: REMITENTE_RAPPICARD,              filtro: '',          entidad: /rappi/i,      parse: parseRappiCardEmail },
    { fuente: 'bancolombia', remitente: 'notificacionesbancolombia.com',  filtro: '"T.Cred"',  entidad: /bancolombia/i, parse: parseBancolombiaEmail },
    { fuente: 'nu',          remitente: 'nu@nu.com.co',                   filtro: '',          entidad: /\bnu\b/i,     parse: parseNuEmail },
    { fuente: 'guama',       remitente: 'info@guamacard.com',             filtro: '',          entidad: /guama/i,      parse: parseGuamaEmail },
];

// Consulta de Gmail que cubre todas las fuentes: (from:a filtro) OR (from:b) ...
export const consultaGmail = () => FUENTES
    .map(f => `(from:${f.remitente}${f.filtro ? ` ${f.filtro}` : ''})`)
    .join(' OR ');

// Elige el parser según el remitente real del correo.
export const parseCorreo = ({ from = '', subject = '', body = '' }) => {
    const origen = from.toLowerCase();
    const fuente = FUENTES.find(f => origen.includes(f.remitente));
    return fuente ? fuente.parse({ subject, body }) : null;
};
