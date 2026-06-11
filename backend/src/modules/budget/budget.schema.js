import { z } from 'zod';

export const budgetCategorySchema = z.object({
    mes:       z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM'),
    categoria: z.string().min(1).max(80),
    limite:    z.number().positive(),
    color:     z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const budgetExpenseSchema = z.object({
    mes:        z.string().regex(/^\d{4}-\d{2}$/),
    categoria:  z.string().min(1).max(80),
    monto:      z.number().positive(),
    descripcion:z.string().max(120).optional().default(''),
    fecha:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
