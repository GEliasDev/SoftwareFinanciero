import { Op } from 'sequelize';
import { CardInboxItem } from './cardInboxItem.model.js';
import { GmailConnection } from './gmailConnection.model.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import { decryptToken } from './gmailToken.js';
import { getAccessToken, listMessageIds, getMessage } from './gmailApi.js';
import { FUENTES, consultaGmail, parseCorreo } from './parsers/index.js';
import { CreditCardService } from '../creditCard/creditCard.service.js';
import { approveSchema } from './cardInbox.schema.js';
import { AppError } from '../../middlewares/appError.js';
import logger from '../../utils/logger.js';

const DIA_MS = 24 * 60 * 60 * 1000;
const PRIMERA_LECTURA_DIAS = 30;

// Tarjeta del usuario a la que pertenece el movimiento: por últimos 4 dígitos. Si el
// correo no los trae (avance de RappiCard, pagos de Guama) o no coinciden (una misma
// RappiCard tiene número físico y digital, ej. *1625 y *7583) y el usuario tiene UNA sola
// tarjeta de esa entidad, esa. Si hay duda se deja sin asignar para que el usuario elija al aprobar.
export const resolverTarjeta = (cards, mov) => {
    const exacta = mov.ultimos4 ? cards.find(c => c.ultimos4 === mov.ultimos4 || c.ultimos4Fisica === mov.ultimos4) : null;
    if (exacta) return exacta.id;
    const entidad = FUENTES.find(f => f.fuente === mov.fuente)?.entidad ?? /rappi/i;
    const candidatas = cards.filter(c => entidad.test(`${c.nombre} ${c.entidad}`));
    return candidatas.length === 1 ? candidatas[0].id : null;
};

export const CardInboxService = {
    // Lee los correos nuevos de los bancos configurados (parsers/index.js) y crea los pendientes.
    syncUser: async (userId) => {
        const conn = await GmailConnection.findOne({ where: { userId } });
        if (!conn) return { nuevos: 0, revisados: 0 };

        const accessToken = await getAccessToken(decryptToken(conn.refreshToken));
        const inicio = conn.lastSyncAt ? new Date(conn.lastSyncAt.getTime() - DIA_MS) : new Date(Date.now() - PRIMERA_LECTURA_DIAS * DIA_MS);
        const ids = await listMessageIds(accessToken, `(${consultaGmail()}) after:${Math.floor(inicio.getTime() / 1000)}`, 200);

        const cards = await CreditCard.findAll({ where: { userId, status: 'activa' }, attributes: ['id', 'nombre', 'entidad', 'ultimos4', 'ultimos4Fisica'] });
        // Pendientes que quedaron sin tarjeta (p. ej. antes de cargar los últimos 4): reintentar.
        const sinTarjeta = await CardInboxItem.findAll({ where: { userId, status: 'pendiente', creditCardId: null } });
        for (const item of sinTarjeta) {
            const creditCardId = resolverTarjeta(cards, item);
            if (creditCardId) await item.update({ creditCardId });
        }

        const yaLeidos = new Set((await CardInboxItem.findAll({
            where: { userId, gmailMessageId: { [Op.in]: ids } }, attributes: ['gmailMessageId'],
        })).map(i => i.gmailMessageId));

        let nuevos = 0;
        for (const id of ids.filter(i => !yaLeidos.has(i))) {
            const msg = await getMessage(accessToken, id);
            let mov = null;
            for (const body of msg.texts) {
                mov = parseCorreo({ from: msg.from, subject: msg.subject, body });
                if (mov) break;
            }
            if (!mov) continue; // extracto, publicidad, etc.

            const [, creado] = await CardInboxItem.findOrCreate({
                where: { userId, huella: mov.huella },
                defaults: {
                    userId, creditCardId: resolverTarjeta(cards, mov), fuente: mov.fuente, tipo: mov.tipo, monto: mov.monto,
                    ultimos4: mov.ultimos4, comercio: mov.comercio ?? null, fechaMovimiento: mov.fecha, horaMovimiento: mov.hora,
                    numeroCuotas: mov.numeroCuotas ?? null, gmailMessageId: id, status: 'pendiente',
                    detalle: {
                        autorizacion: mov.autorizacion, tasaMensual: mov.tasaMensual, tasaEA: mov.tasaEA,
                        costoTransaccional: mov.costoTransaccional, interesesTotales: mov.interesesTotales,
                        totalAPagar: mov.totalAPagar, metodoPago: mov.metodoPago,
                    },
                },
            });
            if (creado) nuevos += 1;
        }

        await conn.update({ lastSyncAt: new Date() });
        logger.info(`[cardInbox] Usuario ${userId}: ${ids.length} correo(s) revisados, ${nuevos} movimiento(s) nuevo(s)`);
        return { nuevos, revisados: ids.length };
    },

    syncAll: async () => {
        const conexiones = await GmailConnection.findAll({ attributes: ['userId'] });
        for (const { userId } of conexiones) {
            try {
                await CardInboxService.syncUser(userId);
            } catch (err) {
                logger.error(`[cardInbox] Usuario ${userId}: ${err.message}`);
            }
        }
    },

    findOwnedPending: async (userId, id) => {
        const item = await CardInboxItem.findByPk(id);
        if (!item) throw new AppError('Movimiento no encontrado', 404);
        if (item.userId !== userId) throw new AppError('No autorizado', 403);
        if (item.status !== 'pendiente') throw new AppError('Este movimiento ya fue procesado', 400);
        return item;
    },

    // Convierte el pendiente en una compra o avance real por el flujo normal de tarjetas
    // (descuenta cupo, calcula cuotas e intereses). Los pagos no se aprueban: solo se descartan.
    approve: async (userId, id, data) => {
        const item = await CardInboxService.findOwnedPending(userId, id);
        if (item.tipo === 'pago') throw new AppError('Los pagos son informativos: márcalos como vistos', 400);

        const ajustes = approveSchema.parse(data ?? {});
        const creditCardId = ajustes.creditCardId ?? item.creditCardId;
        if (!creditCardId) throw new AppError('Elige la tarjeta a la que pertenece el movimiento', 400);

        const base = { montoTotal: Number(item.monto), fechaCompra: item.fechaMovimiento };
        let creado;
        if (item.tipo === 'avance') {
            const { avance } = await CreditCardService.createAdvance(creditCardId, {
                ...base, descripcion: ajustes.descripcion ?? 'Avance digital RappiCard', numeroCuotas: item.numeroCuotas ?? 1,
            }, userId, false);
            creado = avance;
        } else {
            creado = await CreditCardService.createPurchase(creditCardId, {
                ...base,
                descripcion: ajustes.descripcion ?? item.comercio ?? 'Compra RappiCard',
                numeroCuotas: ajustes.numeroCuotas ?? item.numeroCuotas ?? 1,
                categoria: ajustes.categoria ?? 'otros',
            }, userId, false);
        }

        await item.update({ status: 'aprobado', creditCardId, purchaseId: creado.id });
        return item;
    },

    discard: async (userId, id) => {
        const item = await CardInboxService.findOwnedPending(userId, id);
        return item.update({ status: 'descartado' });
    },

    list: async (userId, status = 'pendiente') => CardInboxItem.findAll({
        where: { userId, status },
        include: [{ model: CreditCard, attributes: ['id', 'nombre', 'entidad', 'ultimos4'] }],
        order: [['fechaMovimiento', 'DESC'], ['horaMovimiento', 'DESC']],
    }),
};
