import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { CreditCard } from './creditCard.model.js';

export class CreditCardPurchase extends Model {}

CreditCardPurchase.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        descripcion: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        montoTotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        numeroCuotas: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        cuotasPagadas: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        // Valor de cada cuota calculado con interés
        valorCuotaMensual: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        // Total a pagar incluyendo intereses
        totalAPagar: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        // Total de intereses generados
        totalIntereses: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        categoria: {
            type: DataTypes.ENUM(
                'comida', 'transporte', 'salud', 'entretenimiento',
                'hogar', 'tecnologia', 'ropa', 'educacion', 'viajes', 'otros'
            ),
            allowNull: false,
            defaultValue: 'otros',
        },
        fechaCompra: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('activa', 'pagada'),
            allowNull: false,
            defaultValue: 'activa',
        },
        tipo: {
            type: DataTypes.ENUM('compra', 'avance', 'comision', 'cuota_manejo'),
            allowNull: false,
            defaultValue: 'compra',
        },
        creditCardId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        // Solo en registros tipo 'comision': referencia al avance que la generó.
        avanceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
        },
    },
    {
        sequelize, modelName: 'CreditCardPurchase', tableName: 'credit_card_purchases',
        indexes: [{ fields: ['creditCardId'] }, { fields: ['avanceId'] }],
    }
);

CreditCardPurchase.belongsTo(CreditCard, { foreignKey: 'creditCardId' });
CreditCard.hasMany(CreditCardPurchase, { foreignKey: 'creditCardId' });