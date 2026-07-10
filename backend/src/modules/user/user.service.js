import crypto from 'crypto';
import jwt from 'jsonwebtoken';
// otplib v13 es funcional/async (no el objeto `authenticator` de v11/v12 que
// asumen la mayoría de tutoriales): generateSecret/generate/verify son
// funciones sueltas y verify() devuelve { valid } en vez de un booleano.
import { generateSecret as generateTotpSecret, verify as verifyTotp, generateURI as totpURI } from 'otplib';
import QRCode from 'qrcode';
import { User } from './user.model.js';
import { userCreateSchema, userUpdateSchema } from './user.schema.js';
import { generateToken, generateRefreshToken, REFRESH_TOKEN_TTL_MS } from './utils/generateToken.js';
import logger from '../../utils/logger.js';
import bcrypt from 'bcrypt';
import { AppError } from '../../middlewares/appError.js';
import { CreditCard } from '../creditCard/creditCard.model.js';
import { CreditCardPurchase } from '../creditCard/creditCardPurchase.model.js';
import { BankCredit } from '../bankCredit/bankCredit.model.js';
import { Subscription } from '../suscription/subscription.model.js';
import { Income } from '../income/income.model.js';
import { PersonalDebt } from '../personalDebt/personalDebt.model.js';
import { SavingsGoal } from '../savingsGoal/savingsGoal.model.js';
import { Reminder } from '../reminder/reminder.model.js';
import { Budget, BudgetExpense } from '../budget/budget.model.js';
import { ActivityLog } from '../activityLog/activityLog.model.js';
import { NetWorthSnapshot } from '../netWorth/netWorth.model.js';

const SALT_ROUNDS = 10;
const TWO_FACTOR_PENDING_TTL = '5m';

const USER_PUBLIC_ATTRIBUTES = [
    'id', 'primerNombre', 'segundoNombre',
    'primerApellido', 'segundoApellido',
    'email', 'telefono', 'pais', 'ciudad', 'emailDigest', 'twoFactorEnabled',
];

