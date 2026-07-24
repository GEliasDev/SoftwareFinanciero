import jwt from 'jsonwebtoken';
import logger from '../../utils/logger.js';
import { AppError } from '../../middlewares/appError.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
    logger.warn(`Missing auth token for request to ${req.originalUrl}`);
    return next(new AppError('Token requerido', 401));
}


    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
        logger.warn(`Invalid or expired token: ${err.message}`);
        return next(new AppError('Token inválido o expirado', 401));
    }
    // Los tokens de PROPÓSITO ESPECIAL (ej. el tempToken de 2FA con
    // purpose:'2fa-pending') NO son sesiones válidas: sin este chequeo, un
    // tempToken —emitido con solo la contraseña, antes del código 2FA— daba
    // acceso completo a toda ruta protegida durante 5 min, saltándose el 2FA.
    // Los tokens de sesión reales (generateToken) nunca llevan `purpose`.
    if (user && user.purpose) {
        logger.warn(`Special-purpose token (${user.purpose}) rejected on ${req.originalUrl}`);
        return next(new AppError('Token inválido o expirado', 401));
    }
    req.user = user;
    next();
});
};