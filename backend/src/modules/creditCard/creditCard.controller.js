import { CreditCardService } from './creditCard.service.js';

export const CreditCardController = {
    // ── Tarjeta ───────────────────────────────────────────────

    createCreditCard: async (req, res, next) => {
        try {
            const card = await CreditCardService.createCreditCard({
                ...req.body,
                userId: req.user.id,
            });
            res.status(201).json(card);
        } catch (error) {
            next(error);
        }
    },

    getAllCreditCards: async (req, res, next) => {
        try {
            const cards = await CreditCardService.getAllCreditCards(req.user.id);
            res.json(cards);
        } catch (error) {
            next(error);
        }
    },

    getCreditCardById: async (req, res, next) => {
        try {
            const card = await CreditCardService.getCreditCardById(req.params.id);
            res.json(card);
        } catch (error) {
            next(error);
        }
    },

    updateCreditCard: async (req, res, next) => {
        try {
            const card = await CreditCardService.updateCreditCard(req.params.id, req.body);
            res.json(card);
        } catch (error) {
            next(error);
        }
    },

    deleteCreditCard: async (req, res, next) => {
        try {
            await CreditCardService.deleteCreditCard(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },

    getMonthlySummary: async (req, res, next) => {
        try {
            const summary = await CreditCardService.getMonthlySummary(req.params.id);
            res.json(summary);
        } catch (error) {
            next(error);
        }
    },

    // ── Compras ───────────────────────────────────────────────

    createPurchase: async (req, res, next) => {
        try {
            const purchase = await CreditCardService.createPurchase(
                req.params.creditCardId,
                req.body
            );
            res.status(201).json(purchase);
        } catch (error) {
            next(error);
        }
    },

    createAdvance: async (req, res, next) => {
        try {
            const result = await CreditCardService.createAdvance(
                req.params.creditCardId,
                req.body
            );
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    },

    getPurchasesByCard: async (req, res, next) => {
        try {
            const purchases = await CreditCardService.getPurchasesByCard(req.params.creditCardId);
            res.json(purchases);
        } catch (error) {
            next(error);
        }
    },

    getPurchaseById: async (req, res, next) => {
        try {
            const purchase = await CreditCardService.getPurchaseById(req.params.purchaseId);
            res.json(purchase);
        } catch (error) {
            next(error);
        }
    },

    registerPurchasePayment: async (req, res, next) => {
        try {
            const purchase = await CreditCardService.registerPurchasePayment(req.params.purchaseId);
            res.json({
                message: 'Cuota registrada exitosamente',
                cuotasPagadas: purchase.cuotasPagadas,
                cuotasRestantes: purchase.numeroCuotas - purchase.cuotasPagadas,
                status: purchase.status,
            });
        } catch (error) {
            next(error);
        }
    },

    updatePurchase: async (req, res, next) => {
        try {
            const purchase = await CreditCardService.updatePurchase(req.params.purchaseId, req.body);
            res.json(purchase);
        } catch (error) {
            next(error);
        }
    },

    deletePurchase: async (req, res, next) => {
        try {
            await CreditCardService.deletePurchase(req.params.purchaseId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },

    getOverview: async (req, res, next) => {
        try {
            const overview = await CreditCardService.getOverview(req.user.id);
            res.json(overview);
        } catch (error) {
            next(error);
        }
    },

    undoPurchasePayment: async (req, res, next) => {
        try {
            const purchase = await CreditCardService.undoPurchasePayment(req.params.purchaseId);
            res.json({
                message: 'Pago revertido exitosamente',
                cuotasPagadas: purchase.cuotasPagadas,
                status: purchase.status,
            });
        } catch (error) {
            next(error);
        }
    },

    registerAbono: async (req, res, next) => {
        try {
            const purchase = await CreditCardService.registerAbono(
                req.params.purchaseId,
                req.body.montoAbono
            );
            res.json({ message: 'Abono registrado exitosamente', purchase });
        } catch (error) {
            next(error);
        }
    },

    getUpcomingPayments: async (req, res, next) => {
        try {
            const payments = await CreditCardService.getUpcomingPayments(req.params.id);
            res.json(payments);
        } catch (error) {
            next(error);
        }
    },

    getPurchaseStats: async (req, res, next) => {
        try {
            const stats = await CreditCardService.getPurchaseStats(req.params.id);
            res.json(stats);
        } catch (error) {
            next(error);
        }
    },
};