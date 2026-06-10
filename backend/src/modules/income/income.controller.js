import { IncomeService } from './income.service.js';

export const IncomeController = {
    getAll: async (req, res, next) => {
        try { res.json(await IncomeService.getAll(req.user.id)); }
        catch (err) { next(err); }
    },
    getById: async (req, res, next) => {
        try { res.json(await IncomeService.getById(req.params.id, req.user.id)); }
        catch (err) { next(err); }
    },
    create: async (req, res, next) => {
        try { res.status(201).json(await IncomeService.create({ ...req.body, userId: req.user.id })); }
        catch (err) { next(err); }
    },
    update: async (req, res, next) => {
        try { res.json(await IncomeService.update(req.params.id, req.body, req.user.id)); }
        catch (err) { next(err); }
    },
    delete: async (req, res, next) => {
        try { await IncomeService.delete(req.params.id, req.user.id); res.status(204).send(); }
        catch (err) { next(err); }
    },
};
