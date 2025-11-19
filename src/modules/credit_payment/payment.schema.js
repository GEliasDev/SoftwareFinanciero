import { z } from 'zod';

export const PaymentCreateSchema = z.object({
    amount: z.number(),
    status: z.string(),
    creditId: z.number(),
    userId: z.number(),
});
