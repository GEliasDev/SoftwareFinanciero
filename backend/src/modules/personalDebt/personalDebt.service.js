import { PersonalDebt } from './personalDebt.model.js';
import { personalDebtCreateSchema, personalDebtUpdateSchema, abonoSchema } from './personalDebt.schema.js';
import { AppError } from '../../middlewares/appError.js';

export const PersonalDebtService = {
    getAll: async (userId) => PersonalDebt.findAll({ where: { userId } }),

    getById: async (id, userId) => {
        const debt = await PersonalDebt.findByPk(id);
        if (!debt) throw new AppError('Obligación no encontrada', 404);
        if (debt.userId !== userId) throw new AppError('No autorizado', 403);
        return debt;
    },

    create: async (data) => {
        const parsed = personalDebtCreateSchema.parse(data);
        const numeroCuotas = Math.ceil(parsed.montoTotal / parsed.montoCuota);
        const saldoPendiente = Math.max(0, parsed.montoTotal - parsed.cuotasPagadas * parsed.montoCuota);
        return PersonalDebt.create({ ...parsed, numeroCuotas, saldoPendiente, userId: data.userId });
    },

    update: async (id, data, userId) => {
        const debt = await PersonalDebt.findByPk(id);
        if (!debt) throw new AppError('Obligación no encontrada', 404);
        if (debt.userId !== userId) throw new AppError('No autorizado', 403);
        return debt.update(personalDebtUpdateSchema.parse(data));
    },

    delete: async (id, userId) => {
        const debt = await PersonalDebt.findByPk(id);
        if (!debt) throw new AppError('Obligación no encontrada', 404);
        if (debt.userId !== userId) throw new AppError('No autorizado', 403);
        await debt.destroy();
    },

    registerAbono: async (id, data, userId) => {
        const { monto } = abonoSchema.parse(data);
        const debt = await PersonalDebt.findByPk(id);
        if (!debt) throw new AppError('Obligación no encontrada', 404);
        if (debt.userId !== userId) throw new AppError('No autorizado', 403);
        if (debt.status === 'pagado') throw new AppError('Esta obligación ya está pagada', 400);

        const nuevoSaldo = Math.max(0, parseFloat(debt.saldoPendiente) - monto);
        const nuevoStatus = nuevoSaldo <= 0 ? 'pagado' : 'activo';
        return debt.update({ saldoPendiente: nuevoSaldo, cuotasPagadas: debt.cuotasPagadas + 1, status: nuevoStatus });
    },
};
