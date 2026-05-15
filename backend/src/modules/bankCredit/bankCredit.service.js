import { BankCredit } from './bankCredit.model.js';
import { bankCreditCreateSchema, bankCreditUpdateSchema } from './bankCredit.schema.js';
import { bankCreditCalculation } from './utils/bankCreditCalculation.js';
import { AppError } from '../../middlewares/AppError.js';

export const BankCreditService = {
    createBankCredit: async (data) => {
        const parsed = bankCreditCreateSchema.parse(data);
        const calculos = bankCreditCalculation(parsed);

        return BankCredit.create({
            ...parsed,
            ...calculos,
            status: 'activo',
            userId: data.userId,
        });
    },

    getAllBankCredits: async (userId) => {
        return BankCredit.findAll({ where: { userId } });
    },

    getBankCreditById: async (id) => {
        const credit = await BankCredit.findByPk(id);
        if (!credit) throw new AppError('Crédito bancario no encontrado', 404);
        return credit;
    },

    updateBankCredit: async (id, data) => {
        const credit = await BankCredit.findByPk(id);
        if (!credit) throw new AppError('Crédito bancario no encontrado', 404);
        const parsed = bankCreditUpdateSchema.parse(data);
        return credit.update(parsed);
    },

    // Registrar una cuota pagada y recalcular saldo pendiente
    registerPayment: async (id) => {
        const credit = await BankCredit.findByPk(id);
        if (!credit) throw new AppError('Crédito bancario no encontrado', 404);

        if (credit.status === 'pagado') {
            throw new AppError('Este crédito ya está completamente pagado', 400);
        }

        const nuevasCuotasPagadas = credit.cuotasPagadas + 1;
        const cuotasRestantes = credit.numeroCuotas - nuevasCuotasPagadas;
        const nuevoSaldo = parseFloat((credit.valorCuota * cuotasRestantes).toFixed(2));
        const nuevoStatus = cuotasRestantes === 0 ? 'pagado' : credit.status;

        return credit.update({
            cuotasPagadas: nuevasCuotasPagadas,
            saldoPendiente: nuevoSaldo,
            status: nuevoStatus,
        });
    },

    deleteBankCredit: async (id) => {
        const credit = await BankCredit.findByPk(id);
        if (!credit) throw new AppError('Crédito bancario no encontrado', 404);
        return credit.destroy();
    },
};