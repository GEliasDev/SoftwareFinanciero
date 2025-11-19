import { UserService } from './user.service.js';

export const UserController = {
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            const result = await UserService.login(email, password);
            res.status(200).json({ message: 'Inicio de sesión exitoso', ...result });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    createUser: async (req, res) => {
        try {
            const user = await UserService.createUser(req.body);
            res.status(201).json(user);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    getAllUsers: async (req, res) => res.json(await UserService.getAllUsers()),

    getUserById: async (req, res) => {
        try {
            const user = await UserService.getUserById(req.params.id);
            if (!user) return res.status(404).json('Usuario no encontrado');
            res.json(user);
        } catch (error) {
            res.json({ message: error.message });
        }
    },

    updateUser: async (req, res) => {
        try {
            const user = await UserService.updateUser(req.params.id, req.body);
            if (!user) return res.stauts(404).json('Usuario no encontrado');
            res.json(user);
        } catch (error) {
            res.json({ message: error.message });
        }
    },

    deleteUser: async (req, res) => {
        try {
            await UserService.deleteUser(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },
};
