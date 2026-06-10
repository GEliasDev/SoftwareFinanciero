import { AnalyticsService } from './analytics.service.js';

export const AnalyticsController = {

    getSummary: async (req, res, next) => {
        try {
            const result = await AnalyticsService.getSummary(req.user.id);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },

    getMonthlyTrend: async (req, res, next) => {
        try {
            const months = Math.min(Math.max(parseInt(req.query.months) || 6, 1), 24);
            const result = await AnalyticsService.getMonthlyTrend(req.user.id, months);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },

    getDistribution: async (req, res, next) => {
        try {
            const result = await AnalyticsService.getDistribution(req.user.id);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },
};
