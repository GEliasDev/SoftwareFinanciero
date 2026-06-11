import { Op } from 'sequelize';
import { Budget, BudgetExpense } from './budget.model.js';
import { budgetCategorySchema, budgetExpenseSchema } from './budget.schema.js';
import { AppError } from '../../middlewares/appError.js';

export const BudgetService = {
    getMonth: async (userId, mes) => {
        const [categories, expenses] = await Promise.all([
            Budget.findAll({ where: { userId, mes }, order: [['categoria', 'ASC']] }),
            BudgetExpense.findAll({ where: { userId, mes }, order: [['fecha', 'DESC']] }),
        ]);

        const gastadoPorCategoria = {};
        for (const e of expenses) {
            gastadoPorCategoria[e.categoria] = (gastadoPorCategoria[e.categoria] || 0) + parseFloat(e.monto);
        }

        return {
            mes,
            categories: categories.map(c => ({
                id: c.id,
                categoria: c.categoria,
                limite: parseFloat(c.limite),
                gastado: gastadoPorCategoria[c.categoria] || 0,
                color: c.color,
            })),
            expenses,
        };
    },

    upsertCategory: async (userId, data) => {
        const parsed = budgetCategorySchema.parse(data);
        const existing = await Budget.findOne({ where: { userId, mes: parsed.mes, categoria: parsed.categoria } });
        if (existing) {
            await existing.update({ limite: parsed.limite, color: parsed.color ?? existing.color });
            return existing;
        }
        return Budget.create({ userId, ...parsed });
    },

    deleteCategory: async (userId, id) => {
        const cat = await Budget.findByPk(id);
        if (!cat) throw new AppError('Categoría no encontrada', 404);
        if (cat.userId !== userId) throw new AppError('No autorizado', 403);
        // Also delete expenses for that category/month
        await BudgetExpense.destroy({ where: { userId, mes: cat.mes, categoria: cat.categoria } });
        await cat.destroy();
    },

    addExpense: async (userId, data) => {
        const parsed = budgetExpenseSchema.parse(data);
        return BudgetExpense.create({ userId, ...parsed });
    },

    deleteExpense: async (userId, id) => {
        const exp = await BudgetExpense.findByPk(id);
        if (!exp) throw new AppError('Gasto no encontrado', 404);
        if (exp.userId !== userId) throw new AppError('No autorizado', 403);
        await exp.destroy();
    },

    getAvailableMonths: async (userId) => {
        const rows = await Budget.findAll({
            where: { userId },
            attributes: ['mes'],
            group: ['mes'],
            order: [['mes', 'DESC']],
        });
        return rows.map(r => r.mes);
    },
};
