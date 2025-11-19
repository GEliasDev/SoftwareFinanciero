import { CreditService } from './credit.service.js';

export const CreditController = {
    createCredit: async (req, res) => {
        try {
            const credit = await CreditService.createCredit({
                ...req.body,
                userId: req.user.id,
            });
            res.status(201).json(credit);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    getAllCredits: async (req, res) => res.json(await CreditService.getAllCredits()),

    getCreditById: async (req, res) => {
        try {
            const credit = await CreditController.getCreditById(req.params.id);
            if (!credit) return res.status(404).json('Crédito no encontrado en nuestra base de datos');
            res.json(credit);
        } catch (error) {
            res.json({ message: error.message });
        }
    },

    updateCredit: async (req, res) => {
        try {
            const credit = await CreditService.updateCredit(req.params.id, req.body);
            if (!credit) return res.status(404).json('Crédito no encontrado en nuestra base de datos');
            res.json(credit);
        } catch (error) {
            res.json({ message: error.message });
        }
    },

    deleteCredit: async (req, res) => {
        try {
            await CreditService.deleteCredit(req.params.id);
            res.status(204).json('Crédito eliminado correctamente');
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },
};
