import { SubscriptionService } from './subscription.service.js';

export const SubscriptionController = {
    createSubscription: async (req, res, next) => {
        try {
            const subscription = await SubscriptionService.createSubscription({
                ...req.body,
                userId: req.user.id,
            });
            res.status(201).json(subscription);
        } catch (error) {
            next(error);
        }
    },

    getAllSubscriptions: async (req, res, next) => {
        try {
            const subscriptions = await SubscriptionService.getAllSubscriptions(req.user.id);
            res.json(subscriptions);
        } catch (error) {
            next(error);
        }
    },

    getSubscriptionById: async (req, res, next) => {
        try {
            const subscription = await SubscriptionService.getSubscriptionById(req.params.id);
            res.json(subscription);
        } catch (error) {
            next(error);
        }
    },

    updateSubscription: async (req, res, next) => {
        try {
            const subscription = await SubscriptionService.updateSubscription(
                req.params.id,
                req.body
            );
            res.json(subscription);
        } catch (error) {
            next(error);
        }
    },

    deleteSubscription: async (req, res, next) => {
        try {
            await SubscriptionService.deleteSubscription(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },

    getSummary: async (req, res, next) => {
        try {
            const summary = await SubscriptionService.getSummary(req.user.id);
            res.json(summary);
        } catch (error) {
            next(error);
        }
    },
};