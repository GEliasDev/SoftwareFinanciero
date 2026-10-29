import { PersonalDebt } from './personalDebt.model.js';
import { personalDebtCreateSchema, personalDebtUpdateSchema } from './personalDebt.schema.js';
import { AppError } from '../../middlewares/appError.js';

// El módulo se presenta como "Compromisos fijos". El tipo 'deuda' (préstamo
// informal con saldo) se retiró: las filas viejas siguen en la BD pero ya no
// se listan ni cuentan en ningún cálculo — solo existen compromisos mensuales.
export const PersonalDebtService = {
    getAll: async (userId) => PersonalDebt.findAll({ where: { userId, tipo: 'gasto' } }),

    getById: async (id, userId) => {
        const debt = await PersonalDebt.findOne({ where: { id, tipo: 'gasto' } });
        if (!debt) throw new AppError('Compromiso no encontrado', 404);
        if (debt.userId !== userId) throw new AppError('No autorizado', 403);
        return debt;
    },

    create: async (data) => {
        const parsed = personalDebtCreateSchema.parse(data);

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
            categoria:      parsed.categoria ?? null,
            userId:         data.userId,
        });
    },

    update: async (id, data, userId) => {
        const debt = await PersonalDebtService.getById(id, userId);
        return debt.update(personalDebtUpdateSchema.parse(data));
    },

    delete: async (id, userId) => {
        const debt = await PersonalDebtService.getById(id, userId);
        await debt.destroy();
    },
};
