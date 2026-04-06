import { z } from 'zod';

export const userCreateSchema = z.object({
    primerNombre: z.string().min(1),
    segundoNombre: z.string().min(1),
    primerApellido: z.string().min(1),
    segundoApellido: z.string().min(1),
    email: z.email({ message: 'No es un email, ej: @gmail.com, @outlook.com' }),
    telefono: z.string().min(10).max(10),
    pais: z.string(),
    ciudad: z.string(),
    password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

// Schema separado para actualización: email y password NO son actualizables directamente
export const userUpdateSchema = z.object({
    primerNombre: z.string().min(1).optional(),
    segundoNombre: z.string().min(1).optional(),
    primerApellido: z.string().min(1).optional(),
    segundoApellido: z.string().min(1).optional(),
    telefono: z.string().min(10).max(10).optional(),
    pais: z.string().optional(),
    ciudad: z.string().optional(),
});