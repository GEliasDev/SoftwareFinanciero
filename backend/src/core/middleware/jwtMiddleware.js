import jwt from 'jsonwebtoken';
import logger from '../../utils/logger.js';

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
    req.user = user;
    next();
});
};