import { NetWorthService } from './netWorth.service.js';

export const NetWorthController = {
    getHistory: async (req, res, next) => {
        try {
            const history = await NetWorthService.getHistory(req.user.id);
            res.json(history);
        } catch (err) {
            next(err);
        }
    },
};
