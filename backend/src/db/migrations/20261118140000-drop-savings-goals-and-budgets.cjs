'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "budget_expenses";');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "budgets";');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "savings_goals";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_savings_goals_status";');
  },

  // Recrea solo la estructura (los datos borrados no se recuperan).
  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('savings_goals', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: Sequelize.STRING, allowNull: false },
      emoji: { type: Sequelize.STRING(10), allowNull: true },
      montoMeta: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      montoAcumulado: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      aporteMensual: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      fechaMeta: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM('activo', 'completado', 'pausado'), allowNull: false, defaultValue: 'activo' },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('savings_goals', ['userId']);

    await queryInterface.createTable('budgets', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      mes: { type: Sequelize.STRING(7), allowNull: false },
      categoria: { type: Sequelize.STRING(80), allowNull: false },
      limite: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      color: { type: Sequelize.STRING(7), defaultValue: '#5B4DF1' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('budgets', ['userId', 'mes']);

    await queryInterface.createTable('budget_expenses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      mes: { type: Sequelize.STRING(7), allowNull: false },
      categoria: { type: Sequelize.STRING(80), allowNull: false },
      monto: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      descripcion: { type: Sequelize.STRING(120), defaultValue: '' },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('budget_expenses', ['userId', 'mes']);
  },
};
