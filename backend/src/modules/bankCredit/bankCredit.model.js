import { DataTypes, Model } from 'sequelize';
import sequelize from '../../db/client.js';
import { User } from '../user/user.model.js';

export class BankCredit extends Model {}

BankCredit.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        // Nombre descriptivo del crédito
        nombre: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        // Entidad que otorga el crédito
        entidad: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        // Monto original solicitado
        montoTotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        // Saldo pendiente por pagar
        saldoPendiente: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        // Tasa ingresada por el usuario
        tasaInteres: {
            type: DataTypes.DECIMAL(10, 4),
            allowNull: false,
        },
        // Tipo de tasa ingresada
        tipoTasa: {
            type: DataTypes.ENUM('mensual', 'anual'),
            allowNull: false,
        },
        // Tasa mensual (calculada internamente)
        tasaMensual: {
            type: DataTypes.DECIMAL(10, 6),
            allowNull: false,
        },
        // Número total de cuotas
        numeroCuotas: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        // Cuotas ya pagadas
        cuotasPagadas: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        // Valor de cada cuota mensual (calculado)
        valorCuota: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        // Total de intereses a pagar (calculado)
        totalIntereses: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        // Total a pagar incluyendo intereses (calculado)
        totalAPagar: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        // Cuotas de administración si aplica
        cuotaAdministracion: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
        },
        // Día del mes en que toca pagar (ej: 15)
        diaPago: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        // Fecha en que inició el crédito
        fechaInicio: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        // Fecha estimada de finalización (calculada)
        fechaFin: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        // Tipo de crédito (especialmente útil para Fintechs colombianas)
        tipoCredito: {
            type: DataTypes.ENUM('libre_inversion', 'consumo', 'libranza', 'vehiculo', 'hipotecario', 'fintech', 'otro'),
            allowNull: false,
            defaultValue: 'otro',
        },
        // Número de referencia / obligación de la entidad
        numeroReferencia: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        // Seguro de vida o aval mensual (cobrado por algunas fintechs)
        seguro: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.ENUM('activo', 'pagado', 'en_mora', 'cancelado'),
            allowNull: false,
            defaultValue: 'activo',
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    { sequelize, modelName: 'BankCredit', tableName: 'bank_credits' }
);

BankCredit.belongsTo(User, { foreignKey: 'userId' });