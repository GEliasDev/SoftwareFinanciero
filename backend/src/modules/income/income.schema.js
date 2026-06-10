import { z } from 'zod';

export const incomeCreateSchema = z.object({
    nombre:   z.string().min(1).max(100),
    monto:    z.number().positive(),
    tipo:     z.enum(['fijo', 'extra']).optional().default('fijo'),
    diaCobro: z.number().int().min(1).max(31),
    status:   z.enum(['activo', 'inactivo']).optional().default('activo'),
});

export const incomeUpdateSchema = z.object({
    nombre:   z.string().min(1).max(100).optional(),
    monto:    z.number().positive().optional(),
    tipo:     z.enum(['fijo', 'extra']).optional(),
    diaCobro: z.number().int().min(1).max(31).optional(),
    status:   z.enum(['activo', 'inactivo']).optional(),
});
