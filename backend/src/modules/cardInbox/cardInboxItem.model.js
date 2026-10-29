import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';
import { CreditCard } from '../creditCard/creditCard.model.js';

// Movimiento detectado en un correo de alerta, a la espera de que el usuario lo
// apruebe (se convierte en CreditCardPurchase), lo edite o lo descarte.
// `huella` es única por usuario: el mismo correo leído dos veces no duplica.
export class CardInboxItem extends Model {}

CardInboxItem.init(
    {
        id:                 { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId:             { type: DataTypes.INTEGER, allowNull: false },
        // Tarjeta resuelta por últimos 4 dígitos; null si no se pudo asignar (ej. el correo de un avance).
        creditCardId:       { type: DataTypes.INTEGER, allowNull: true },
        fuente:             { type: DataTypes.STRING(20), allowNull: false },
        tipo:               { type: DataTypes.ENUM('compra', 'avance', 'pago'), allowNull: false },
        monto:              { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        ultimos4:           { type: DataTypes.STRING(4), allowNull: true },
        comercio:           { type: DataTypes.STRING, allowNull: true },
        fechaMovimiento:    { type: DataTypes.DATEONLY, allowNull: false },
        horaMovimiento:     { type: DataTypes.STRING(8), allowNull: true },
        numeroCuotas:       { type: DataTypes.INTEGER, allowNull: true },
        // Resto de campos del parser (autorización, tasas, costo transaccional, método de pago…).
        detalle:            { type: DataTypes.JSONB, allowNull: true },
        huella:             { type: DataTypes.STRING, allowNull: false },
        gmailMessageId:     { type: DataTypes.STRING, allowNull: true },
        status:             { type: DataTypes.ENUM('pendiente', 'aprobado', 'descartado'), allowNull: false, defaultValue: 'pendiente' },
        // Compra creada al aprobar (null mientras esté pendiente o si es un pago informativo).
        purchaseId:         { type: DataTypes.INTEGER, allowNull: true },
    },
    {
        sequelize, modelName: 'CardInboxItem', tableName: 'card_inbox_items',
        indexes: [
            { fields: ['userId', 'huella'], unique: true },
            { fields: ['userId', 'status'] },
        ],
    }
);

CardInboxItem.belongsTo(User, { foreignKey: 'userId' });
CardInboxItem.belongsTo(CreditCard, { foreignKey: 'creditCardId' });
