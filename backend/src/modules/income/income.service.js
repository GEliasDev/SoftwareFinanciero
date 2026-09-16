import { Income } from './income.model.js';
import { incomeCreateSchema, incomeUpdateSchema } from './income.schema.js';
import { AppError } from '../../middlewares/appError.js';

export const IncomeService = {
    getAll: async (userId) => Income.findAll({ where: { userId } }),

    getById: async (id, userId) => {
        const income = await Income.findByPk(id);
        if (!income) throw new AppError('Ingreso no encontrado', 404);
        if (income.userId !== userId) throw new AppError('No autorizado', 403);
        return income;
    },

    create: async (data) => {
        const parsed = incomeCreateSchema.parse(data);
        const income = await Income.create({ ...parsed, userId: data.userId });
        return income;
    },

    update: async (id, data, userId) => {
        const income = await Income.findByPk(id);
        if (!income) throw new AppError('Ingreso no encontrado', 404);
        if (income.userId !== userId) throw new AppError('No autorizado', 403);
        const parsed = incomeUpdateSchema.parse(data);
        return income.update(parsed);
    },

    delete: async (id, userId) => {
        const income = await Income.findByPk(id);
        if (!income) throw new AppError('Ingreso no encontrado', 404);
        if (income.userId !== userId) throw new AppError('No autorizado', 403);
        await income.destroy();
    },
};
