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
        montoCuota:     { type: DataTypes.DECIMAL(15, 2), allowNull: true },
        cuotasPagadas:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        numeroCuotas:   { type: DataTypes.INTEGER, allowNull: true },
        diaPago:        { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        status:         { type: DataTypes.ENUM('activo', 'pagado', 'inactivo'), allowNull: false, defaultValue: 'activo' },
        // Solo tiene sentido para tipo 'gasto' (recurrente) — permite que
        // Presupuesto lo sume junto con las compras de tarjeta por categoría.
        // 'deuda' (préstamo con saldo) no es un gasto discrecional del mes.
        categoria:      { type: DataTypes.STRING(30), allowNull: true },
        userId:         { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: 'PersonalDebt', tableName: 'personal_debts', indexes: [{ fields: ['userId'] }] }
);

PersonalDebt.belongsTo(User, { foreignKey: 'userId' });
