import { Op } from 'sequelize';
import { CardInboxItem } from './cardInboxItem.model.js';
import { GmailConnection } from './gmailConnection.model.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import { decryptToken } from './gmailToken.js';
import { getAccessToken, listMessageIds, getMessage } from './gmailApi.js';
import { parseRappiCardEmail, REMITENTE_RAPPICARD } from './parsers/rappicard.parser.js';
import logger from '../../utils/logger.js';

const DIA_MS = 24 * 60 * 60 * 1000;
const PRIMERA_LECTURA_DIAS = 30;

// Tarjeta del usuario a la que pertenece el movimiento: por últimos 4 dígitos. Si el
// correo no los trae (avance de RappiCard) o no coinciden (una misma RappiCard tiene
// número físico y digital, ej. *1625 y *7583) y el usuario tiene UNA sola tarjeta de esa
// entidad, esa. Si hay duda se deja sin asignar para que el usuario elija al aprobar.
export const resolverTarjeta = (cards, mov) => {
    const exacta = mov.ultimos4 ? cards.find(c => c.ultimos4 === mov.ultimos4) : null;
    if (exacta) return exacta.id;
    const candidatas = cards.filter(c => /rappi/i.test(`${c.nombre} ${c.entidad}`));
    return candidatas.length === 1 ? candidatas[0].id : null;
};

export const CardInboxService = {
    // Lee los correos nuevos del remitente de RappiCard y crea los pendientes.
    syncUser: async (userId) => {
        const conn = await GmailConnection.findOne({ where: { userId } });
        if (!conn) return { nuevos: 0, revisados: 0 };

        const accessToken = await getAccessToken(decryptToken(conn.refreshToken));
        const inicio = conn.lastSyncAt ? new Date(conn.lastSyncAt.getTime() - DIA_MS) : new Date(Date.now() - PRIMERA_LECTURA_DIAS * DIA_MS);
        const ids = await listMessageIds(accessToken, `from:${REMITENTE_RAPPICARD} after:${Math.floor(inicio.getTime() / 1000)}`);

        const cards = await CreditCard.findAll({ where: { userId, status: 'activa' }, attributes: ['id', 'nombre', 'entidad', 'ultimos4'] });
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
                mov = parseRappiCardEmail({ subject: msg.subject, body });
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

    list: async (userId, status = 'pendiente') => CardInboxItem.findAll({
        where: { userId, status },
        include: [{ model: CreditCard, attributes: ['id', 'nombre', 'entidad', 'ultimos4'] }],
        order: [['fechaMovimiento', 'DESC'], ['horaMovimiento', 'DESC']],
    }),
};
