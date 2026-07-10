import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class ActivityLog extends Model {}

ActivityLog.init(
    {
        id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId:     { type: DataTypes.INTEGER, allowNull: false },
        action:     { type: DataTypes.STRING,  allowNull: false },       // 'created' | 'updated' | 'deleted' | 'paid'
        entityType: { type: DataTypes.STRING,  allowNull: false },       // 'credit_card' | 'bank_credit' | ...
        entityName: { type: DataTypes.STRING,  allowNull: false },       // nombre legible del recurso
        meta:       { type: DataTypes.JSONB,   allowNull: true },        // datos extra (monto, etc.)
    },
    {
        sequelize, modelName: 'ActivityLog', tableName: 'activity_logs', timestamps: true, updatedAt: false,
        // Postgres no indexa el lado "muchos" de una FK automáticamente;
        // getRecent() filtra por userId y ordena por createdAt en cada carga.
        indexes: [{ fields: ['userId', 'createdAt'] }],
    }
);

ActivityLog.belongsTo(User, { foreignKey: 'userId' });
