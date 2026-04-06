import { Subscription } from './subscription.model.js';
import { subscriptionCreateSchema, subscriptionUpdateSchema } from './subscription.schema.js';
import { calcularMontoMensual, calcularTotalAnual } from './utils/subscriptionCalculation.js';
import { AppError } from '../../middlewares/appError.js';

export const SubscriptionService = {
    createSubscription: async (data) => {
        const parsed = subscriptionCreateSchema.parse(data);
        const montoMensual = calcularMontoMensual({
            monto: parsed.monto,
            frecuencia: parsed.frecuencia,
        });

        return Subscription.create({
            ...parsed,
            montoMensual,
            userId: data.userId,
        });
    },

    getAllSubscriptions: async (userId) => {
        return Subscription.findAll({ where: { userId } });
    },

    getSubscriptionById: async (id) => {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) throw new AppError('Suscripción no encontrada', 404);
        return subscription;
    },

    updateSubscription: async (id, data) => {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) throw new AppError('Suscripción no encontrada', 404);
        const parsed = subscriptionUpdateSchema.parse(data);
        return subscription.update(parsed);
    },

    deleteSubscription: async (id) => {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) throw new AppError('Suscripción no encontrada', 404);
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