'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('credit_card_purchases', 'subscriptionId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'subscriptions', key: 'id' },
    });
    await queryInterface.addIndex('credit_card_purchases', ['subscriptionId']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('credit_card_purchases', ['subscriptionId']);
    await queryInterface.removeColumn('credit_card_purchases', 'subscriptionId');
  },
};
