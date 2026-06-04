import { BankCredit } from './bankCredit.model.js';
import { bankCreditCreateSchema, bankCreditUpdateSchema } from './bankCredit.schema.js';
import { bankCreditCalculation } from './utils/bankCreditCalculation.js';
import { AppError } from '../../middlewares/appError.js';

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

    getBankCreditById: async (id, userId) => {
        const credit = await BankCredit.findByPk(id);
        if (!credit) throw new AppError('Crédito bancario no encontrado', 404);
        if (credit.userId !== userId) throw new AppError('No autorizado', 403);
        return credit;
    },

    updateBankCredit: async (id, data, userId) => {
        const credit = await BankCredit.findByPk(id);
        if (!credit) throw new AppError('Crédito bancario no encontrado', 404);
        if (credit.userId !== userId) throw new AppError('No autorizado', 403);
        const parsed = bankCreditUpdateSchema.parse(data);
        return credit.update(parsed);
    },

    // Registrar una cuota pagada y recalcular saldo pendiente
    registerPayment: async (id, userId) => {
        const credit = await BankCredit.findByPk(id);
        if (!credit) throw new AppError('Crédito bancario no encontrado', 404);
        if (credit.userId !== userId) throw new AppError('No autorizado', 403);

        if (credit.status === 'pagado') {
            throw new AppError('Este crédito ya está completamente pagado', 400);
        }

        const nuevasCuotasPagadas = credit.cuotasPagadas + 1;
        const cuotasRestantes = credit.numeroCuotas - nuevasCuotasPagadas;

        // Recalcular saldo de capital real por amortización francesa
        const i = parseFloat(credit.tasaMensual) / 100;
        const cuota = parseFloat(credit.valorCuota);
        let saldo = parseFloat(credit.montoTotal);
        for (let k = 0; k < nuevasCuotasPagadas; k++) {
            const interes = saldo * i;
            saldo = Math.max(0, saldo - (cuota - interes));
        }
        const nuevoSaldo = parseFloat(saldo.toFixed(2));

        let nuevoStatus;
        if (cuotasRestantes === 0) {
            nuevoStatus = 'pagado';
        } else if (credit.status === 'en_mora') {
            nuevoStatus = 'activo'; // pago registrado, sale de mora
        } else {
            nuevoStatus = credit.status;
        }

        return credit.update({
            cuotasPagadas: nuevasCuotasPagadas,
            saldoPendiente: nuevoSaldo,
            status: nuevoStatus,
        });
    },

    deleteBankCredit: async (id, userId) => {
        const credit = await BankCredit.findByPk(id);
        if (!credit) throw new AppError('Crédito bancario no encontrado', 404);
        if (credit.userId !== userId) throw new AppError('No autorizado', 403);
        return credit.destroy();
    },
};