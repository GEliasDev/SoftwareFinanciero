import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

// Conexión OAuth del usuario con Gmail (scope gmail.readonly). El refresh token
// se guarda CIFRADO (AES-256-GCM, ver gmailToken.js) — nunca en texto plano.
// Un registro por usuario; desconectar = borrar la fila.
export class GmailConnection extends Model {}

GmailConnection.init(
    {
        id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId:       { type: DataTypes.INTEGER, allowNull: false },
        googleEmail:  { type: DataTypes.STRING, allowNull: false },
        refreshToken: { type: DataTypes.TEXT, allowNull: false },
        // Último correo procesado: la siguiente lectura pide solo lo posterior.
        lastSyncAt:   { type: DataTypes.DATE, allowNull: true },
    },
    {
        sequelize, modelName: 'GmailConnection', tableName: 'gmail_connections',
        indexes: [{ fields: ['userId'], unique: true }],
    }
);

GmailConnection.belongsTo(User, { foreignKey: 'userId' });
