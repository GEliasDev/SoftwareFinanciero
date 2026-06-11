import { DataTypes } from 'sequelize';
import sequelize from '../../db/client.js';

// Budget: limite por categoria por mes (YYYY-MM)
export const Budget = sequelize.define('Budget', {
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId:    { type: DataTypes.INTEGER, allowNull: false },
    mes:       { type: DataTypes.STRING(7), allowNull: false },  // "2026-06"
    categoria: { type: DataTypes.STRING(80), allowNull: false },
    limite:    { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    color:     { type: DataTypes.STRING(7), defaultValue: '#5B4DF1' },
}, { tableName: 'budgets', timestamps: true, updatedAt: 'updatedAt' });

// BudgetExpense: gasto registrado manualmente contra una categoria del mes
export const BudgetExpense = sequelize.define('BudgetExpense', {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId:     { type: DataTypes.INTEGER, allowNull: false },
    mes:        { type: DataTypes.STRING(7), allowNull: false },
    categoria:  { type: DataTypes.STRING(80), allowNull: false },
    monto:      { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    descripcion:{ type: DataTypes.STRING(120), defaultValue: '' },
    fecha:      { type: DataTypes.DATEONLY, allowNull: false },
}, { tableName: 'budget_expenses', timestamps: true, updatedAt: false });
