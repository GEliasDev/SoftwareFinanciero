import { ActivityLog } from './activityLog.model.js';

export const ActivityLogService = {
    log: async (userId, action, entityType, entityName, meta = null) => {
        try {
            await ActivityLog.create({ userId, action, entityType, entityName, meta });
        } catch {
            // No bloquear la operación principal si falla el log
        }
    },

    getRecent: async (userId, limit = 30) => {
        return ActivityLog.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit,
        });
    },
};
