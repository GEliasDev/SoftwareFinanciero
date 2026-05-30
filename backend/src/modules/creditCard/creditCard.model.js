import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class CreditCard extends Model {}

CreditCard.init(
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
        entidad: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        cupoTotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        cupoDisponible: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        tasaInteresMensual: {
            type: DataTypes.DECIMAL(10, 4),
            allowNull: false,
        },
        // Día del mes en que se hace el corte
        fechaCorte: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        // Día del mes en que toca pagar
        fechaPago: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        ultimos4: {
            type: DataTypes.STRING(4),
            allowNull: true,
        },
        color: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: 'blue',
        },
        status: {
            type: DataTypes.ENUM('activa', 'bloqueada', 'cancelada'),
            allowNull: false,
            defaultValue: 'activa',
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    { sequelize, modelName: 'CreditCard', tableName: 'credit_cards' }
);

CreditCard.belongsTo(User, { foreignKey: 'userId' });