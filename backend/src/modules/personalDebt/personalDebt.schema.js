import { z } from 'zod';

export const personalDebtCreateSchema = z.object({
    nombre:        z.string().min(1).max(100),
    descripcion:   z.string().optional(),
    prestamista:   z.string().min(1).max(100),
    montoTotal:    z.number().positive(),
    montoCuota:    z.number().positive(),
    diaPago:       z.number().int().min(1).max(31),
    cuotasPagadas: z.number().int().min(0).optional().default(0),
});

export const personalDebtUpdateSchema = z.object({
    nombre:      z.string().min(1).max(100).optional(),
    descripcion: z.string().optional(),
    prestamista: z.string().min(1).max(100).optional(),
    montoCuota:  z.number().positive().optional(),
    diaPago:     z.number().int().min(1).max(31).optional(),
    status:      z.enum(['activo', 'pagado']).optional(),
});

export const abonoSchema = z.object({
    monto: z.number().positive(),
});
