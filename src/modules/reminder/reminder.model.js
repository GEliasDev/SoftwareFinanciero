import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class Reminder extends Model {}

Reminder.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        // Tipo de deuda al que pertenece el recordatorio
        debtType: {
            type: DataTypes.ENUM('bank_credit', 'credit_card', 'subscription'),
            allowNull: false,
        },
        // ID de la deuda referenciada
        debtId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        // Nombre descriptivo para mostrar en la notificación
        nombre: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        // Días de anticipación personalizados por el usuario (default: 3)
        diasAnticipacion: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 3,
        },
        // Próxima fecha de pago calculada
        proximaFechaPago: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        // Fecha en que debe dispararse el recordatorio
        fechaRecordatorio: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        // Si el recordatorio ya fue enviado en este ciclo
        enviado: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        status: {
            type: DataTypes.ENUM('activo', 'pausado', 'cancelado'),
            allowNull: false,
            defaultValue: 'activo',
        },
        // Suscripción Web Push del navegador del usuario
        pushSubscription: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    { sequelize, modelName: 'Reminder', tableName: 'reminders' }
);

Reminder.belongsTo(User, { foreignKey: 'userId' });