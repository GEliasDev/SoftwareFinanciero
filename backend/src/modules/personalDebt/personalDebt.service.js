import { PersonalDebt } from './personalDebt.model.js';
import { PersonalDebtAbono } from './personalDebtAbono.model.js';
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

        if (parsed.tipo === 'gasto') {
            return PersonalDebt.create({
                tipo:           'gasto',
                nombre:         parsed.nombre,
                descripcion:    parsed.descripcion ?? null,
                prestamista:    null,
                montoTotal:     null,
                saldoPendiente: null,
                numeroCuotas:   null,
                montoCuota:     parsed.montoCuota,
                cuotasPagadas:  0,
                diaPago:        parsed.diaPago,
                userId:         data.userId,
            });
        }

        if (!parsed.montoTotal) throw new AppError('El monto total es obligatorio para deudas', 400);
        if (!parsed.prestamista) throw new AppError('El prestamista es obligatorio para deudas', 400);

        return PersonalDebt.create({
            tipo:           'deuda',
            nombre:         parsed.nombre,
            descripcion:    parsed.descripcion ?? null,
            prestamista:    parsed.prestamista,
            montoTotal:     parsed.montoTotal,
            saldoPendiente: parsed.montoTotal,
            numeroCuotas:   null,
            montoCuota:     null,
            cuotasPagadas:  0,
            diaPago:        1,
            userId:         data.userId,
        });
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
        await PersonalDebtAbono.destroy({ where: { personalDebtId: id } });
        await debt.destroy();
    },

    registerAbono: async (id, data, userId) => {
        const { monto, fecha } = abonoSchema.parse(data);
        const debt = await PersonalDebt.findByPk(id);
        if (!debt) throw new AppError('Obligación no encontrada', 404);
        if (debt.userId !== userId) throw new AppError('No autorizado', 403);
        if (debt.tipo === 'gasto') throw new AppError('Los gastos mensuales no admiten abonos', 400);
        if (debt.status === 'pagado') throw new AppError('Esta obligación ya está pagada', 400);

        const saldoAntes  = parseFloat(debt.saldoPendiente);
        const saldoDespues = Math.max(0, saldoAntes - monto);
        const nuevoStatus  = saldoDespues <= 0 ? 'pagado' : 'activo';

        await PersonalDebtAbono.create({
            personalDebtId: debt.id,
            userId,
            monto,
            saldoAntes,
            saldoDespues,
            fecha: fecha ?? new Date().toISOString().slice(0, 10),
        });

        return debt.update({ saldoPendiente: saldoDespues, status: nuevoStatus });
    },

    getAbonos: async (id, userId) => {
        const debt = await PersonalDebt.findByPk(id);
        if (!debt) throw new AppError('Obligación no encontrada', 404);
        if (debt.userId !== userId) throw new AppError('No autorizado', 403);
        return PersonalDebtAbono.findAll({
            where: { personalDebtId: id },
            order: [['createdAt', 'DESC']],
        });
    },
};
