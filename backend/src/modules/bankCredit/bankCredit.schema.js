import { z } from 'zod';

const tipoCredito = z.enum(['libre_inversion', 'consumo', 'libranza', 'vehiculo', 'hipotecario', 'fintech', 'otro']);

export const bankCreditCreateSchema = z.object({
    nombre: z.string().min(1).max(100, { message: 'El nombre debe tener como máximo 100 caracteres' }),
    entidad: z.string().min(1).max(100, { message: 'La entidad debe tener como máximo 100 caracteres' }),
    montoTotal: z.number().positive({ message: 'El monto debe ser mayor a 0' }).max(1000000, { message: 'El monto no debe exceder 1,000,000' }),
    numeroCuotas: z.number().int().positive({ message: 'El número de cuotas debe ser mayor a 0' }).max(120, { message: 'El número de cuotas no debe superar 120' }),
    tasaInteres: z.number().positive({ message: 'La tasa de interés debe ser mayor a 0' }).max(100, { message: 'La tasa de interés no debe superar el 100%' }),
    tipoTasa: z.enum(['mensual', 'anual'], { message: 'El tipo de tasa debe ser mensual o anual' }),
    cuotaAdministracion: z.number().min(0).max(10000, { message: 'La cuota de administración no debe exceder 10,000' }).optional().default(0),
    seguro: z.number().min(0).max(10000, { message: 'El seguro no debe exceder 10,000' }).optional().default(0),
    tipoCredito: tipoCredito.optional().default('otro'),
    numeroReferencia: z.string().optional(),
    diaPago: z.number().int().min(1).max(31, { message: 'El día de pago debe estar entre 1 y 31' }),
    fechaInicio: z.string().date({ message: 'Formato de fecha inválido, use YYYY-MM-DD' }),
    cuotasPagadas: z.number().int().min(0).optional().default(0),
});

export const bankCreditUpdateSchema = z.object({
    nombre: z.string().min(1).optional(),
    entidad: z.string().min(1).optional(),
    cuotaAdministracion: z.number().min(0).optional(),
    seguro: z.number().min(0).optional(),
    tipoCredito: tipoCredito.optional(),
    numeroReferencia: z.string().optional(),
    diaPago: z.number().int().min(1).max(31).optional(),
    status: z.enum(['activo', 'pagado', 'en_mora', 'cancelado']).optional(),
});