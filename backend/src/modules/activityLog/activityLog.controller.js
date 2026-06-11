import { ActivityLogService } from './activityLog.service.js';

export const ActivityLogController = {
    getRecent: async (req, res, next) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 30, 50);
            const logs = await ActivityLogService.getRecent(req.user.id, limit);
            res.json(logs);
        } catch (err) {
            next(err);
        }
    },
};
