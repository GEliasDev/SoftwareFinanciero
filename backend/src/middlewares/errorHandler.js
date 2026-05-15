import { ZodError } from 'zod';
import { AppError } from './appError.js';

export const errorHandler = (err, req, res, next) => {
    // Errores de validación de Zod
    if (err instanceof ZodError) {
        return res.status(400).json({
            status: 'error',
            message: 'Datos inválidos',
            errors: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
    }

    // Errores operacionales controlados (AppError)
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
    }

    // Errores inesperados — no exponer detalles al cliente
    console.error('Error inesperado:', err);
    return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor',
    });
};