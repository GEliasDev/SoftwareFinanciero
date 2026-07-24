import { UserService } from './user.service.js';
import logger from '../../utils/logger.js';
import { AppError } from '../../middlewares/appError.js';
import { localToday } from '../../utils/localDate.js';

export const UserController = {
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const result = await UserService.login(email, password);
            const message = result.requiresTwoFactor ? 'Ingresa tu código de verificación' : 'Inicio de sesión exitoso';
            res.status(200).json({ message, ...result });
        } catch (error) {
            next(error);
        }
    },

    refreshToken: async (req, res, next) => {
        try {
            const result = await UserService.refreshAccessToken(req.body.refreshToken);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    verifyTwoFactorLogin: async (req, res, next) => {
        try {
            const { tempToken, code } = req.body;
            const result = await UserService.verifyTwoFactorLogin(tempToken, code);
            res.status(200).json({ message: 'Inicio de sesión exitoso', ...result });
        } catch (error) {
            next(error);
        }
    },

    setupTwoFactor: async (req, res, next) => {
        try {
            const result = await UserService.setupTwoFactor(req.user.id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    confirmTwoFactor: async (req, res, next) => {
        try {
            const result = await UserService.confirmTwoFactor(req.user.id, req.body.code);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    disableTwoFactor: async (req, res, next) => {
        try {
            const result = await UserService.disableTwoFactor(req.user.id, req.body.password);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    createUser: async (req, res, next) => {
        try {
            const user = await UserService.createUser(req.body);
            res.status(201).json(user);
        } catch (error) {
            next(error);
        }
    },

    getAllUsers: async (req, res, next) => {
        try {
            if (!req.user.isAdmin) {
                logger.warn(`Unauthorized access attempt to user list by user ${req.user.id}`);
                throw new AppError('Acceso no autorizado a lista de usuarios', 403);
            }
            const { page, limit } = req.query;
            const cappedLimit = Math.min(parseInt(limit) || 10, 100);
            const result = await UserService.getAllUsers({ page: +page, limit: cappedLimit });
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    exportData: async (req, res, next) => {
        try {
            const data = await UserService.exportAllData(req.user.id);
            const fecha = localToday();
            res.setHeader('Content-Disposition', `attachment; filename="debti-datos-${fecha}.json"`);
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(JSON.stringify(data, null, 2));
        } catch (error) {
            next(error);
        }
    },

    getUserById: async (req, res, next) => {
        try {
            if (!req.user.isAdmin && req.user.id !== Number(req.params.id)) {
                logger.warn(`Unauthorized access to user ${req.params.id} by user ${req.user.id}`);
                throw new AppError('Acceso no autorizado al usuario', 403);
            }
            const user = await UserService.getUserById(req.params.id);
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    updateUser: async (req, res, next) => {
        try {
            if (!req.user.isAdmin && req.user.id !== Number(req.params.id)) {
                logger.warn(`Unauthorized update attempt on user ${req.params.id} by user ${req.user.id}`);
                throw new AppError('Acceso no autorizado al usuario', 403);
            }
            const user = await UserService.updateUser(req.params.id, req.body);
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    changePassword: async (req, res, next) => {
        try {
            if (!req.user.isAdmin && req.user.id !== Number(req.params.id)) {
                logger.warn(`Unauthorized password change attempt for user ${req.params.id} by user ${req.user.id}`);
                throw new AppError('Acceso no autorizado al cambio de contraseña', 403);
            }
            await UserService.changePassword(req.params.id, req.body);
            res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
        } catch (error) {
            next(error);
        }
    },

    deleteUser: async (req, res, next) => {
        try {
            if (!req.user.isAdmin && req.user.id !== Number(req.params.id)) {
                logger.warn(`Unauthorized delete attempt for user ${req.params.id} by user ${req.user.id}`);
                throw new AppError('Acceso no autorizado al usuario', 403);
            }
            await UserService.deleteUser(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },

    forgotPassword: async (req, res, next) => {
        try {
            const result = await UserService.forgotPassword(req.body.email);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    resetPasswordByToken: async (req, res, next) => {
        try {
            const { token, newPassword } = req.body;
            const result = await UserService.resetPasswordByToken(token, newPassword);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },
};