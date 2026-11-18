'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('credit_cards', 'ultimos4Fisica', { type: Sequelize.STRING(4), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('credit_cards', 'ultimos4Fisica');
  },
};
