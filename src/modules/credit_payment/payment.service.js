import { Payment } from './payment.model';
import { PaymentCreateSchema } from './payment.schema';

export const CreditPaymentService = {
    createPayment: async (data) => {
        const parsed = PaymentCreateSchema.parse(data);

        return Payment.create({
            ...parsed,
            userId: data.userId,
            creditId: data.creditId,
        });
    },

    getPaymentsByCredit: async (creditId) => Payment.findAll({ where: { creditId } }),

    getPaymentById: async (id) => Payment.findByPk(id),

    updatePayment: async (id, data) => {
        const payment = await Payment.findByPk(id);
        if (!payment) throw new Error('Payment not found');
        const parsed = PaymentCreateSchema.partial().parse(data);
        return payment.update(parsed);
    },

    deletePayment: async (id) => {
        const payment = await Payment.findByPk(id);
        if (!payment) throw new Error('Payment not found');
        return payment.destroy();
    },
};
