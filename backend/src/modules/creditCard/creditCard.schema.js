import { z } from 'zod';
import { CATEGORIAS } from '../../utils/categories.js';

export const creditCardCreateSchema = z.object({
    nombre: z.string().min(1).max(100, { message: 'El nombre debe tener como máximo 100 caracteres' }),
    entidad: z.string().min(1).max(100, { message: 'La entidad debe tener como máximo 100 caracteres' }),
    cupoTotal: z.number().positive({ message: 'El cupo total debe ser mayor a 0' }).max(10_000_000_000, { message: 'El cupo total no debe exceder $10.000 millones' }),
    tasaInteresMensual: z.number().positive({ message: 'La tasa de interés debe ser mayor a 0' }).max(100, { message: 'La tasa de interés no debe superar el 100%' }),
    fechaCorte: z.number().int().min(1).max(31, { message: 'El día de corte debe estar entre 1 y 31' }),
    fechaPago: z.number().int().min(1).max(31, { message: 'El día de pago debe estar entre 1 y 31' }),
    ultimos4: z.string().length(4).regex(/^\d{4}$/).optional(),
    color: z.union([
        z.enum(['blue', 'purple', 'green', 'red', 'slate', 'gold', 'rose', 'teal']),
        z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: 'Color inválido' }),
    ]).optional().default('blue'),
    comisionAvance: z.number().nonnegative({ message: 'La comisión no puede ser negativa' }).optional().default(0),
    cuotaManejo: z.number().nonnegative({ message: 'La cuota de manejo no puede ser negativa' }).optional().default(0),
    pagoMinimo: z.number().nonnegative().optional().nullable(),
});

export const abonoSchema = z.object({
    montoAbono: z.number().positive({ message: 'El monto debe ser mayor a 0' })
});

export const creditCardUpdateSchema = z.object({
    nombre: z.string().min(1).max(100, { message: 'El nombre debe tener como máximo 100 caracteres' }).optional(),
    entidad: z.string().min(1).max(100, { message: 'La entidad debe tener como máximo 100 caracteres' }).optional(),
    tasaInteresMensual: z.number().positive({ message: 'La tasa debe ser mayor a 0' }).max(100, { message: 'La tasa no debe superar el 100%' }).optional(),
    fechaCorte: z.number().int().min(1).max(31).optional(),
    fechaPago: z.number().int().min(1).max(31).optional(),
    status: z.enum(['activa', 'bloqueada', 'cancelada']).optional(),
    ultimos4: z.string().length(4).regex(/^\d{4}$/).optional().nullable(),
    color: z.union([
        z.enum(['blue', 'purple', 'green', 'red', 'slate', 'gold', 'rose', 'teal']),
        z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: 'Color inválido' })
    ]).optional(),
    cupoTotal: z.number().positive({ message: 'El cupo total debe ser mayor a 0' }).max(10_000_000_000, { message: 'El cupo total no debe exceder $10.000 millones' }).optional(),
    comisionAvance: z.number().nonnegative().optional(),
    cuotaManejo: z.number().nonnegative().optional(),
    pagoMinimo: z.number().nonnegative().optional().nullable(),
});

export const purchaseCreateSchema = z.object({
  descripcion: z.string().min(1, { message: 'La descripción es requerida' }).max(255, { message: 'La descripción es demasiado larga' }),
  montoTotal: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
  numeroCuotas: z.number().int().min(1, { message: 'Debe ser mínimo 1 cuota' }).max(36, { message: 'No se pueden crear más de 36 cuotas' }),
  fechaCompra: z.string().date({ message: 'Formato de fecha inválido, use YYYY-MM-DD' }),
  categoria: z.enum(CATEGORIAS).optional().default('otros'),
});

export const purchaseUpdateSchema = z.object({
    descripcion: z.string().min(1).optional(),
    categoria: z.enum(CATEGORIAS).optional(),
});

export const advanceCreateSchema = z.object({
  descripcion: z.string().min(1, { message: 'La descripción es requerida' }).max(255, { message: 'La descripción es demasiado larga' }),
  montoTotal: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
  numeroCuotas: z.number().int().min(1, { message: 'Debe ser mínimo 1 cuota' }).max(36, { message: 'No se pueden crear más de 36 cuotas' }),
  fechaCompra: z.string().date({ message: 'Formato de fecha inválido, use YYYY-MM-DD' }),
});