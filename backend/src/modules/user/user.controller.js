import { UserService } from './user.service.js';

export const UserController = {
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const result = await UserService.login(email, password);
            res.status(200).json({ message: 'Inicio de sesión exitoso', ...result });
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
            const { page, limit } = req.query;
            const result = await UserService.getAllUsers({ page: +page, limit: +limit });
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    getUserById: async (req, res, next) => {
        try {
            const user = await UserService.getUserById(req.params.id);
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    updateUser: async (req, res, next) => {
        try {
            const user = await UserService.updateUser(req.params.id, req.body);
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    changePassword: async (req, res, next) => {
        try {
            await UserService.changePassword(req.params.id, req.body);
            res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
        } catch (error) {
            next(error);
        }
    },

    deleteUser: async (req, res, next) => {
        try {
            await UserService.deleteUser(req.params.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },
};