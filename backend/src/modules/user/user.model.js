import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';

export class User extends Model {}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        primerNombre: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        segundoNombre: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        primerApellido: {
            type: DataTypes.STRING,
        },
        segundoApellido: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        telefono: {
            type: DataTypes.STRING,
            unique: false,
        },
        isAdmin: { 
            type: DataTypes.BOOLEAN, 
            allowNull: false, 
            defaultValue: false 
        },
        pais: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        ciudad: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
        },
        resetToken: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        resetTokenExpiry: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        emailDigest: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        // Refresh token de sesión (un solo slot por usuario — un login nuevo
        // invalida el anterior). Evita que el JWT de 1h expire en silencio a
        // medio formulario; ver UserService.login/refreshAccessToken.
        refreshToken: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        refreshTokenExpiry: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        // 2FA opcional (TOTP, ej. Google Authenticator). El secreto se guarda
        // desde /2fa/setup pero `twoFactorEnabled` solo pasa a true tras
        // verificar un código real en /2fa/verify (evita quedar "medio
        // activado" si el usuario nunca completa el escaneo del QR).
        twoFactorSecret: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        twoFactorEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        sequelize, modelName: 'User', tableName: 'users',
        // email ya es unique (índice automático); resetToken/refreshToken se
        // buscan por su valor y no tenían índice propio.
        indexes: [{ fields: ['resetToken'] }, { fields: ['refreshToken'] }],
    }
);
