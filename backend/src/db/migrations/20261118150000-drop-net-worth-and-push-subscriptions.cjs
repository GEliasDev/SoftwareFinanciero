'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "net_worth_snapshots";');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "push_subscriptions";');
  },

  // Recrea solo la estructura (los datos borrados no se recuperan).
  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('net_worth_snapshots', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      mes: { type: Sequelize.STRING(7), allowNull: false },
      activos: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      pasivos: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      patrimonioNeto: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('net_worth_snapshots', ['userId', 'mes'], { unique: true });
    await queryInterface.createTable('push_subscriptions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      endpoint: { type: Sequelize.TEXT, allowNull: false, unique: true },
      p256dh: { type: Sequelize.TEXT, allowNull: false },
      auth: { type: Sequelize.TEXT, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('push_subscriptions', ['userId']);
  },
};
