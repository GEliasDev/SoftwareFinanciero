'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('gmail_connections', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      googleEmail: { type: Sequelize.STRING, allowNull: false },
      refreshToken: { type: Sequelize.TEXT, allowNull: false },
      lastSyncAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('gmail_connections', ['userId'], { unique: true });

    await queryInterface.createTable('card_inbox_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      creditCardId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'credit_cards', key: 'id' } },
      fuente: { type: Sequelize.STRING(20), allowNull: false },
      tipo: { type: Sequelize.ENUM('compra', 'avance', 'pago'), allowNull: false },
      monto: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      ultimos4: { type: Sequelize.STRING(4), allowNull: true },
      comercio: { type: Sequelize.STRING, allowNull: true },
      fechaMovimiento: { type: Sequelize.DATEONLY, allowNull: false },
      horaMovimiento: { type: Sequelize.STRING(8), allowNull: true },
      numeroCuotas: { type: Sequelize.INTEGER, allowNull: true },
      detalle: { type: Sequelize.JSONB, allowNull: true },
      huella: { type: Sequelize.STRING, allowNull: false },
      gmailMessageId: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.ENUM('pendiente', 'aprobado', 'descartado'), allowNull: false, defaultValue: 'pendiente' },
      purchaseId: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('card_inbox_items', ['userId', 'huella'], { unique: true });
    await queryInterface.addIndex('card_inbox_items', ['userId', 'status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('card_inbox_items');
    await queryInterface.dropTable('gmail_connections');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_card_inbox_items_tipo";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_card_inbox_items_status";');
  },
};
