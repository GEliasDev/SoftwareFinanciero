import { z } from 'zod';

export const creditCardCreateSchema = z.object({
    nombre: z.string().min(1, { message: 'El nombre es requerido' }),
    entidad: z.string().min(1, { message: 'La entidad es requerida' }),
    cupoTotal: z.number().positive({ message: 'El cupo total debe ser mayor a 0' }),
    tasaInteresMensual: z.number().positive({ message: 'La tasa de interés debe ser mayor a 0' }),
    fechaCorte: z.number().int().min(1).max(31, { message: 'El día de corte debe estar entre 1 y 31' }),
    fechaPago: z.number().int().min(1).max(31, { message: 'El día de pago debe estar entre 1 y 31' }),
});

export const creditCardUpdateSchema = z.object({
    nombre: z.string().min(1).optional(),
    entidad: z.string().min(1).optional(),
    fechaCorte: z.number().int().min(1).max(31).optional(),
    fechaPago: z.number().int().min(1).max(31).optional(),
    status: z.enum(['activa', 'bloqueada', 'cancelada']).optional(),
});

export const purchaseCreateSchema = z.object({
    descripcion: z.string().min(1, { message: 'La descripción es requerida' }),
    montoTotal: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
    numeroCuotas: z.number().int().min(1, { message: 'Debe ser mínimo 1 cuota' }),
    fechaCompra: z.string().date({ message: 'Formato de fecha inválido, use YYYY-MM-DD' }),
});