import { ActivityLogService } from './activityLog.service.js';

export const ActivityLogController = {
    getRecent: async (req, res, next) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 30, 50);
            const before = req.query.before || undefined;
            const logs = await ActivityLogService.getRecent(req.user.id, { limit, before });
            res.json(logs);
        } catch (err) {
            next(err);
        }
    },
};
