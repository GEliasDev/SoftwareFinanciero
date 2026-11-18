import { describe, it, expect } from 'vitest';
import { parseBancolombiaEmail } from '../bancolombia.parser.js';
import { parseGuamaEmail } from '../guama.parser.js';
import { parseNuEmail } from '../nu.parser.js';
import { parseCorreo, consultaGmail, FUENTES } from '../index.js';

// Cuerpos reales (tabla markdown tal como se extrae del correo), sin datos personales.
const BANCOLOMBIA = (cuerpo) => `
| ¡Listo! |
| Todo salió bien con tus movimientos |
| Bancolombia: ${cuerpo} Si tienes dudas, encuentranos aqui: 6045109095 o 018000931987. |
`;

const GUAMA_COMPRA = (cuotas) => `
| Tu compra en QUEST N 33 fue APROBADA. |
| Más información de la transacción |
| Tarjeta | 7315 |
| Valor | $ 100.900,00 |
| Cuotas | ${cuotas} |
| Fecha | 2026-10-31 |
| Hora | 20:04 |
`;

const GUAMA_PAGO = `
| El pago que hiciste en Guama fue aprobado. |
| Más información del pago |
| Valor | $ 128.438,96 |
| Fecha | 2026-10-30 |
| Hora | 13:45 |
`;

const NU_PAGO = `
| ¡Recibimos tu pago! Ya puedes estar relax. |
| Estos son los detalles de lo que pagaste: Tu pago fue de $42.130,01 Lo has realizado el 30 octubre 2026 1:48:43 PM
Tipo de transacción Pago en linea Costo de transacción $0 Producto origen GVC540 Producto destino **** **** **** 8063
ID transacción d6d9dd63-8ae9-37a3-b211-0c56fe537359 Tu próxima fecha de corte es 20 noviembre 2026 |
`;

describe('parseBancolombiaEmail', () => {
    it('lee una compra con tarjeta de crédito (monto con prefijo COP)', () => {
        const mov = parseBancolombiaEmail({
            subject: 'Alertas y Notificaciones',
            body: BANCOLOMBIA('Compraste COP3.200,00 en NOVAVENTA con tu T.Cred *7439, el 18/11/2026 a las 12:48.'),
        });
        expect(mov).toEqual({
            fuente: 'bancolombia', tipo: 'compra', monto: 3200, ultimos4: '7439', comercio: 'NOVAVENTA',
            fecha: '2026-11-18', hora: '12:48',
            huella: 'bancolombia|compra|7439|2026-11-18 12:48|3200|NOVAVENTA',
        });
    });

    it('lee el monto con prefijo $ y comercios con espacios', () => {
        const mov = parseBancolombiaEmail({
            body: BANCOLOMBIA('Compraste $10.500,00 en DOLLARCITY MALL PLAZ con tu T.Cred *7439, el 11/10/2026 a las 19:20.'),
        });
        expect(mov).toMatchObject({ monto: 10500, comercio: 'DOLLARCITY MALL PLAZ', fecha: '2026-10-11' });
    });

    it('ignora compras con débito, transferencias, nómina y pagos desde cuenta', () => {
        for (const cuerpo of [
            'Compraste $10.500,00 en DOLLARCITY MALL PLAZ con tu T.Deb *4515, el 11/10/2026 a las 19:20.',
            'Recibiste una transferencia por $240000 de ALGUIEN en tu cuenta **3041, el 18/11/2026 a las 13:21.',
            'Transferiste $4000.00 desde tu cuenta *3041 a la cuenta *3016251474 el 17/11/26 a las 12:41.',
            'Pagaste $1164140.12 a BANCO DAVIVIENDA SA desde tu producto 3041 el 31/10/2026 14:48:14.',
            'Recibiste un pago de Nomina de AED por $1859928.00 en tu cuenta de Ahorros el 30/10/2026 a las 09:57.',
        ]) {
            expect(parseBancolombiaEmail({ body: BANCOLOMBIA(cuerpo) })).toBeNull();
        }
    });
});

