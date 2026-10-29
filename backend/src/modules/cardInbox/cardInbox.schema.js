import { z } from 'zod';
import { CATEGORIAS } from '../../utils/categories.js';

// Lo que el usuario puede ajustar al aprobar; todo opcional: lo no enviado sale del movimiento.
export const approveSchema = z.object({
    creditCardId: z.number().int().positive().optional(),
    numeroCuotas: z.number().int().min(1).max(36).optional(),
    categoria:    z.enum(CATEGORIAS).optional(),
    descripcion:  z.string().min(1).max(255).optional(),
});