// Emite el par de tokens de sesión normal (usado tanto por login directo
// como por el segundo paso del login con 2FA).
const issueSessionTokens = async (user) => {
    const token = generateToken(user);
    const refreshToken = generateRefreshToken();
    await user.update({
        refreshToken,
        refreshTokenExpiry: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    const { password: _, refreshToken: __, refreshTokenExpiry: ___, twoFactorSecret: ____, ...userData } = user.toJSON();
    return { user: userData, token, refreshToken };
};

export const UserService = {
    login: async (email, password) => {
        if (!email || !password) {
            throw new AppError('Email y contraseña son requeridos', 400);
        }

        const user = await User.findOne({ where: { email } });
        const isValid = user ? await bcrypt.compare(password, user.password) : false;
        if (!user || !isValid) {
            logger.warn(`Failed login attempt for email: ${email}`);
            throw new AppError('Credenciales inválidas', 401);
        }

        if (user.twoFactorEnabled) {
            // No se emite sesión todavía: un tempToken de 5 min solo sirve
            // para /users/2fa/login-verify, no da acceso a nada más.
            const tempToken = jwt.sign({ id: user.id, purpose: '2fa-pending' }, process.env.JWT_SECRET, { expiresIn: TWO_FACTOR_PENDING_TTL });
            logger.info(`User ${user.id} password OK, awaiting 2FA code`);
            return { requiresTwoFactor: true, tempToken };
        }

        logger.info(`User ${user.id} logged in successfully`);
        return issueSessionTokens(user);
    },

    // Segundo paso del login cuando el usuario tiene 2FA activo.
    verifyTwoFactorLogin: async (tempToken, code) => {
        if (!tempToken || !code) throw new AppError('Token y código son requeridos', 400);
        let payload;
        try {
            payload = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch {
            throw new AppError('El código expiró, inicia sesión de nuevo', 401);
        }
        if (payload.purpose !== '2fa-pending') throw new AppError('Token inválido', 401);

        const user = await User.findByPk(payload.id);
        if (!user || !user.twoFactorEnabled) throw new AppError('2FA no habilitado para este usuario', 400);
        const result = await verifyTotp({ token: String(code), secret: user.twoFactorSecret });
        if (!result.valid) throw new AppError('Código incorrecto', 401);
        logger.info(`User ${user.id} completed 2FA login`);
        return issueSessionTokens(user);
    },

    // Genera un secreto nuevo y su QR — twoFactorEnabled sigue en false hasta
    // que /2fa/confirm reciba un código válido (evita quedar "a medias" si
    // el usuario nunca termina de escanear el QR).
    setupTwoFactor: async (userId) => {
        const user = await User.findByPk(userId);
        if (!user) throw new AppError('Usuario no encontrado', 404);
        const secret = generateTotpSecret();
        await user.update({ twoFactorSecret: secret, twoFactorEnabled: false });
        const otpauth = totpURI({ strategy: 'totp', issuer: 'Debti', label: user.email, secret });
        const qrDataUrl = await QRCode.toDataURL(otpauth);
        return { qrDataUrl, secret };
    },

    confirmTwoFactor: async (userId, code) => {
        const user = await User.findByPk(userId);
        if (!user || !user.twoFactorSecret) throw new AppError('Primero genera el código QR', 400);
        const result = await verifyTotp({ token: String(code), secret: user.twoFactorSecret });
        if (!result.valid) throw new AppError('Código incorrecto', 401);
        await user.update({ twoFactorEnabled: true });
        logger.info(`User ${userId} enabled 2FA`);
        return { message: '2FA activado correctamente' };
    },

    disableTwoFactor: async (userId, password) => {
        const user = await User.findByPk(userId);
        if (!user) throw new AppError('Usuario no encontrado', 404);
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new AppError('Contraseña incorrecta', 401);
        await user.update({ twoFactorEnabled: false, twoFactorSecret: null });
        logger.info(`User ${userId} disabled 2FA`);
        return { message: '2FA desactivado' };
    },

    // Renueva el access token (1h) usando el refresh token (30 días) guardado
    // en el login. Rota el refresh token en cada uso (si alguien lo roba y
    // lo usa, el legítimo deja de servir en su próximo intento — señal de
    // compromiso en vez de un token robado válido indefinidamente).
    refreshAccessToken: async (refreshToken) => {
        if (!refreshToken) throw new AppError('Refresh token requerido', 401);
        const user = await User.findOne({ where: { refreshToken } });
        if (!user) throw new AppError('Sesión inválida, inicia sesión de nuevo', 401);
        if (!user.refreshTokenExpiry || new Date() > user.refreshTokenExpiry) {
            throw new AppError('Sesión expirada, inicia sesión de nuevo', 401);
        }

        const newRefreshToken = generateRefreshToken();
        await user.update({
            refreshToken: newRefreshToken,
            refreshTokenExpiry: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        });

        return { token: generateToken(user), refreshToken: newRefreshToken };
    },

    createUser: async (data) => {
        const parsed = userCreateSchema.parse(data);
        const hashedPassword = await bcrypt.hash(parsed.password, SALT_ROUNDS);
        const user = await User.create({ ...parsed, password: hashedPassword });
        const { password: _, ...userData } = user.toJSON();
        logger.info(`User ${user.id} created`);
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

    // Exporta TODOS los datos del usuario en un solo JSON (derecho de
    // portabilidad de datos). Siempre usa el id de la sesión (req.user.id),
    // nunca un id recibido en la URL — evita que alguien pida el export de
    // otra cuenta cambiando el parámetro.
    exportAllData: async (userId) => {
        const user = await User.findByPk(userId, { attributes: USER_PUBLIC_ATTRIBUTES });
        if (!user) throw new AppError('Usuario no encontrado', 404);

        const [
            creditCards, bankCredits, subscriptions, incomes, personalDebts,
            savingsGoals, reminders, budgets, budgetExpenses, activityLog, netWorthHistory,
        ] = await Promise.all([
            CreditCard.findAll({ where: { userId }, include: [CreditCardPurchase] }),
            BankCredit.findAll({ where: { userId } }),
            Subscription.findAll({ where: { userId } }),
            Income.findAll({ where: { userId } }),
            PersonalDebt.findAll({ where: { userId } }),
            SavingsGoal.findAll({ where: { userId } }),
            Reminder.findAll({ where: { userId } }),
            Budget.findAll({ where: { userId } }),
            BudgetExpense.findAll({ where: { userId } }),
            ActivityLog.findAll({ where: { userId }, order: [['createdAt', 'DESC']] }),
            NetWorthSnapshot.findAll({ where: { userId }, order: [['mes', 'ASC']] }),
        ]);

        logger.info(`User ${userId} exported their data`);
        return {
            exportadoEl: new Date().toISOString(),
            perfil: user,
            tarjetasCredito: creditCards,
            creditosBancarios: bankCredits,
            suscripciones: subscriptions,
            ingresos: incomes,
            deudasPersonales: personalDebts,
            metasAhorro: savingsGoals,
            recordatorios: reminders,
            presupuesto: { categorias: budgets, gastos: budgetExpenses },
            historialActividad: activityLog,
            patrimonioNeto: netWorthHistory,
        };
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
        await user.update({ password: hashed });
        logger.info(`User ${id} changed password`);
        return user;
    },

    deleteUser: async (id) => {
        const user = await User.findByPk(id);
        if (!user) throw new AppError('Usuario no encontrado', 404);
        await user.destroy();
        logger.info(`User ${id} deleted`);
        return;
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

        console.log(`[ForgotPassword] Token para ${email}: ${token}`);
        logger.info(`Password reset requested for email ${email}`);
        return {
            message: 'Si ese correo está registrado, recibirás instrucciones.',
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