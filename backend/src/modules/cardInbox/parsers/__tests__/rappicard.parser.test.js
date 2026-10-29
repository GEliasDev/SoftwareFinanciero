import { describe, it, expect } from 'vitest';
import { parseRappiCardEmail, parseMontoCOP } from '../rappicard.parser.js';

// Cuerpos reales de RappiCard (tabla markdown tal como se extrae del HTML),
// con el nombre del titular quitado.
const CUERPO_COMPRA = `
| ¡Hola! |
| Realizaste una compra con tu RappiCard. |
| Detalle de tu transacción: |
| Monto | $21.000 |
| ------------------------------ |
| Método de pago | *1625 |
| ------------------------------ |
| No. de autorización | 202692 |
| ------------------------------ |
| Comercio | Estacion de Servicio |
| ------------------------------ |
| Fecha de la transacción | 2026-10-28 07:24:02 |
| Producto de Davivienda S.A. |
`;

const CUERPO_AVANCE = `
| Te compartimos los detalles del avance que nos solicitaste |
| Detalles de tu plan |
| Monto Solicitado | $50.000,00 |
| Fecha y hora | 2026-10-23 20:43 |
| No. de cuotas | 2 |
| Tasa de interés M. V. | 2.11% |
| Tasa de interés E.A. | 28.59% |
| Costo Transaccional | 7000.00 |
| Intereses totales | $1.235,27 |
| Total a pagar | $51.235,27 |
`;

const CUERPO_PAGO = `
| Recibimos el pago de tu tarjeta y lo estamos procesando. |
| Destino de pago | *1625 |
| Fecha y hora | 01 oct 2026 13:53 |
| Método de pago | PSE |
| Monto | 1.172.324,98 |
| Cashback |
`;

describe('parseMontoCOP', () => {
    it('lee los formatos es-CO que usa RappiCard', () => {
        expect(parseMontoCOP('$21.000')).toBe(21000);
        expect(parseMontoCOP('$50.000,00')).toBe(50000);
        expect(parseMontoCOP('1.172.324,98')).toBe(1172324.98);
        expect(parseMontoCOP('$1.235,27')).toBe(1235.27);
        expect(parseMontoCOP('$10.122')).toBe(10122);
    });

    it('el costo transaccional llega con punto decimal y sin miles (no es 7.000.00)', () => {
        expect(parseMontoCOP('7000.00')).toBe(7000);
        expect(parseMontoCOP('150.50')).toBe(150.5);
    });

    it('devuelve NaN si no es un monto', () => {
        expect(parseMontoCOP('abc')).toBeNaN();
        expect(parseMontoCOP('')).toBeNaN();
    });
});

describe('parseRappiCardEmail', () => {
    it('compra: monto, tarjeta, autorización, comercio y fecha', () => {
        const r = parseRappiCardEmail({ subject: 'RappiCard - Resumen de transacción', body: CUERPO_COMPRA });
        expect(r).toMatchObject({
            fuente: 'rappicard', tipo: 'compra', monto: 21000, ultimos4: '1625',
            autorizacion: '202692', comercio: 'Estacion de Servicio', fecha: '2026-10-28', hora: '07:24:02',
        });
        expect(r.huella).toBe('rappicard|compra|1625|202692');
    });

    it('compra: también sirve con el texto aplanado (snippet de Gmail)', () => {
        const r = parseRappiCardEmail({
            subject: 'RappiCard - Resumen de transacción',
            body: 'Realizaste una compra con tu RappiCard. Detalle de tu transacción: Monto $10.122 Método de pago *1625 No. de autorización 932455 Comercio MegaTiendas Fecha de la transacción 2026-10-26 13:15:21',
        });
        expect(r).toMatchObject({ tipo: 'compra', monto: 10122, comercio: 'MegaTiendas', fecha: '2026-10-26' });
    });

    it('avance: cuotas, tasas, costo transaccional y total; sin tarjeta', () => {
        const r = parseRappiCardEmail({ subject: '¡Tu Avance Digital está listo!', body: CUERPO_AVANCE });
        expect(r).toMatchObject({
            tipo: 'avance', monto: 50000, numeroCuotas: 2, tasaMensual: 2.11, tasaEA: 28.59,
            costoTransaccional: 7000, interesesTotales: 1235.27, totalAPagar: 51235.27,
            fecha: '2026-10-23', hora: '20:43', ultimos4: null,
        });
        expect(r.huella).toBe('rappicard|avance|2026-10-23 20:43|50000');
    });

    it('pago: lee la fecha con mes abreviado en español', () => {
        const r = parseRappiCardEmail({ subject: 'Comprobante de pago', body: CUERPO_PAGO });
        expect(r).toMatchObject({
            tipo: 'pago', monto: 1172324.98, ultimos4: '1625', fecha: '2026-10-01', hora: '13:53', metodoPago: 'PSE',
        });
    });

    it('ignora correos que no son movimientos (extracto, publicidad)', () => {
        expect(parseRappiCardEmail({ subject: '¡Llegó el extracto de tu RappiCard!', body: CUERPO_COMPRA })).toBeNull();
        expect(parseRappiCardEmail({ subject: '¿New York en la lista? Vuela a 0% de interés', body: 'Hola' })).toBeNull();
    });

    it('devuelve null si el asunto es de movimiento pero el cuerpo no se reconoce', () => {
        expect(parseRappiCardEmail({ subject: 'RappiCard - Resumen de transacción', body: 'cambió el formato' })).toBeNull();
        expect(parseRappiCardEmail({ subject: 'Comprobante de pago', body: '' })).toBeNull();
    });

    it('mes desconocido en un pago no inventa una fecha', () => {
        const body = CUERPO_PAGO.replace('01 oct 2026', '01 xyz 2026');
        expect(parseRappiCardEmail({ subject: 'Comprobante de pago', body })).toBeNull();
    });
});
