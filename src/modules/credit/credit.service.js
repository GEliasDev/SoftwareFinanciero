import { Credit } from './Credit.model.js';
import { CreditCreateSchema } from './credit.schema.js';
import { creditCalculation } from './utils/creditCalculation.js';

export const CreditService = {
    createCredit: async (data) => {
        const parsed = CreditCreateSchema.parse(data);
        const calculos = creditCalculation(parsed);

        return Credit.create({
            ...parsed,
            ...calculos,
            status: 'Activo',
            userId: data.userId,
        });
    },

    getAllCredits: async (userId) => Credit.findAll({ where: { userId } }),

    getCreditById: async (id) => Credit.findByPk(id),

    updateCredit: async (id, data) => {
        const credit = await Credit.findByPk(id);
        if (!credit) throw new Error('Credit not found');
        const parsed = CreditCreateSchema.partial().parse(data);
        return credit.update(parsed);
    },

    deleteCredit: async (id) => {
        const credit = await Credit.findByPk(id);
        if (!credit) throw new Error('Credit not found');
        return credit.destroy();
    },
};
