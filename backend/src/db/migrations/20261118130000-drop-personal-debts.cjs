'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "personal_debt_abonos";');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "personal_debts";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_personal_debts_tipo";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_personal_debts_status";');
  },

  // Recrea solo la estructura (los datos borrados no se recuperan).
  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('personal_debts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tipo: { type: Sequelize.ENUM('deuda', 'gasto'), allowNull: false, defaultValue: 'deuda' },
      nombre: { type: Sequelize.STRING, allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      prestamista: { type: Sequelize.STRING, allowNull: true },
      montoTotal: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      saldoPendiente: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      montoCuota: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      cuotasPagadas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      numeroCuotas: { type: Sequelize.INTEGER, allowNull: true },
      diaPago: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      status: { type: Sequelize.ENUM('activo', 'pagado', 'inactivo'), allowNull: false, defaultValue: 'activo' },
      categoria: { type: Sequelize.STRING(30), allowNull: true },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('personal_debts', ['userId']);
  },
};
