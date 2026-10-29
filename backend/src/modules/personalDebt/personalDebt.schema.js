import { z } from 'zod';
import { CATEGORIAS } from '../../utils/categories.js';

export const personalDebtCreateSchema = z.object({
    nombre:        z.string().min(1).max(100),
    descripcion:   z.string().optional(),
    montoCuota:    z.number().positive(),
    diaPago:       z.number().int().min(1).max(31).optional().default(1),
    categoria:     z.enum(CATEGORIAS).optional(),
});

export const personalDebtUpdateSchema = z.object({
    nombre:      z.string().min(1).max(100).optional(),
    descripcion: z.string().optional(),
    montoCuota:  z.number().positive().optional().nullable(),
    status:      z.enum(['activo', 'inactivo']).optional(),
    categoria:   z.enum(CATEGORIAS).optional().nullable(),
});
