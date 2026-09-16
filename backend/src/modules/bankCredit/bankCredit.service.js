import { BankCredit } from './bankCredit.model.js';
import { bankCreditCreateSchema, bankCreditUpdateSchema } from './bankCredit.schema.js';
import { bankCreditCalculation } from './utils/bankCreditCalculation.js';
import { AppError } from '../../middlewares/appError.js';

export const BankCreditService = {
    createBankCredit: async (data) => {
        const parsed = bankCreditCreateSchema.parse(data);

        if (parsed.cuotasPagadas >= parsed.numeroCuotas) {
            throw new AppError('Las cuotas ya pagadas deben ser menores al total de cuotas', 400);
        }

        const calculos = bankCreditCalculation(parsed);

        // Si el crédito ya tiene cuotas pagadas, recalcular saldo inicial real
        let saldoPendiente = parseFloat(calculos.saldoPendiente);
        if (parsed.cuotasPagadas > 0) {
            const i = parseFloat(calculos.tasaMensual) / 100;
            const cuotaBase = parseFloat(calculos.valorCuota)
                - (parsed.cuotaAdministracion || 0)
                - (parsed.seguro || 0);
            let saldo = parseFloat(parsed.montoTotal);
            for (let k = 0; k < parsed.cuotasPagadas; k++) {
                const interes = saldo * i;
                saldo = Math.max(0, saldo - (cuotaBase - interes));
            }
            saldoPendiente = parseFloat(saldo.toFixed(2));
        }

        const credit = await BankCredit.create({
            ...parsed,
            ...calculos,
            saldoPendiente,
            status: 'activo',
            userId: data.userId,
        });
        return credit;
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

        const updates = { ...parsed };

        // Si cambia cuotaAdministracion o seguro, recalcular valorCuota y totales
        if (parsed.cuotaAdministracion !== undefined || parsed.seguro !== undefined) {
            const tasaMensual = parseFloat(credit.tasaMensual);
            const n = credit.numeroCuotas;
            const P = parseFloat(credit.montoTotal);
            let cuotaBase;
            if (tasaMensual === 0) {
                cuotaBase = P / n;
            } else {
                const factor = Math.pow(1 + tasaMensual, n);
                cuotaBase = P * (tasaMensual * factor) / (factor - 1);
            }
            const newAdmin = parsed.cuotaAdministracion !== undefined
                ? parsed.cuotaAdministracion
                : parseFloat(credit.cuotaAdministracion ?? 0);
            const newSeguro = parsed.seguro !== undefined
                ? parsed.seguro
                : parseFloat(credit.seguro ?? 0);
            updates.valorCuota    = parseFloat((cuotaBase + newAdmin + newSeguro).toFixed(2));
            updates.totalAPagar   = parseFloat(((cuotaBase + newAdmin + newSeguro) * n).toFixed(2));
            updates.totalIntereses = parseFloat((cuotaBase * n - P).toFixed(2));
        }

        return credit.update(updates);
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

        const updated = await credit.update({
            cuotasPagadas: nuevasCuotasPagadas,
            saldoPendiente: nuevoSaldo,
            status: nuevoStatus,
        });
        return updated;
    },

    undoPayment: async (id, userId) => {
        const credit = await BankCredit.findByPk(id);
        if (!credit) throw new AppError('Crédito bancario no encontrado', 404);
        if (credit.userId !== userId) throw new AppError('No autorizado', 403);
        if (credit.cuotasPagadas === 0) throw new AppError('No hay pagos que deshacer', 400);

        const nuevasCuotas = credit.cuotasPagadas - 1;

        // Recalcular saldo para nuevasCuotas pagadas (consistente con registerPayment)
        const i = parseFloat(credit.tasaMensual) / 100;
        const cuotaBase = parseFloat(credit.valorCuota)
            - parseFloat(credit.cuotaAdministracion ?? 0)
            - parseFloat(credit.seguro ?? 0);
        let saldo = parseFloat(credit.montoTotal);
        for (let k = 0; k < nuevasCuotas; k++) {
            const interes = saldo * i;
            saldo = Math.max(0, saldo - (cuotaBase - interes));
        }

        return credit.update({
            cuotasPagadas: nuevasCuotas,
            saldoPendiente: parseFloat(saldo.toFixed(2)),
            status: 'activo',
        });
    },

    deleteBankCredit: async (id, userId) => {
        const credit = await BankCredit.findByPk(id);
        if (!credit) throw new AppError('Crédito bancario no encontrado', 404);
        if (credit.userId !== userId) throw new AppError('No autorizado', 403);
        return credit.destroy();
    },
};