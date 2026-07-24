import { PushSubscriptionService } from './pushSubscription.service.js';

export const PushSubscriptionController = {
    getVapidKey: (req, res) => {
        res.json({ publicKey: PushSubscriptionService.getVapidPublicKey() });
    },

    subscribe: async (req, res, next) => {
        try {
            await PushSubscriptionService.subscribe(req.user.id, req.body);
            res.json({ ok: true });
        } catch (err) { next(err); }
    },

    unsubscribe: async (req, res, next) => {
        try {
            // Siempre el userId de la sesión, nunca un id del body.
            await PushSubscriptionService.unsubscribe(req.user.id, req.body?.endpoint);
            res.json({ ok: true });
        } catch (err) { next(err); }
    },
};
