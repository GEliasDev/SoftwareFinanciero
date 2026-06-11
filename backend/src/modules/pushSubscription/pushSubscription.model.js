import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class PushSubscription extends Model {}

PushSubscription.init(
    {
        id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId:       { type: DataTypes.INTEGER, allowNull: false },
        endpoint:     { type: DataTypes.TEXT,    allowNull: false, unique: true },
        p256dh:       { type: DataTypes.TEXT,    allowNull: false },
        auth:         { type: DataTypes.TEXT,    allowNull: false },
    },
    { sequelize, modelName: 'PushSubscription', tableName: 'push_subscriptions' }
);

PushSubscription.belongsTo(User, { foreignKey: 'userId' });
