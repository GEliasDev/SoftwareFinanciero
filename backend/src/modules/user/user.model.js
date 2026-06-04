import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';

export class User extends Model {}

User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        primerNombre: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        segundoNombre: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        primerApellido: {
            type: DataTypes.STRING,
        },
        segundoApellido: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        telefono: {
            type: DataTypes.STRING,
            unique: false,
        },
        pais: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        ciudad: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
        },
        resetToken: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        resetTokenExpiry: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    { sequelize, modelName: 'User', tableName: 'users' }
);
