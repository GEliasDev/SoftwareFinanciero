import { describe, it, expect } from 'vitest';
import { htmlToText, extractTexts, decodeMimeWords } from '../gmailApi.js';
import { parseRappiCardEmail } from '../parsers/rappicard.parser.js';

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64url');

const HTML_COMPRA = `
<html><head><style>td { color: red }</style></head><body>
<table><tr><td>&iexcl;Hola!</td></tr><tr><td>Realizaste una compra con tu RappiCard.</td></tr></table>
<table>
<tr><td>Monto</td><td>$21.000</td></tr>
<tr><td>M&eacute;todo de pago</td><td>*1625</td></tr>
<tr><td>No. de autorizaci&oacute;n</td><td>202692</td></tr>
<tr><td>Comercio</td><td>Estacion de Servicio</td></tr>
<tr><td>Fecha de la transacci&oacute;n</td><td>2026-10-28 07:24:02</td></tr>
</table></body></html>`;

describe('htmlToText', () => {
    it('quita estilos y etiquetas, decodifica entidades y separa las celdas', () => {
        const t = htmlToText(HTML_COMPRA);
        expect(t).not.toContain('color: red');
        expect(t).toContain('Monto $21.000 Método de pago *1625');
        expect(t).toContain('No. de autorización 202692');
    });
});

describe('extractTexts + parser (de punta a punta con un correo HTML)', () => {
    it('un mensaje solo-HTML (partes anidadas) termina en la compra correcta', () => {
        const payload = { mimeType: 'multipart/alternative', parts: [{ mimeType: 'text/html', body: { data: b64(HTML_COMPRA) } }] };
        const textos = extractTexts(payload);
        const mov = textos.map(body => parseRappiCardEmail({ subject: 'RappiCard - Resumen de transacción', body })).find(Boolean);
        expect(mov).toMatchObject({ tipo: 'compra', monto: 21000, ultimos4: '1625', autorizacion: '202692', fecha: '2026-10-28' });
    });

    it('pone text/plain antes que el HTML convertido', () => {
        const payload = { parts: [
            { mimeType: 'text/html', body: { data: b64('<p>html</p>') } },
            { mimeType: 'text/plain', body: { data: b64('plano') } },
        ] };
        expect(extractTexts(payload)).toEqual(['plano', 'html']);
    });
});

describe('decodeMimeWords', () => {
    it('decodifica asuntos RFC 2047 en base64 y quoted-printable', () => {
        const base64 = `=?UTF-8?B?${Buffer.from('RappiCard - Resumen de transacción').toString('base64')}?=`;
        expect(decodeMimeWords(base64)).toBe('RappiCard - Resumen de transacción');
        expect(decodeMimeWords('=?UTF-8?Q?Comprobante_de_pago?=')).toBe('Comprobante de pago');
        expect(decodeMimeWords('Comprobante de pago')).toBe('Comprobante de pago');
    });
});
