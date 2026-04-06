import { z } from 'zod';

export const subscriptionCreateSchema = z.object({
    nombre: z.string().min(1, { message: 'El nombre es requerido' }),
    descripcion: z.string().optional(),
    monto: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
    moneda: z.enum(['COP', 'USD', 'EUR']).default('COP'),
    frecuencia: z.enum(['mensual', 'anual'], { message: 'La frecuencia debe ser mensual o anual' }),
    diaCobro: z.number().int().min(1).max(31, { message: 'El día de cobro debe estar entre 1 y 31' }),
    fechaInicio: z.string().date({ message: 'Formato de fecha inválido, use YYYY-MM-DD' }),
    fechaFin: z.string().date().optional(),
});

export const subscriptionUpdateSchema = z.object({
    nombre: z.string().min(1).optional(),
    descripcion: z.string().optional(),
    diaCobro: z.number().int().min(1).max(31).optional(),
    fechaFin: z.string().date().optional(),
    status: z.enum(['activa', 'cancelada', 'pausada']).optional(),
});