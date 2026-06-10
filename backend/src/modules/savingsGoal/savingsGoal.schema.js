import { z } from 'zod';

export const savingsGoalCreateSchema = z.object({
    nombre:         z.string().min(1).max(100),
    emoji:          z.string().optional(),
    montoMeta:      z.number().positive(),
    aporteMensual:  z.number().min(0).optional().default(0),
    fechaMeta:      z.string().date().optional(),
    montoAcumulado: z.number().min(0).optional().default(0),
});

export const savingsGoalUpdateSchema = z.object({
    nombre:        z.string().min(1).max(100).optional(),
    emoji:         z.string().optional().nullable(),
    montoMeta:     z.number().positive().optional(),
    aporteMensual: z.number().min(0).optional(),
    fechaMeta:     z.string().date().optional().nullable(),
    status:        z.enum(['activo', 'completado', 'pausado']).optional(),
});

export const aporteSchema = z.object({
    monto: z.number().positive(),
});
