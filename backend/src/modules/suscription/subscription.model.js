import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class Subscription extends Model {}

Subscription.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        nombre: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        descripcion: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        monto: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        // Equivalente mensual (calculado automáticamente)
        montoMensual: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        moneda: {
            type: DataTypes.ENUM('COP', 'USD', 'EUR'),
            allowNull: false,
            defaultValue: 'COP',
        },
        frecuencia: {
            type: DataTypes.ENUM('mensual', 'anual'),
            allowNull: false,
        },
        // Día del mes en que se hace el cobro
        diaCobro: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        fechaInicio: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        // Fecha en que vence o se cancela (opcional)
        fechaFin: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('activa', 'cancelada', 'pausada'),
            allowNull: false,
            defaultValue: 'activa',
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    { sequelize, modelName: 'Subscription', tableName: 'subscriptions', indexes: [{ fields: ['userId'] }] }
);

Subscription.belongsTo(User, { foreignKey: 'userId' });