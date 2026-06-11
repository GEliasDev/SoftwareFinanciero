import { SearchService } from './search.service.js';

export const SearchController = {
    search: async (req, res, next) => {
        try {
            const q = (req.query.q || '').trim();
            const results = await SearchService.search(req.user.id, q);
            res.json(results);
        } catch (err) {
            next(err);
        }
    },
};
