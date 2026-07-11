import { z } from 'zod';
import { CATEGORIAS } from '../../utils/categories.js';

export const personalDebtCreateSchema = z.object({
    tipo:          z.enum(['deuda', 'gasto']).default('deuda'),
    nombre:        z.string().min(1).max(100),
    descripcion:   z.string().optional(),
    prestamista:   z.string().min(1).max(100).optional(),
    montoTotal:    z.number().positive().optional(),
    montoCuota:    z.number().positive().optional(),
    diaPago:       z.number().int().min(1).max(31).optional().default(1),
    cuotasPagadas: z.number().int().min(0).optional().default(0),
    // Solo se persiste para tipo 'gasto' — ver personalDebt.service.js.
    categoria:     z.enum(CATEGORIAS).optional(),
});

export const personalDebtUpdateSchema = z.object({
    nombre:      z.string().min(1).max(100).optional(),
    descripcion: z.string().optional(),
    prestamista: z.string().min(1).max(100).optional(),
    montoCuota:  z.number().positive().optional().nullable(),
    status:      z.enum(['activo', 'pagado', 'inactivo']).optional(),
    categoria:   z.enum(CATEGORIAS).optional().nullable(),
});

export const abonoSchema = z.object({
    monto: z.number().positive(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
