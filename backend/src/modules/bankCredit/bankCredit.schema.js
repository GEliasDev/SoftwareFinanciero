import { z } from 'zod';

export const bankCreditCreateSchema = z.object({
    nombre: z.string().min(1, { message: 'El nombre es requerido' }),
    entidad: z.string().min(1, { message: 'La entidad es requerida' }),
    montoTotal: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
    numeroCuotas: z.number().int().positive({ message: 'El número de cuotas debe ser mayor a 0' }),
    tasaInteres: z.number().positive({ message: 'La tasa de interés debe ser mayor a 0' }),
    tipoTasa: z.enum(['mensual', 'anual'], { message: 'El tipo de tasa debe ser mensual o anual' }),
    cuotaAdministracion: z.number().min(0).optional().default(0),
    diaPago: z.number().int().min(1).max(31, { message: 'El día de pago debe estar entre 1 y 31' }),
    fechaInicio: z.string().date({ message: 'Formato de fecha inválido, use YYYY-MM-DD' }),
});

export const bankCreditUpdateSchema = z.object({
    nombre: z.string().min(1).optional(),
    entidad: z.string().min(1).optional(),
    cuotaAdministracion: z.number().min(0).optional(),
    diaPago: z.number().int().min(1).max(31).optional(),
    status: z.enum(['activo', 'pagado', 'en_mora', 'cancelado']).optional(),
});