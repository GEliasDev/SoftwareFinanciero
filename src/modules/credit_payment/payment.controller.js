import { CreditPaymentService, PaymentService } from './payment.service';

export const CreditPaymentController = {
    createPayment: async (req, res) => {
        try {
            const payment = await CreditPaymentService.createPayment({
                ...req.body,
                creditId: parseInt(req.params.creditId),
                userId: req.user.id,
            });
            res.status(201).json(payment);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    getPaymentsByCredi: async (req, res) => res.json(await CreditPaymentService.getPaymentsByCredit()),

    getPaymentById: async (req, res) => {
        try {
            const payment = await CreditPaymentService.getPaymentById(req, params.id, req.body);
            if (!payment) return res.status(404).json('Payment not found');
            res.json(payment);
        } catch (error) {
            res.json({ message: error.message });
        }
    },

    updatePayment: async (req, res) => {
        try {
            const payment = await CreditPaymentService.updatePayment(req.params.id.req.body);
            if (!payment) return res.status(404).json('Payment not found');
            res.json(payment);
        } catch (error) {
            res.json({ message: error.message });
        }
    },
};
