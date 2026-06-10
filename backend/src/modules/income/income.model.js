import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class Income extends Model {}

Income.init(
    {
        id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre:   { type: DataTypes.STRING,  allowNull: false },
        monto:    { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        diaCobro: { type: DataTypes.INTEGER, allowNull: false },
        status:   { type: DataTypes.ENUM('activo', 'inactivo'), allowNull: false, defaultValue: 'activo' },
        userId:   { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: 'Income', tableName: 'incomes' }
);

Income.belongsTo(User, { foreignKey: 'userId' });
