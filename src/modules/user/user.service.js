import { User } from './user.model.js';
import { userCreateSchema } from './user.schema.js';
import { generateToken } from './utils/generateToken.js';
import bcrypt from 'bcrypt';

export const UserService = {
    login: async (email, password) => {
        if (!email || !password) {
            throw new Error('Email y contraseña son requeridos');
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new Error('User inválidas');
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            throw new Error('Contraseña inválidas');
        }

        const token = generateToken(user);

        const { password: _, ...userData } = user.toJSON();
        return { user: userData, token };
    },

    createUser: async (data) => {
        const parsed = userCreateSchema.parse(data);
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(parsed.password, saltRounds);
        return User.create({
            ...parsed,
            password: hashedPassword,
        });
    },

    getAllUsers: async () => User.findAll(),

    getUserById: async (id) => User.findByPk(id),

    updateUser: async (id, data) => {
        const user = await User.findByPk(id);
        if (!user) throw new Error('Usuario no encontrado');
        const parsed = userCreateSchema.partial().parse(data);
        return user.update(parsed);
    },

    deleteUser: async (id) => {
        const user = await User.findByPk(id);
        if (!user) throw new Error('Usuario no encontrado');
        return user.destroy();
    },
};
