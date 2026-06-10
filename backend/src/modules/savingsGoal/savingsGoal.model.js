import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class SavingsGoal extends Model {}

SavingsGoal.init(
    {
        id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre:         { type: DataTypes.STRING,  allowNull: false },
        emoji:          { type: DataTypes.STRING(10), allowNull: true },
        montoMeta:      { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        montoAcumulado: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        aporteMensual:  { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        fechaMeta:      { type: DataTypes.DATEONLY, allowNull: true },
        status:         { type: DataTypes.ENUM('activo', 'completado', 'pausado'), allowNull: false, defaultValue: 'activo' },
        userId:         { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: 'SavingsGoal', tableName: 'savings_goals' }
);

SavingsGoal.belongsTo(User, { foreignKey: 'userId' });