describe('parseGuamaEmail', () => {
    it('lee una compra aprobada con cuotas', () => {
        expect(parseGuamaEmail({ subject: 'Compra aprobada', body: GUAMA_COMPRA('1') })).toEqual({
            fuente: 'guama', tipo: 'compra', monto: 100900, ultimos4: '7315', comercio: 'QUEST N 33',
            fecha: '2026-10-31', hora: '20:04', numeroCuotas: 1,
            huella: 'guama|compra|7315|2026-10-31 20:04|100900|QUEST N 33',
        });
    });

    it('acepta la compra con el campo Cuotas vacío', () => {
        const mov = parseGuamaEmail({ subject: 'Compra aprobada', body: GUAMA_COMPRA('') });
        expect(mov).toMatchObject({ tipo: 'compra', monto: 100900, ultimos4: '7315' });
        expect(mov.numeroCuotas).toBeUndefined();
    });

    it('lee el texto convertido desde HTML, que deja un espacio antes del punto ("APROBADA .")', () => {
        // Regresión 2026-11-18: así llega por gmailApi.htmlToText y el parser devolvía null.
        const html = 'Tu compra en MEGATIENDAS TORICES fue APROBADA . Más información de la transacción Tarjeta 7315 ' +
            'Valor $ 20.140,00 Cuotas Fecha 2026-10-20 Hora 20:07 ℹ️ Recuerda que puedes cambiar el número de cuotas';
        expect(parseGuamaEmail({ subject: 'Compra aprobada', body: html })).toMatchObject({
            tipo: 'compra', monto: 20140, ultimos4: '7315', comercio: 'MEGATIENDAS TORICES', fecha: '2026-10-20', hora: '20:07',
        });
    });

    it('lee un pago aprobado (sin tarjeta)', () => {
        expect(parseGuamaEmail({ subject: 'Tu pago en Guama fue aprobado 🎉', body: GUAMA_PAGO })).toEqual({
            fuente: 'guama', tipo: 'pago', monto: 128438.96, ultimos4: null,
            fecha: '2026-10-30', hora: '13:45', huella: 'guama|pago|2026-10-30 13:45|128438.96',
        });
    });

    it('ignora pagos rechazados, códigos y avisos', () => {
        expect(parseGuamaEmail({ subject: 'Tu pago en Guama fue rechazado', body: GUAMA_PAGO })).toBeNull();
        expect(parseGuamaEmail({ subject: 'Tu código es: 530565', body: 'Tu código de verificación es: 530565' })).toBeNull();
        expect(parseGuamaEmail({ subject: 'Mañana es tu fecha límite de pago', body: 'Recuerda que mañana es el último día' })).toBeNull();
    });
});

describe('parseNuEmail', () => {
    it('lee un pago (hora de 12 h a 24 h, tarjeta destino y huella por ID)', () => {
        expect(parseNuEmail({ subject: '¡Ya entró tu pago!', body: NU_PAGO })).toEqual({
            fuente: 'nu', tipo: 'pago', monto: 42130.01, ultimos4: '8063',
            fecha: '2026-10-30', hora: '13:48', huella: 'nu|pago|8063|d6d9dd63-8ae9-37a3-b211-0c56fe537359',
        });
    });

    it('12:xx AM es 00:xx y 12:xx PM es 12:xx', () => {
        const cuerpo = (ampm) => NU_PAGO.replace('1:48:43 PM', `12:05:00 ${ampm}`);
        expect(parseNuEmail({ subject: '¡Ya entró tu pago!', body: cuerpo('AM') }).hora).toBe('00:05');
        expect(parseNuEmail({ subject: '¡Ya entró tu pago!', body: cuerpo('PM') }).hora).toBe('12:05');
    });

    it('ignora extractos y otros correos de Nu', () => {
        expect(parseNuEmail({ subject: 'Llegó el extracto de tu Tarjeta Abre Caminos', body: NU_PAGO })).toBeNull();
        expect(parseNuEmail({ subject: '¡Conseguiste un aumento de cupo!', body: 'aumentaremos tu cupo' })).toBeNull();
    });
});

describe('parseCorreo / consultaGmail', () => {
    it('elige el parser según el remitente real', () => {
        const body = BANCOLOMBIA('Compraste COP3.200,00 en NOVAVENTA con tu T.Cred *7439, el 18/11/2026 a las 12:48.');
        expect(parseCorreo({ from: 'Alertas <alertasynotificaciones@ayn.notificacionesbancolombia.com>', subject: 'Alertas y Notificaciones', body }).fuente).toBe('bancolombia');
        expect(parseCorreo({ from: 'Guama <info@guamacard.com>', subject: 'Compra aprobada', body: GUAMA_COMPRA('1') }).fuente).toBe('guama');
        expect(parseCorreo({ from: 'Nu <nu@nu.com.co>', subject: '¡Ya entró tu pago!', body: NU_PAGO }).fuente).toBe('nu');
    });

    it('un remitente desconocido no se parsea aunque el texto parezca un movimiento', () => {
        const body = BANCOLOMBIA('Compraste COP3.200,00 en NOVAVENTA con tu T.Cred *7439, el 18/11/2026 a las 12:48.');
        expect(parseCorreo({ from: 'Phishing <alguien@otro.com>', subject: 'Alertas y Notificaciones', body })).toBeNull();
    });

    it('la consulta de Gmail incluye todas las fuentes y filtra Bancolombia a crédito', () => {
        const q = consultaGmail();
        for (const f of FUENTES) expect(q).toContain(`from:${f.remitente}`);
        expect(q).toContain('from:notificacionesbancolombia.com "T.Cred"');
    });
});
