import { BudgetService } from './budget.service.js';

const currentMes = () => new Date().toISOString().slice(0, 7);

export const BudgetController = {
    getMonth: async (req, res, next) => {
        try {
            const mes = req.query.mes || currentMes();
            const data = await BudgetService.getMonth(req.user.id, mes);
            res.json(data);
        } catch (err) { next(err); }
    },

    getAvailableMonths: async (req, res, next) => {
        try {
            const months = await BudgetService.getAvailableMonths(req.user.id);
            res.json(months);
        } catch (err) { next(err); }
    },

    upsertCategory: async (req, res, next) => {
        try {
            const result = await BudgetService.upsertCategory(req.user.id, req.body);
            res.json(result);
        } catch (err) { next(err); }
    },

    deleteCategory: async (req, res, next) => {
        try {
            await BudgetService.deleteCategory(req.user.id, req.params.id);
            res.json({ ok: true });
        } catch (err) { next(err); }
    },

    addExpense: async (req, res, next) => {
        try {
            const result = await BudgetService.addExpense(req.user.id, req.body);
            res.json(result);
        } catch (err) { next(err); }
    },

    deleteExpense: async (req, res, next) => {
        try {
            await BudgetService.deleteExpense(req.user.id, req.params.id);
            res.json({ ok: true });
        } catch (err) { next(err); }
    },
};
