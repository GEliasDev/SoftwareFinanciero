import { User } from './user.model.js';
import { userCreateSchema, userUpdateSchema } from './user.schema.js';
import { generateToken } from './utils/generateToken.js';
import { AppError } from '../../middlewares/appError.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const USER_PUBLIC_ATTRIBUTES = [
    'id', 'primerNombre', 'segundoNombre',
    'primerApellido', 'segundoApellido',
    'email', 'telefono', 'pais', 'ciudad',
];

export const UserService = {
    login: async (email, password) => {
        if (!email || !password) {
            throw new AppError('Email y contraseña son requeridos', 400);
        }

        const user = await User.findOne({ where: { email } });
        const isValid = user ? await bcrypt.compare(password, user.password) : false;
        if (!user || !isValid) {
            throw new AppError('Credenciales inválidas', 401);
        }

        const token = generateToken(user);
        const { password: _, ...userData } = user.toJSON();
        return { user: userData, token };
    },

    createUser: async (data) => {
        const parsed = userCreateSchema.parse(data);
        const hashedPassword = await bcrypt.hash(parsed.password, SALT_ROUNDS);
        const user = await User.create({ ...parsed, password: hashedPassword });
        const { password: _, ...userData } = user.toJSON();
        return userData;
    },

    getAllUsers: async ({ page = 1, limit = 20 } = {}) => {
        const offset = (page - 1) * limit;
        const { count, rows } = await User.findAndCountAll({
            attributes: USER_PUBLIC_ATTRIBUTES,
            limit,
            offset,
            order: [['id', 'ASC']],
        });
        return {
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
            data: rows,
        };
    },

    getUserById: async (id) => {
        const user = await User.findByPk(id, { attributes: USER_PUBLIC_ATTRIBUTES });
        if (!user) throw new AppError('Usuario no encontrado', 404);
        return user;
    },

    updateUser: async (id, data) => {
        const user = await User.findByPk(id);
        if (!user) throw new AppError('Usuario no encontrado', 404);
        const parsed = userUpdateSchema.parse(data);
        return user.update(parsed);
    },

    changePassword: async (id, { currentPassword, newPassword }) => {
        if (!currentPassword || !newPassword) {
            throw new AppError('Contraseña actual y nueva son requeridas', 400);
        }
        const user = await User.findByPk(id);
        if (!user) throw new AppError('Usuario no encontrado', 404);
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) throw new AppError('Contraseña actual incorrecta', 401);
        const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
        return user.update({ password: hashed });
    },

    deleteUser: async (id) => {
        const user = await User.findByPk(id);
        if (!user) throw new AppError('Usuario no encontrado', 404);
        return user.destroy();
    },
};