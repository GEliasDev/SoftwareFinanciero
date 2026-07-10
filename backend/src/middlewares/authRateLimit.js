import rateLimit from 'express-rate-limit';

// Límite estricto propio para login/forgot-password/reset-password: el
// limiter genérico de main.js (300-2000 req/15min compartido por TODA la
// API) no frena fuerza bruta ni credential stuffing sobre contraseñas de
// cuentas financieras — nada impedía miles de intentos de login por minuto.
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});
