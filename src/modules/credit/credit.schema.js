import { z } from 'zod';

export const CreditCreateSchema = z.object({
    typeOfCredit: z.string(),
    entityName: z.string(),
    requestedAmount: z.number(),
    term: z.number().min(1),
    annualInterestRate: z.number().min(0),
    managementFees: z.number().min(0).optional(),
    // monthlyInterestRate: z.number().min(0),
    paymentPeriod: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    // status: z.string(),
    // monthlyPayment: z.number(),
    // totalInterest: z.number(),
    // totalToPay: z.number(),
    userId: z.number(),
});
