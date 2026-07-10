import { Op } from 'sequelize';
import { ActivityLog } from './activityLog.model.js';

export const ActivityLogService = {
    log: async (userId, action, entityType, entityName, meta = null) => {
        try {
            await ActivityLog.create({ userId, action, entityType, entityName, meta });
        } catch {
            // No bloquear la operación principal si falla el log
        }
    },

    // `before`: paginación por cursor (createdAt del último registro visto).
    // Antes el frontend pedía un `limit` cada vez más grande para "Cargar
    // más", pero el controller lo topaba siempre en 50 — la respuesta era
    // idéntica en cada clic y nunca se podía ver nada más viejo.
    getRecent: async (userId, { limit = 30, before } = {}) => {
        const where = { userId };
        if (before) where.createdAt = { [Op.lt]: new Date(before) };
        return ActivityLog.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
        });
    },
};
