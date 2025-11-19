import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class Credit extends Model {}

Credit.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        // Tipo de Crédito
        typeOfCredit: {
            type: DataTypes.ENUM('credit card', 'fintech', 'consumption', 'mortgage', 'vehicular'),
            allowNull: false,
        },
        // Entidad emisora
        entityName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        // Cantidad Solicitada
        requestedAmount: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        // Plazo en meses
        term: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        // Interes Anual
        annualInterestRate: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        // Interes Mensual
        monthlyInterestRate: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        managementFees: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        // Periodo de Pago
        paymentPeriod: {
            type: DataTypes.ENUM('Diario', 'Quincenal', 'Mensual'),
            allowNull: false,
        },
        // Fecha de Inicio del Credito
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        // Fecha de Finalización del Crédito
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        // Estado del Crédito
        status: {
            type: DataTypes.ENUM('Activo', 'Pagado', 'Vencido', 'Cancelado'),
            allowNull: true,
        },
        // Cuota mensual (Hay que calcularla)
        monthlyPayment: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        // Total de intereses a pagar (Hay que calcularla)
        totalInterest: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        // Monto total a pagar (Hay que calcularlo)
        totalToPay: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    { sequelize, modelName: 'Credit', tableName: 'credits' }
);

Credit.belongsTo(User, { foreignKey: 'userId' });
