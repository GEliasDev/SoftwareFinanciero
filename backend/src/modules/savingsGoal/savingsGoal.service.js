import { SavingsGoal } from './savingsGoal.model.js';
import { savingsGoalCreateSchema, savingsGoalUpdateSchema, aporteSchema } from './savingsGoal.schema.js';
import { AppError } from '../../middlewares/appError.js';

export const SavingsGoalService = {
    getAll: async (userId) => SavingsGoal.findAll({ where: { userId } }),

    getById: async (id, userId) => {
        const goal = await SavingsGoal.findByPk(id);
        if (!goal) throw new AppError('Meta no encontrada', 404);
        if (goal.userId !== userId) throw new AppError('No autorizado', 403);
        return goal;
    },

    create: async (data) => {
        const parsed = savingsGoalCreateSchema.parse(data);
        const status = parseFloat(String(parsed.montoAcumulado)) >= parseFloat(String(parsed.montoMeta)) ? 'completado' : 'activo';
        return SavingsGoal.create({ ...parsed, status, userId: data.userId });
    },

    update: async (id, data, userId) => {
        const goal = await SavingsGoal.findByPk(id);
        if (!goal) throw new AppError('Meta no encontrada', 404);
        if (goal.userId !== userId) throw new AppError('No autorizado', 403);
        return goal.update(savingsGoalUpdateSchema.parse(data));
    },

    delete: async (id, userId) => {
        const goal = await SavingsGoal.findByPk(id);
        if (!goal) throw new AppError('Meta no encontrada', 404);
        if (goal.userId !== userId) throw new AppError('No autorizado', 403);
        await goal.destroy();
    },

    registerAporte: async (id, data, userId) => {
        const { monto } = aporteSchema.parse(data);
        const goal = await SavingsGoal.findByPk(id);
        if (!goal) throw new AppError('Meta no encontrada', 404);
        if (goal.userId !== userId) throw new AppError('No autorizado', 403);
        if (goal.status === 'completado') throw new AppError('Esta meta ya está completada', 400);

        const nuevoAcumulado = parseFloat(String(goal.montoAcumulado)) + monto;
        const nuevoStatus = nuevoAcumulado >= parseFloat(String(goal.montoMeta)) ? 'completado' : goal.status;
        return goal.update({ montoAcumulado: nuevoAcumulado, status: nuevoStatus });
    },
};
