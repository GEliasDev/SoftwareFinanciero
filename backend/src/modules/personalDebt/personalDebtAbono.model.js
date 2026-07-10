import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { PersonalDebt } from './personalDebt.model.js';

export class PersonalDebtAbono extends Model {}

PersonalDebtAbono.init(
    {
        id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        personalDebtId: { type: DataTypes.INTEGER, allowNull: false },
        userId:         { type: DataTypes.INTEGER, allowNull: false },
        monto:          { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        saldoAntes:     { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        saldoDespues:   { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        fecha:          { type: DataTypes.DATEONLY, allowNull: false },
    },
    {
        sequelize, modelName: 'PersonalDebtAbono', tableName: 'personal_debt_abonos', updatedAt: false,
        indexes: [{ fields: ['personalDebtId'] }],
    }
);

PersonalDebtAbono.belongsTo(PersonalDebt, { foreignKey: 'personalDebtId', onDelete: 'CASCADE' });
PersonalDebt.hasMany(PersonalDebtAbono, { foreignKey: 'personalDebtId', as: 'abonos', onDelete: 'CASCADE' });
