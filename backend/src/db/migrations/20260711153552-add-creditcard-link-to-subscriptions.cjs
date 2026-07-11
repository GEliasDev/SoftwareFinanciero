'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subscriptions', 'creditCardId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'credit_cards', key: 'id' },
    });
    await queryInterface.addIndex('subscriptions', ['creditCardId']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('subscriptions', ['creditCardId']);
    await queryInterface.removeColumn('subscriptions', 'creditCardId');
  },
};
