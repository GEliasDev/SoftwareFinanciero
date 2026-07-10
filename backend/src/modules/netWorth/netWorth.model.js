import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

// Un snapshot congelado por usuario/mes: activos (ahorro acumulado) menos
// pasivos (deuda usada de tarjetas + saldo de créditos + deudas personales).
// Se llena mensualmente vía netWorthSnapshotJob; el mes en curso (aún sin
// snapshot) se calcula en vivo — ver NetWorthService.getHistory.
export class NetWorthSnapshot extends Model {}

NetWorthSnapshot.init(
    {
        id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId:         { type: DataTypes.INTEGER, allowNull: false },
        mes:            { type: DataTypes.STRING(7), allowNull: false }, // 'YYYY-MM'
        activos:        { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        pasivos:        { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        patrimonioNeto: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    },
    {
        sequelize, modelName: 'NetWorthSnapshot', tableName: 'net_worth_snapshots',
        indexes: [{ fields: ['userId', 'mes'], unique: true }],
    }
);

NetWorthSnapshot.belongsTo(User, { foreignKey: 'userId' });
