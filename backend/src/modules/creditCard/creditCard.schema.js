import { z } from 'zod';

export const creditCardCreateSchema = z.object({
    nombre: z.string().min(1, { message: 'El nombre es requerido' }),
    entidad: z.string().min(1, { message: 'La entidad es requerida' }),
    cupoTotal: z.number().positive({ message: 'El cupo total debe ser mayor a 0' }),
    tasaInteresMensual: z.number().positive({ message: 'La tasa de interés debe ser mayor a 0' }),
    fechaCorte: z.number().int().min(1).max(31, { message: 'El día de corte debe estar entre 1 y 31' }),
    fechaPago: z.number().int().min(1).max(31, { message: 'El día de pago debe estar entre 1 y 31' }),
    ultimos4: z.string().length(4).regex(/^\d{4}$/).optional(),
    color: z.union([
        z.enum(['blue', 'purple', 'green', 'red', 'slate', 'gold', 'rose', 'teal']),
        z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: 'Color inválido' }),
    ]).optional().default('blue'),
    comisionAvance: z.number().nonnegative({ message: 'La comisión no puede ser negativa' }).optional().default(0),
    cuotaManejo: z.number().nonnegative({ message: 'La cuota de manejo no puede ser negativa' }).optional().default(0),
});

export const creditCardUpdateSchema = z.object({
    nombre: z.string().min(1).optional(),
    entidad: z.string().min(1).optional(),
    tasaInteresMensual: z.number().positive({ message: 'La tasa debe ser mayor a 0' }).optional(),
    fechaCorte: z.number().int().min(1).max(31).optional(),
    fechaPago: z.number().int().min(1).max(31).optional(),
    status: z.enum(['activa', 'bloqueada', 'cancelada']).optional(),
    ultimos4: z.string().length(4).regex(/^\d{4}$/).optional().nullable(),
    color: z.union([
        z.enum(['blue', 'purple', 'green', 'red', 'slate', 'gold', 'rose', 'teal']),
        z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: 'Color inválido' }),
    ]).optional(),
    cupoTotal: z.number().positive({ message: 'El cupo total debe ser mayor a 0' }).optional(),
    comisionAvance: z.number().nonnegative().optional(),
    cuotaManejo: z.number().nonnegative().optional(),
});

const CATEGORIAS = ['comida', 'transporte', 'salud', 'entretenimiento', 'hogar', 'tecnologia', 'ropa', 'educacion', 'viajes', 'otros'];

export const purchaseCreateSchema = z.object({
    descripcion: z.string().min(1, { message: 'La descripción es requerida' }),
    montoTotal: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
    numeroCuotas: z.number().int().min(1, { message: 'Debe ser mínimo 1 cuota' }),
    fechaCompra: z.string().date({ message: 'Formato de fecha inválido, use YYYY-MM-DD' }),
    categoria: z.enum(CATEGORIAS).optional().default('otros'),
});

export const purchaseUpdateSchema = z.object({
    descripcion: z.string().min(1).optional(),
    categoria: z.enum(CATEGORIAS).optional(),
});

export const advanceCreateSchema = z.object({
    descripcion: z.string().min(1, { message: 'La descripción es requerida' }),
    montoTotal: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
    numeroCuotas: z.number().int().min(1, { message: 'Debe ser mínimo 1 cuota' }),
    fechaCompra: z.string().date({ message: 'Formato de fecha inválido, use YYYY-MM-DD' }),
});