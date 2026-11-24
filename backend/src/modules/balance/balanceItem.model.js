import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

// Fila del balance mensual (plantilla tipo Excel): un ingreso o un pago de un mes.
// `origen` + `origenId` enlazan la fila con una tarjeta, crédito, suscripción o
// ingreso de Debti; `monto` NULL = automático (el frontend lo calcula para el mes).
export class BalanceItem extends Model {}

BalanceItem.init(
    {
        id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId:      { type: DataTypes.INTEGER, allowNull: false },
        anio:        { type: DataTypes.INTEGER, allowNull: false },
        mes:         { type: DataTypes.INTEGER, allowNull: false },
        tipo:        { type: DataTypes.ENUM('ingreso', 'gasto'), allowNull: false },
        descripcion: { type: DataTypes.STRING(100), allowNull: false },
        categoria:   { type: DataTypes.STRING(40), allowNull: false },
        monto:       { type: DataTypes.DECIMAL(15, 2), allowNull: true },
        estado:      { type: DataTypes.ENUM('pendiente', 'comprometido', 'pagado', 'recibido'), allowNull: false, defaultValue: 'pendiente' },
        origen:      { type: DataTypes.ENUM('manual', 'tarjeta', 'credito', 'suscripcion', 'ingreso'), allowNull: false, defaultValue: 'manual' },
        origenId:    { type: DataTypes.INTEGER, allowNull: true },
    },
    { sequelize, modelName: 'BalanceItem', tableName: 'balance_items', indexes: [{ fields: ['userId', 'anio', 'mes'] }] }
);

BalanceItem.belongsTo(User, { foreignKey: 'userId' });
