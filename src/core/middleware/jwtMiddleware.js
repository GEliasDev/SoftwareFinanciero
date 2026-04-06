import jwt from 'jsonwebtoken';
import { AppError } from '../../middlewares/appError.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return next(new AppError('Token requerido', 401));

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return next(new AppError('Token inválido o expirado', 403));
        req.user = user;
        next();
    });
};