import { Subscription } from './subscription.model.js';
import { subscriptionCreateSchema, subscriptionUpdateSchema } from './subscription.schema.js';
import { calcularMontoMensual, calcularTotalAnual } from './utils/subscriptionCalculation.js';
import { AppError } from '../../middlewares/appError.js';
import { ActivityLogService } from '../activityLog/activityLog.service.js';
import { ReminderService } from '../reminder/reminder.service.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import logger from '../../utils/logger.js';

const assertCardOwnership = async (creditCardId, userId) => {
    if (!creditCardId) return;
    const card = await CreditCard.findByPk(creditCardId);
    if (!card || card.userId !== userId) throw new AppError('Tarjeta de crédito no encontrada', 404);
    if (card.status !== 'activa') throw new AppError('La tarjeta debe estar activa para cobrar la suscripción', 400);
};

export const SubscriptionService = {
    createSubscription: async (data) => {
        const parsed = subscriptionCreateSchema.parse(data);
        await assertCardOwnership(parsed.creditCardId, data.userId);
        const montoMensual = calcularMontoMensual({
            monto: parsed.monto,
            frecuencia: parsed.frecuencia,
        });

        const sub = await Subscription.create({
            ...parsed,
            montoMensual,
            userId: data.userId,
        });
        ActivityLogService.log(data.userId, 'created', 'subscription', sub.nombre, { monto: montoMensual });
        try {
            await ReminderService.createReminder({
                userId: data.userId,
                debtType: 'subscription',
                debtId: sub.id,
                nombre: sub.nombre,
                diasAnticipacion: 3,
            });
        } catch (err) {
            logger.error(`No se pudo auto-crear recordatorio para suscripción ${sub.id}: ${err.message}`);
        }
        return sub;
    },

    getAllSubscriptions: async (userId) => {
        return Subscription.findAll({ where: { userId }, include: [{ model: CreditCard, attributes: ['id', 'nombre', 'entidad'] }] });
    },

    getSubscriptionById: async (id, userId, isAdmin) => {
        const subscription = await Subscription.findByPk(id, { include: [{ model: CreditCard, attributes: ['id', 'nombre', 'entidad'] }] });
        if (!subscription) throw new AppError('Suscripción no encontrada', 404);
        if (!isAdmin && subscription.userId !== userId) {
            throw new AppError('Acceso no autorizado a suscripción', 403);
        }
        return subscription;
    },

    updateSubscription: async (id, data, userId, isAdmin) => {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) throw new AppError('Suscripción no encontrada', 404);
        if (!isAdmin && subscription.userId !== userId) {
            throw new AppError('Acceso no autorizado a suscripción', 403);
        }
        const parsed = subscriptionUpdateSchema.parse(data);
        if (parsed.creditCardId !== undefined) await assertCardOwnership(parsed.creditCardId, subscription.userId);
        return subscription.update(parsed);
    },

    deleteSubscription: async (id, userId, isAdmin) => {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) throw new AppError('Suscripción no encontrada', 404);
        if (!isAdmin && subscription.userId !== userId) {
            throw new AppError('Acceso no autorizado a suscripción', 403);
        }
        ActivityLogService.log(userId, 'deleted', 'subscription', subscription.nombre);
        return subscription.destroy();
    },

    // Resumen de todas las suscripciones activas del usuario
    getSummary: async (userId) => {
        const subscriptions = await Subscription.findAll({
            where: { userId, status: 'activa' },
        });

        const totalMensual = subscriptions.reduce(
            (acc, s) => acc + parseFloat(s.montoMensual),
            0
        );

        // Agrupar por moneda para no mezclar COP, USD, EUR
        const porMoneda = subscriptions.reduce((acc, s) => {
            if (!acc[s.moneda]) acc[s.moneda] = { totalMensual: 0, totalAnual: 0, items: [] };
            acc[s.moneda].totalMensual += parseFloat(s.montoMensual);
            acc[s.moneda].totalAnual += calcularTotalAnual({
                monto: parseFloat(s.monto),
                frecuencia: s.frecuencia,
            });
            acc[s.moneda].items.push(s);
            return acc;
        }, {});

        return {
            totalSuscripciones: subscriptions.length,
            porMoneda,
        };
    },
};