import { BankCreditService } from './bankCredit.service.js';

export const BankCreditController = {
    createBankCredit: async (req, res, next) => {
        try {
            const credit = await BankCreditService.createBankCredit({
                ...req.body,
                userId: req.user.id,
            });
            res.status(201).json(credit);
        } catch (error) {
            next(error);
        }
    },

    getAllBankCredits: async (req, res, next) => {
        try {
            const credits = await BankCreditService.getAllBankCredits(req.user.id);
            res.json(credits);
        } catch (error) {
            next(error);
        }
    },

    getBankCreditById: async (req, res, next) => {
        try {
            const credit = await BankCreditService.getBankCreditById(req.params.id, req.user.id);
            res.json(credit);
        } catch (error) {
            next(error);
        }
    },

    updateBankCredit: async (req, res, next) => {
        try {
            const credit = await BankCreditService.updateBankCredit(req.params.id, req.body, req.user.id);
            res.json(credit);
        } catch (error) {
            next(error);
        }
    },

    // Endpoint para registrar que se pagó una cuota
    registerPayment: async (req, res, next) => {
        try {
            const credit = await BankCreditService.registerPayment(req.params.id, req.user.id);
            res.json({
                message: 'Cuota registrada exitosamente',
                cuotasPagadas: credit.cuotasPagadas,
                cuotasRestantes: credit.numeroCuotas - credit.cuotasPagadas,
                saldoPendiente: credit.saldoPendiente,
                status: credit.status,
            });
        } catch (error) {
            next(error);
        }
    },

    undoPayment: async (req, res, next) => {
        try {
            const credit = await BankCreditService.undoPayment(req.params.id, req.user.id);
            res.json({
                message: 'Último pago revertido',
                cuotasPagadas: credit.cuotasPagadas,
                saldoPendiente: credit.saldoPendiente,
                status: credit.status,
            });
        } catch (error) {
            next(error);
        }
    },

    deleteBankCredit: async (req, res, next) => {
        try {
            await BankCreditService.deleteBankCredit(req.params.id, req.user.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },
};