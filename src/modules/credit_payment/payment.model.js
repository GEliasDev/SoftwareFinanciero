import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';
import { Credit } from '../credit/Credit.model.js';

export class Payment extends Model {}

Payment.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'failed'),
            allowNull: false,
        },
        creditId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    { sequelize, modelName: 'Payment', tableName: 'payments' }
);

Payment.belongsTo(Credit, { foreignKey: 'creditId' });
Payment.belongsTo(User, { foreignKey: 'userId' });
