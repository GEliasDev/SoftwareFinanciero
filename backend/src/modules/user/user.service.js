import crypto from 'crypto';
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

    /**
     * Genera un token de restablecimiento de 1 hora y lo almacena en el usuario.
     * Por seguridad la respuesta es idéntica si el email existe o no.
     * En producción, sustituir el return del token por envío de correo.
     */
    forgotPassword: async (email) => {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // No revelar si el email existe o no
            return { message: 'Si ese correo está registrado, recibirás instrucciones.' };
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        await user.update({ resetToken: token, resetTokenExpiry: expiry });

        // TODO producción: enviar token por correo en lugar de devolverlo
        console.log(`[ForgotPassword] Token para ${email}: ${token}`);

        return {
            message: 'Si ese correo está registrado, recibirás instrucciones.',
            // Se expone en desarrollo para que funcione sin servidor de correo.
            // Eliminar esta línea al configurar envío de email.
            resetToken: token,
        };
    },

    resetPasswordByToken: async (token, newPassword) => {
        if (!token || !newPassword) {
            throw new AppError('Token y nueva contraseña son requeridos', 400);
        }
        if (newPassword.length < 8) {
            throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
        }

        const user = await User.findOne({ where: { resetToken: token } });
        if (!user) throw new AppError('Token inválido o ya utilizado', 400);
        if (new Date() > user.resetTokenExpiry) {
            throw new AppError('El enlace de restablecimiento ha expirado', 400);
        }

        const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await user.update({ password: hashed, resetToken: null, resetTokenExpiry: null });

        return { message: 'Contraseña restablecida correctamente' };
    },
};