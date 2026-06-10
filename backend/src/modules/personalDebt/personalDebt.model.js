import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class PersonalDebt extends Model {}

PersonalDebt.init(
    {
        id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tipo:           { type: DataTypes.ENUM('deuda', 'gasto'), allowNull: false, defaultValue: 'deuda' },
        nombre:         { type: DataTypes.STRING,  allowNull: false },
        descripcion:    { type: DataTypes.TEXT,    allowNull: true },
        prestamista:    { type: DataTypes.STRING,  allowNull: true },
        montoTotal:     { type: DataTypes.DECIMAL(15, 2), allowNull: true },
        saldoPendiente: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
        montoCuota:     { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        cuotasPagadas:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        numeroCuotas:   { type: DataTypes.INTEGER, allowNull: true },
        diaPago:        { type: DataTypes.INTEGER, allowNull: false },
        status:         { type: DataTypes.ENUM('activo', 'pagado', 'inactivo'), allowNull: false, defaultValue: 'activo' },
        userId:         { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: 'PersonalDebt', tableName: 'personal_debts' }
);

PersonalDebt.belongsTo(User, { foreignKey: 'userId' });
