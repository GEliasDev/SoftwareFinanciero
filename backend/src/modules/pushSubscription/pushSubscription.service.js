import webpush from 'web-push';
import { PushSubscription } from './pushSubscription.model.js';
import { AppError } from '../../middlewares/appError.js';
import logger from '../../utils/logger.js';

// Las notificaciones push son OPCIONALES: sin llaves VAPID la app debe seguir
// funcionando. `setVapidDetails` lanza si las llaves faltan y, al llamarse en el
// nivel del módulo, el import fallaba y el servidor entero no arrancaba.
const pushEnabled = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (pushEnabled) {
    webpush.setVapidDetails(
        'mailto:debti@app.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
    );
} else {
    logger.warn('[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas: notificaciones push deshabilitadas');
}

export const PushSubscriptionService = {
    isEnabled: () => pushEnabled,

    subscribe: async (userId, body) => {
        // Validación explícita: sin esto, un body malformado reventaba con
        // TypeError (500) en vez de devolver un 400 claro.
        const endpoint = body?.endpoint;
        const p256dh = body?.keys?.p256dh;
        const auth = body?.keys?.auth;
        if (typeof endpoint !== 'string' || !endpoint || !p256dh || !auth) {
            throw new AppError('Suscripción push inválida: faltan endpoint o keys', 400);
        }

        await PushSubscription.upsert({
            userId,
            endpoint,
            p256dh,
            auth,
        }, { conflictFields: ['endpoint'] });
    },

    // Scoped al usuario de la sesión: borrar solo por endpoint permitía a
    // cualquier usuario autenticado eliminar la suscripción de OTRO si conocía
    // su endpoint (mismo principio que el export: nunca confiar en un id del body).
    unsubscribe: async (userId, endpoint) => {
        if (!endpoint) throw new AppError('Endpoint requerido', 400);
        return PushSubscription.destroy({ where: { userId, endpoint } });
    },

    sendToUser: async (userId, title, body, url = '/') => {
        if (!pushEnabled) return;
        const subs = await PushSubscription.findAll({ where: { userId } });
        const payload = JSON.stringify({ title, body, url });
        await Promise.allSettled(
            subs.map(s =>
                webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                    payload,
                ).catch(async (err) => {
                    // Suscripción expirada o inválida — limpiar
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await PushSubscription.destroy({ where: { endpoint: s.endpoint } });
                    }
                })
            )
        );
    },

    getVapidPublicKey: () => process.env.VAPID_PUBLIC_KEY ?? null,
};
