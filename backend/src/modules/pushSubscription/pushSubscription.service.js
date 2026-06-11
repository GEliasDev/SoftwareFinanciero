import webpush from 'web-push';
import { PushSubscription } from './pushSubscription.model.js';

webpush.setVapidDetails(
    'mailto:debti@app.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
);

export const PushSubscriptionService = {
    subscribe: async (userId, { endpoint, keys }) => {
        await PushSubscription.upsert({
            userId,
            endpoint,
            p256dh: keys.p256dh,
            auth:   keys.auth,
        }, { conflictFields: ['endpoint'] });
    },

    unsubscribe: async (endpoint) => {
        await PushSubscription.destroy({ where: { endpoint } });
    },

    sendToUser: async (userId, title, body, url = '/') => {
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

    getVapidPublicKey: () => process.env.VAPID_PUBLIC_KEY,
};
