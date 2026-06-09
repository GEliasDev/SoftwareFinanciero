import { z } from 'zod';

export const reminderCreateSchema = z.object({
    debtType: z.enum(['bank_credit', 'credit_card', 'subscription'], {
        message: 'El tipo de deuda debe ser bank_credit, credit_card o subscription',
    }),
    debtId: z.number().int().positive({ message: 'El ID de la deuda es requerido' }),
    nombre: z.string().min(1, { message: 'El nombre es requerido' }),
    diasAnticipacion: z.number().int().min(1).max(30).default(3),
    pushSubscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
        auth: z.string(),
        p256dh: z.string()
    })
}).optional(),
});

export const reminderUpdateSchema = z.object({
    diasAnticipacion: z.number().int().min(1).max(30).optional(),
    status: z.enum(['activo', 'pausado', 'cancelado']).optional(),
    pushSubscription: z.string().optional(),
});